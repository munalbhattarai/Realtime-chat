import uuid

from channels.db import database_sync_to_async
from channels.generic.websocket import (
    AsyncJsonWebsocketConsumer,
)

from apps.chats.events import conversation_group_name
from apps.chats.models import (
    ConversationMember,
)
from apps.chats.presence import (
    add_connection,
    is_user_online,
    remove_connection,
)
from apps.messages.models import Message
from apps.messages.services import (
    create_message,
    mark_message_as_read,
)


class ChatConsumer(
    AsyncJsonWebsocketConsumer
):
    async def connect(self):
        self.user = self.scope.get("user")

        if (
            not self.user
            or not self.user.is_authenticated
        ):
            await self.accept()
            await self.close(code=4001)
            return

        self.conversation_id = (
            self.scope["url_route"]["kwargs"][
                "conversation_id"
            ]
        )

        if not await self.is_conversation_member():
            await self.accept()
            await self.close(code=4003)
            return

        await self.accept()

        self.room_group_name = (
            conversation_group_name(
                self.conversation_id
            )
        )

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        # Join room groups for all conversations the user is a member of
        # so real-time updates (unread counts/badges) work across all chats
        await self.join_all_user_conversation_groups()

        # Mark all messages as read for this user.
        await self.mark_all_conversation_messages_read()

        # Track this connection.
        connection_count = (
            await self.add_user_connection()
        )

        # Send users already online.
        await self.send_existing_online_users()

        # Only broadcast online on first connection.
        if connection_count == 1:
            await self.broadcast_presence(True)

        await self.send_json(
            {
                "type": "connection",
                "message": (
                    "Connected to conversation."
                ),
                "conversation_id": str(
                    self.conversation_id
                ),
            }
        )

    async def disconnect(self, close_code):
        if not hasattr(
            self,
            "room_group_name",
        ):
            return

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

        await self.leave_all_user_conversation_groups()

        connection_count = (
            await self.remove_user_connection()
        )

        # Only broadcast offline when the
        # user's last connection closes.
        if connection_count == 0:
            await self.broadcast_presence(False)

    async def receive_json(
        self,
        content,
        **kwargs,
    ):
        message_type = content.get("type")

        if message_type == "chat_message":
            await self.handle_chat_message(
                content
            )
            return

        if message_type == "typing.start":
            await self.handle_typing(True)
            return

        if message_type == "typing.stop":
            await self.handle_typing(False)
            return

        if message_type == "message.read":
            await self.handle_message_read(
                content
            )
            return

        await self.send_json(
            {
                "type": "error",
                "message": (
                    "Unsupported message type."
                ),
            }
        )

    async def handle_chat_message(
        self,
        content,
    ):
        message_content = content.get(
            "content",
            "",
        ).strip()
        image_url = content.get(
            "image_url",
            None,
        )

        if not message_content and not image_url:
            await self.send_json(
                {
                    "type": "error",
                    "message": (
                        "Message must contain text content "
                        "or an image."
                    ),
                }
            )
            return

        try:
            message = await self.create_message(
                content=message_content,
                image_url=image_url,
            )
        except ValueError as exc:
            await self.send_json(
                {
                    "type": "error",
                    "message": str(exc),
                }
            )
            return
        except Exception as exc:
            await self.send_json(
                {
                    "type": "error",
                    "message": f"Failed to save message: {str(exc)}",
                }
            )
            return

        # Send instant confirmation directly to sender
        await self.send_json(
            {
                "type": "message.created",
                "message": {
                    "id": str(message.id),
                    "conversation_id": str(self.conversation_id),
                    "sender_id": self.user.id,
                    "sender_username": self.user.username,
                    "content": message.content,
                    "image_url": message.image_url,
                    "created_at": message.created_at.isoformat(),
                },
            }
        )

        try:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "message.created",
                    "message_id": str(message.id),
                    "conversation_id": str(
                        self.conversation_id
                    ),
                    "sender_id": self.user.id,
                    "sender_username": (
                        self.user.username
                    ),
                    "content": message.content,
                    "image_url": message.image_url,
                    "created_at": (
                        message.created_at.isoformat()
                    ),
                },
            )
        except Exception as err:
            print(f"Group broadcast warning: {err}")

    async def handle_typing(
        self,
        is_typing,
    ):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing.update",
                "user_id": self.user.id,
                "username": self.user.username,
                "is_typing": is_typing,
            },
        )

    async def handle_message_read(
        self,
        content,
    ):
        message_id = content.get(
            "message_id"
        )

        if not message_id:
            await self.send_json(
                {
                    "type": "error",
                    "message": (
                        "message_id is required."
                    ),
                }
            )
            return

        try:
            result = (
                await self.mark_message_read(
                    message_id
                )
            )
        except PermissionError:
            await self.send_json(
                {
                    "type": "error",
                    "message": (
                        "You are not a member "
                        "of this conversation."
                    ),
                }
            )
            return

        if result is None:
            await self.send_json(
                {
                    "type": "error",
                    "message": "Message not found.",
                }
            )
            return

        message, receipt, _created = result

        if receipt is None:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "message.read",
                "message_id": str(message.id),
                "conversation_id": str(
                    message.conversation_id
                ),
                "user_id": self.user.id,
                "username": self.user.username,
                "read_at": (
                    receipt.read_at.isoformat()
                ),
            },
        )

    async def message_created(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "message.created",
                "message": {
                    "id": event[
                        "message_id"
                    ],
                    "conversation_id": event[
                        "conversation_id"
                    ],
                    "sender_id": event[
                        "sender_id"
                    ],
                    "sender_username": event[
                        "sender_username"
                    ],
                    "content": event[
                        "content"
                    ],
                    "image_url": event.get(
                        "image_url"
                    ),
                    "created_at": event[
                        "created_at"
                    ],
                },
            }
        )

    async def message_updated(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "message.updated",
                "message": {
                    "id": event[
                        "message_id"
                    ],
                    "conversation_id": event[
                        "conversation_id"
                    ],
                    "content": event[
                        "content"
                    ],
                    "updated_at": event[
                        "updated_at"
                    ],
                },
            }
        )

    async def message_deleted(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "message.deleted",
                "message": {
                    "id": event[
                        "message_id"
                    ],
                    "conversation_id": event[
                        "conversation_id"
                    ],
                },
            }
        )

    async def profile_update(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "profile.update",
                "user_id": event["user_id"],
                "first_name": event["first_name"],
                "last_name": event["last_name"],
                "profile_picture": event["profile_picture"],
                "bio": event["bio"],
            }
        )

    async def presence_update(
        self,
        event,
    ):
        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "presence.update",
                "user": {
                    "id": event["user_id"],
                    "username": event[
                        "username"
                    ],
                    "online": event[
                        "online"
                    ],
                },
            }
        )

    async def typing_update(
        self,
        event,
    ):
        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "typing.update",
                "user": {
                    "id": event["user_id"],
                    "username": event[
                        "username"
                    ],
                    "is_typing": event[
                        "is_typing"
                    ],
                },
            }
        )

    async def message_read(
        self,
        event,
    ):
        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "message.read",
                "message": {
                    "id": event[
                        "message_id"
                    ],
                    "conversation_id": event[
                        "conversation_id"
                    ],
                    "read_by": {
                        "id": event[
                            "user_id"
                        ],
                        "username": event[
                            "username"
                        ],
                        "read_at": event[
                            "read_at"
                        ],
                    },
                },
            }
        )

    async def messages_read_batch(
        self,
        event,
    ):
        """Handle batch read receipt — forwards all IDs in one WS frame."""
        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "messages.read.batch",
                "message_ids": event["message_ids"],
                "conversation_id": event["conversation_id"],
                "user_id": event["user_id"],
                "username": event["username"],
                "read_at": event["read_at"],
            }
        )

    @database_sync_to_async
    def is_conversation_member(self):
        return (
            ConversationMember.objects.filter(
                conversation_id=self.conversation_id,
                user_id=self.user.id,
            ).exists()
        )

    @database_sync_to_async
    def get_online_members(self):
        members = (
            ConversationMember.objects
            .filter(
                conversation_id=self.conversation_id
            )
            .select_related("user")
        )

        online_users = []

        for member in members:
            user = member.user

            if is_user_online(user.id):
                online_users.append(
                    {
                        "id": user.id,
                        "username": user.username,
                    }
                )

        return online_users

    async def send_existing_online_users(
        self,
    ):
        online_users = (
            await self.get_online_members()
        )

        for user in online_users:
            if user["id"] == self.user.id:
                continue

            await self.send_json(
                {
                    "type": "presence.update",
                    "user": {
                        "id": user["id"],
                        "username": user[
                            "username"
                        ],
                        "online": True,
                    },
                }
            )

    @database_sync_to_async
    def create_message(
        self,
        content="",
        image_url=None,
    ):
        from apps.chats.models import (
            Conversation,
        )

        conversation = (
            Conversation.objects.get(
                id=self.conversation_id
            )
        )

        return create_message(
            conversation=conversation,
            sender=self.user,
            content=content,
            image_url=image_url,
        )

    @database_sync_to_async
    def mark_message_read(
        self,
        message_id,
    ):
        try:
            message_uuid = uuid.UUID(
                str(message_id)
            )
        except (
            ValueError,
            TypeError,
            AttributeError,
        ):
            return None

        try:
            (
                message,
                receipt,
                _created,
            ) = mark_message_as_read(
                message_id=message_uuid,
                user=self.user,
            )
        except Message.DoesNotExist:
            return None

        if (
            str(message.conversation_id)
            != str(self.conversation_id)
        ):
            return None

        return (
            message,
            receipt,
            _created,
        )

    @database_sync_to_async
    def add_user_connection(self):
        return add_connection(
            self.user.id
        )

    @database_sync_to_async
    def remove_user_connection(self):
        return remove_connection(
            self.user.id
        )

    async def broadcast_presence(
        self,
        online,
    ):
        from apps.chats.presence import (
            broadcast_presence,
        )

        await database_sync_to_async(
            broadcast_presence
        )(
            self.conversation_id,
            self.user.id,
            self.user.username,
            online,
        )

    async def mark_all_conversation_messages_read(self):
        unread_msgs = await self.db_mark_messages_read()

        if not unread_msgs:
            return

        from django.utils import timezone
        now_iso = timezone.now().isoformat()

        # Batch broadcast: one message with all IDs instead of N individual sends
        message_ids = [str(msg.id) for msg in unread_msgs]

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "messages.read.batch",
                "message_ids": message_ids,
                "conversation_id": str(self.conversation_id),
                "user_id": self.user.id,
                "username": self.user.username,
                "read_at": now_iso,
            }
        )

    @database_sync_to_async
    def db_mark_messages_read(self):
        from apps.messages.services import mark_conversation_messages_as_read
        return list(mark_conversation_messages_as_read(
            conversation_id=self.conversation_id,
            user=self.user,
        ))

    async def join_all_user_conversation_groups(self):
        conv_ids = await self.get_user_conversation_ids()
        for cid in conv_ids:
            await self.channel_layer.group_add(
                f"conversation_{cid}",
                self.channel_name,
            )

    async def leave_all_user_conversation_groups(self):
        conv_ids = await self.get_user_conversation_ids()
        for cid in conv_ids:
            await self.channel_layer.group_discard(
                f"conversation_{cid}",
                self.channel_name,
            )

    @database_sync_to_async
    def get_user_conversation_ids(self):
        return list(
            ConversationMember.objects.filter(user=self.user)
            .values_list("conversation_id", flat=True)
        )

