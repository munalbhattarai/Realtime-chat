from asgiref.sync import async_to_sync
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from channels.layers import get_channel_layer

from apps.chats.events import (
    broadcast_message_deleted,
    broadcast_message_updated,
)
from apps.chats.models import Conversation
from apps.chats.permissions import IsConversationMember

from .models import Message, MessageRead
from .pagination import MessageCursorPagination
from .permissions import IsMessageSender
from .serializers import MessageSerializer
from .services import create_message, upload_image_to_cloudinary, mark_conversation_messages_as_read


class ConversationMessageListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = MessageSerializer
    permission_classes = [
        IsAuthenticated,
        IsConversationMember,
    ]
    pagination_class = MessageCursorPagination

    def get_conversation(self):
        return get_object_or_404(
            Conversation.objects.only("id"),
            id=self.kwargs["conversation_id"],
        )

    def get_queryset(self):
        conversation = self.get_conversation()

        self.check_object_permissions(
            self.request,
            conversation,
        )

        # Mark all messages in this conversation as read for the requesting user
        mark_conversation_messages_as_read(
            conversation_id=conversation.id,
            user=self.request.user,
        )

        return (
            Message.objects
            .filter(conversation=conversation)
            .select_related(
                "sender",
                "sender__profile",
            )
            .prefetch_related(
                Prefetch(
                    "read_receipts",
                    queryset=(
                        MessageRead.objects
                        .select_related("user")
                    ),
                ),
            )
            .order_by("-created_at")
        )


    def perform_create(self, serializer):
        conversation = self.get_conversation()

        self.check_object_permissions(
            self.request,
            conversation,
        )

        create_message(
            conversation=conversation,
            sender=self.request.user,
            content=serializer.validated_data.get("content", ""),
        )


class MessageDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = MessageSerializer
    permission_classes = [
        IsAuthenticated,
        IsMessageSender,
    ]

    def get_queryset(self):
        return (
            Message.objects
            .select_related(
                "sender",
                "sender__profile",
                "conversation",
            )
            .prefetch_related(
                Prefetch(
                    "read_receipts",
                    queryset=(
                        MessageRead.objects
                        .select_related("user")
                    ),
                ),
            )
        )

    def perform_update(self, serializer):
        message = serializer.save()

        async_to_sync(
            broadcast_message_updated
        )(
            message.conversation_id,
            message,
        )

    def perform_destroy(self, instance):
        conversation_id = instance.conversation_id
        message_id = instance.id

        instance.delete()

        async_to_sync(
            broadcast_message_deleted
        )(
            conversation_id,
            message_id,
        )


class UploadMessageImageView(APIView):
    permission_classes = [IsAuthenticated, IsConversationMember]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        self.check_object_permissions(request, conversation)

        image_file = request.FILES.get("file")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type and size (max 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response({"detail": "Image size exceeds 10MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        if not image_file.content_type.startswith("image/"):
            return Response({"detail": "File must be an image."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            image_url = upload_image_to_cloudinary(image_file)
            content = request.data.get("content", "")

            message = create_message(
                conversation=conversation,
                sender=request.user,
                content=content,
                image_url=image_url,
            )

            # Broadcast via Channel Layer to WebSocket group
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation_id}",
                {
                    "type": "message.created",
                    "message_id": str(message.id),
                    "conversation_id": str(conversation_id),
                    "sender_id": request.user.id,
                    "sender_username": request.user.username,
                    "content": message.content,
                    "image_url": message.image_url,
                    "created_at": message.created_at.isoformat(),
                },
            )

            serializer = MessageSerializer(message, context={"request": request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
