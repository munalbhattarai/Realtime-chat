from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.messages.models import Message
from .models import Conversation
from .serializers import (
    ConversationSerializer,
    PrivateConversationCreateSerializer,
)


class ConversationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects
            .filter(members__user=user)
            .annotate(
                unread_count=Count(
                    "messages",
                    filter=~Q(messages__sender=user) & ~Q(messages__in=Message.objects.filter(read_receipts__user=user)),
                    distinct=True
                )
            )
            .prefetch_related("members__user__profile")
            .order_by("-updated_at")
        )



def broadcast_conversation_created(conversation, request):
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    for member in conversation.members.all():
        try:
            serializer = ConversationSerializer(conversation, context={"request": request})
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user_id}",
                {
                    "type": "conversation.created",
                    "conversation": serializer.data,
                }
            )
        except Exception as e:
            print(f"Error broadcasting conversation.created to user {member.user_id}: {e}")


class PrivateConversationCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrivateConversationCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = serializer.save()

        response_serializer = ConversationSerializer(
            conversation,
            context={"request": request},
        )

        broadcast_conversation_created(conversation, request)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class GroupConversationCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        from .serializers import GroupConversationCreateSerializer
        return GroupConversationCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = serializer.save()

        response_serializer = ConversationSerializer(
            conversation,
            context={"request": request},
        )

        broadcast_conversation_created(conversation, request)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(members__user=user)


class GroupLeaveView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .models import ConversationMember
        user = request.user
        membership = ConversationMember.objects.filter(conversation_id=pk, user=user).first()
        if not membership:
            return Response({"detail": "Not a member of this conversation."}, status=status.HTTP_400_BAD_REQUEST)
        
        conversation = membership.conversation
        membership.delete()

        # If group has no members left, delete conversation
        if conversation.type == Conversation.ConversationType.GROUP and not conversation.members.exists():
            conversation.delete()

        return Response({"detail": "Successfully left the group."}, status=status.HTTP_200_OK)


class GroupMemberManagementView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .models import ConversationMember
        from django.contrib.auth import get_user_model
        User = get_user_model()

        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check caller is member/admin
        caller_membership = ConversationMember.objects.filter(conversation_id=pk, user=request.user).first()
        if not caller_membership:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(id=target_user_id).first()
        if not target_user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        ConversationMember.objects.get_or_create(
            conversation_id=pk,
            user=target_user,
            defaults={"role": ConversationMember.MemberRole.MEMBER}
        )

        conversation = Conversation.objects.get(id=pk)
        return Response(ConversationSerializer(conversation, context={"request": request}).data, status=status.HTTP_200_OK)

    def delete(self, request, pk, user_id):
        from .models import ConversationMember
        caller_membership = ConversationMember.objects.filter(conversation_id=pk, user=request.user).first()
        if not caller_membership:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        membership = ConversationMember.objects.filter(conversation_id=pk, user_id=user_id).first()
        if membership:
            membership.delete()

        return Response({"detail": "Member removed successfully."}, status=status.HTTP_200_OK)
