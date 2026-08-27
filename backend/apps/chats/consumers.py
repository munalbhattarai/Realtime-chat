import uuid

from channels.db import database_sync_to_async
from channels.generic.websocket import (
    AsyncJsonWebsocketConsumer,
)

from apps.chats.events import conversation_group_name
from apps.chats.models import (
    Conversation,
    ConversationMember,
)
from apps.chats.presence import (
    add_connection,
    clear_user_in_call,
    is_user_in_call,
    is_user_online,
    remove_connection,
    set_user_in_call,
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

        raw_conv_id = self.scope.get("url_route", {}).get("kwargs", {}).get("conversation_id")
        if raw_conv_id and raw_conv_id != "user":
            self.conversation_id = raw_conv_id
            if not await self.is_conversation_member():
                await self.accept()
                await self.close(code=4003)
                return
            self.room_group_name = conversation_group_name(self.conversation_id)
        else:
            self.conversation_id = None
            self.room_group_name = None

        await self.accept()

        self.user_group_name = f"user_{self.user.id}"

        try:
            # Join personal user group so global notifications/new chats reach this socket
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name,
            )

            if self.room_group_name:
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name,
                )

            # Join room groups for all conversations the user is a member of
            # so real-time updates (unread counts/badges) work across all chats
            await self.join_all_user_conversation_groups()
        except Exception as err:
            print(f"Group add error on connect: {err}")

        if self.conversation_id:
            try:
                # Mark all messages as read for this user.
                await self.mark_all_conversation_messages_read()
            except Exception as err:
                print(f"Mark read error on connect: {err}")

        try:
            # Track this connection.
            connection_count = (
                await self.add_user_connection()
            )

            if self.conversation_id:
                # Send users already online in this conversation.
                await self.send_existing_online_users()

            # Only broadcast online on first connection.
            if connection_count == 1:
                await self.broadcast_presence(True)
        except Exception as err:
            print(f"Presence error on connect: {err}")

        await self.send_json(
            {
                "type": "connection",
                "message": (
                    "Connected to Web-Net."
                ),
                "conversation_id": str(
                    self.conversation_id
                ) if self.conversation_id else None,
            }
        )

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "user_group_name") and self.user_group_name:
                await self.channel_layer.group_discard(
                    self.user_group_name,
                    self.channel_name,
                )

            if hasattr(self, "room_group_name") and self.room_group_name:
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name,
                )

            await self.leave_all_user_conversation_groups()
        except Exception as err:
            print(f"Group discard error on disconnect: {err}")

        try:
            connection_count = (
                await self.remove_user_connection()
            )

            # Only broadcast offline when the
            # user's last connection closes.
            if connection_count == 0:
                await self.broadcast_presence(False)
        except Exception as err:
            print(f"Presence error on disconnect: {err}")

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

        # ── Video call signaling ──────────────────────
        if message_type in (
            "call.invite",
            "call.accept",
            "call.reject",
            "call.offer",
            "call.answer",
            "call.ice_candidate",
            "call.end",
            "call.cancel",
        ):
            await self.handle_call_signal(message_type, content)
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
            msg_payload = {
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
            }

            if self.room_group_name:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    msg_payload,
                )

            # Also broadcast directly to each member's personal user group
            member_ids = await self.get_conversation_member_ids()
            for member_id in member_ids:
                if member_id != self.user.id:
                    try:
                        await self.channel_layer.group_send(
                            f"user_{member_id}",
                            msg_payload,
                        )
                    except Exception as err:
                        print(f"User group broadcast warning: {err}")
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

    async def conversation_created(
        self,
        event,
    ):
        conv_data = event.get("conversation", {})
        conv_id = conv_data.get("id")
        if conv_id:
            try:
                await self.channel_layer.group_add(
                    f"conversation_{conv_id}",
                    self.channel_name,
                )
            except Exception as e:
                print(f"Error subscribing to new conversation group: {e}")

        await self.send_json(
            {
                "type": "conversation.created",
                "conversation": conv_data,
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

    async def friend_request_received(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "friend_request.received",
                "request": event.get("request"),
            }
        )

    async def friend_request_accepted(
        self,
        event,
    ):
        conv_data = event.get("conversation")
        if conv_data and conv_data.get("id"):
            try:
                await self.channel_layer.group_add(
                    f"conversation_{conv_data['id']}",
                    self.channel_name,
                )
            except Exception as e:
                print(f"Error subscribing to accepted friend conversation group: {e}")

        await self.send_json(
            {
                "type": "friend_request.accepted",
                "request": event.get("request"),
                "conversation": conv_data,
            }
        )

    async def friend_request_rejected(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "friend_request.rejected",
                "request_id": event.get("request_id"),
            }
        )

    async def friend_request_cancelled(
        self,
        event,
    ):
        await self.send_json(
            {
                "type": "friend_request.cancelled",
                "request_id": event.get("request_id"),
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

    @database_sync_to_async
    def get_conversation_member_ids(self):
        if not self.conversation_id:
            return []
        return list(
            ConversationMember.objects.filter(
                conversation_id=self.conversation_id
            ).values_list("user_id", flat=True)
        )

    # ══════════════════════════════════════════════════════════════
    # VIDEO CALL SIGNALING
    # ══════════════════════════════════════════════════════════════

    async def handle_call_signal(self, message_type, content):
        """Central dispatcher for all call.* signaling messages."""
        call_id = content.get("call_id")
        conversation_id = content.get("conversation_id")

        if not call_id or not conversation_id:
            await self.send_json({
                "type": "error",
                "message": "call_id and conversation_id are required.",
            })
            return

        # Validate: conversation exists, is PRIVATE, and user is a member
        validation = await self._validate_call_conversation(conversation_id)
        if validation is None:
            await self.send_json({
                "type": "error",
                "message": "Invalid conversation or not a private conversation.",
            })
            return

        other_user_id = validation

        if message_type == "call.invite":
            await self._handle_call_invite(call_id, conversation_id, other_user_id)
        elif message_type == "call.accept":
            await self._handle_call_accept(call_id, conversation_id, other_user_id)
        elif message_type == "call.reject":
            await self._handle_call_reject(call_id, conversation_id, other_user_id)
        elif message_type == "call.offer":
            await self._handle_call_offer(call_id, conversation_id, other_user_id, content)
        elif message_type == "call.answer":
            await self._handle_call_answer(call_id, conversation_id, other_user_id, content)
        elif message_type == "call.ice_candidate":
            await self._handle_call_ice_candidate(call_id, conversation_id, other_user_id, content)
        elif message_type == "call.end":
            await self._handle_call_end(call_id, conversation_id, other_user_id)
        elif message_type == "call.cancel":
            await self._handle_call_cancel(call_id, conversation_id, other_user_id)

    @database_sync_to_async
    def _validate_call_conversation(self, conversation_id):
        """Validate conversation is PRIVATE and user is a member.
        Returns the other user's ID, or None on failure."""
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except (Conversation.DoesNotExist, Exception):
            return None

        if conv.type != Conversation.ConversationType.PRIVATE:
            return None

        member_ids = list(
            ConversationMember.objects.filter(
                conversation_id=conversation_id
            ).values_list("user_id", flat=True)
        )

        if self.user.id not in member_ids:
            return None

        # Return the OTHER user's ID
        for mid in member_ids:
            if mid != self.user.id:
                return mid
        return None

    async def _handle_call_invite(self, call_id, conversation_id, other_user_id):
        # Check if the receiver is already in a call
        busy_call_id = await database_sync_to_async(is_user_in_call)(other_user_id)
        if busy_call_id:
            await self.send_json({
                "type": "call.busy",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
            })
            return

        # Check if caller is already in a call
        caller_busy = await database_sync_to_async(is_user_in_call)(self.user.id)
        if caller_busy:
            await self.send_json({
                "type": "error",
                "message": "You are already in a call.",
            })
            return

        # Forward invite to the receiver
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.invite",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
                "caller_id": self.user.id,
                "caller_username": self.user.username,
            },
        )

    async def _handle_call_accept(self, call_id, conversation_id, other_user_id):
        # Mark both users as in a call
        await database_sync_to_async(set_user_in_call)(self.user.id, call_id)
        await database_sync_to_async(set_user_in_call)(other_user_id, call_id)

        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.accept",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
                "user_id": self.user.id,
            },
        )

    async def _handle_call_reject(self, call_id, conversation_id, other_user_id):
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.reject",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
            },
        )

    async def _handle_call_offer(self, call_id, conversation_id, other_user_id, content):
        sdp = content.get("sdp")
        if not sdp:
            return
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.offer",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
                "sdp": sdp,
            },
        )

    async def _handle_call_answer(self, call_id, conversation_id, other_user_id, content):
        sdp = content.get("sdp")
        if not sdp:
            return
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.answer",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
                "sdp": sdp,
            },
        )

    async def _handle_call_ice_candidate(self, call_id, conversation_id, other_user_id, content):
        candidate = content.get("candidate")
        if candidate is None:
            return
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.ice_candidate",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
                "candidate": candidate,
            },
        )

    async def _handle_call_end(self, call_id, conversation_id, other_user_id):
        # Clear call-active state for both users
        await database_sync_to_async(clear_user_in_call)(self.user.id)
        await database_sync_to_async(clear_user_in_call)(other_user_id)

        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.end",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
            },
        )

    async def _handle_call_cancel(self, call_id, conversation_id, other_user_id):
        await self.channel_layer.group_send(
            f"user_{other_user_id}",
            {
                "type": "call.signal",
                "event_type": "call.cancel",
                "call_id": call_id,
                "conversation_id": str(conversation_id),
            },
        )

    async def call_signal(self, event):
        """Channel-layer handler — forward call signaling events to the WebSocket client."""
        payload = {
            "type": event["event_type"],
            "call_id": event["call_id"],
            "conversation_id": event["conversation_id"],
        }
        # Attach optional fields
        for key in ("caller_id", "caller_username", "user_id", "sdp", "candidate"):
            if key in event:
                payload[key] = event[key]

        await self.send_json(payload)

