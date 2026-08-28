from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.shortcuts import get_object_or_404
from .models import FriendRequest
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    MeSerializer,
    UserSearchSerializer,
    FriendRequestSerializer,
    GoogleAuthSerializer,
)
from .google_auth import authenticate_or_create_google_user

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        credential = serializer.validated_data["credential"]
        auth_data = authenticate_or_create_google_user(credential)

        return Response(auth_data, status=status.HTTP_200_OK)


class GoogleClientIdView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        return Response({"client_id": client_id}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()

        # Broadcast profile update to all conversations the user is in
        channel_layer = get_channel_layer()
        conversations = user.conversation_memberships.values_list("conversation_id", flat=True)
        for conv_id in conversations:
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conv_id}",
                {
                    "type": "profile.update",
                    "user_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "profile_picture": user.profile.get_profile_picture_url(),
                    "bio": user.profile.bio,
                }
            )


class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        if not query:
            return User.objects.none()

        cleaned_query = query.lstrip("@").strip()
        if not cleaned_query:
            return User.objects.none()

        # Strict exact username search so typing single characters does not return random users
        return (
            User.objects.exclude(id=self.request.user.id)
            .filter(username__iexact=cleaned_query)
            .select_related("profile")[:10]
        )


class FriendRequestListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        received = (
            FriendRequest.objects.filter(receiver=user, status=FriendRequest.RequestStatus.PENDING)
            .select_related("sender", "sender__profile")
            .order_by("-created_at")
        )
        sent = (
            FriendRequest.objects.filter(sender=user, status=FriendRequest.RequestStatus.PENDING)
            .select_related("receiver", "receiver__profile")
            .order_by("-created_at")
        )

        return Response(
            {
                "received": FriendRequestSerializer(received, many=True, context={"request": request}).data,
                "sent": FriendRequestSerializer(sent, many=True, context={"request": request}).data,
                "pending_count": received.count(),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        sender = request.user
        target_user_id = request.data.get("user_id")
        target_username = request.data.get("username", "").strip().lstrip("@")

        if target_user_id:
            target_user = User.objects.filter(id=target_user_id).first()
        elif target_username:
            target_user = User.objects.filter(username__iexact=target_username).first()
        else:
            return Response({"detail": "User ID or username is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not target_user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == sender.id:
            return Response({"detail": "You cannot send an add request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing relationship in either direction
        existing_sent = FriendRequest.objects.filter(sender=sender, receiver=target_user).first()
        if existing_sent:
            if existing_sent.status == FriendRequest.RequestStatus.ACCEPTED:
                return Response({"detail": "You are already web allies."}, status=status.HTTP_400_BAD_REQUEST)
            if existing_sent.status == FriendRequest.RequestStatus.PENDING:
                return Response({"detail": "Add request already pending."}, status=status.HTTP_400_BAD_REQUEST)
            # If rejected, reset to pending
            existing_sent.status = FriendRequest.RequestStatus.PENDING
            existing_sent.save()
            friend_request = existing_sent
        else:
            existing_received = FriendRequest.objects.filter(sender=target_user, receiver=sender).first()
            if existing_received:
                if existing_received.status == FriendRequest.RequestStatus.ACCEPTED:
                    return Response({"detail": "You are already web allies."}, status=status.HTTP_400_BAD_REQUEST)
                if existing_received.status == FriendRequest.RequestStatus.PENDING:
                    # Auto-accept since other user already sent request
                    existing_received.status = FriendRequest.RequestStatus.ACCEPTED
                    existing_received.save()
                    
                    from apps.chats.services import get_or_create_private_conversation
                    from apps.chats.serializers import ConversationSerializer
                    conversation = get_or_create_private_conversation(sender, target_user)
                    
                    # Broadcast to both
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        conv_data = ConversationSerializer(conversation).data
                        req_data = FriendRequestSerializer(existing_received, context={"request": request}).data
                        for uid in [sender.id, target_user.id]:
                            async_to_sync(channel_layer.group_send)(
                                f"user_{uid}",
                                {
                                    "type": "friend_request.accepted",
                                    "request": req_data,
                                    "conversation": conv_data,
                                }
                            )
                            async_to_sync(channel_layer.group_send)(
                                f"user_{uid}",
                                {
                                    "type": "conversation.created",
                                    "conversation": conv_data,
                                }
                            )
                    return Response(
                        {
                            "detail": "Connected as web allies!",
                            "request": FriendRequestSerializer(existing_received, context={"request": request}).data,
                            "conversation": ConversationSerializer(conversation).data,
                        },
                        status=status.HTTP_200_OK,
                    )

            # Create new friend request
            friend_request = FriendRequest.objects.create(
                sender=sender,
                receiver=target_user,
                status=FriendRequest.RequestStatus.PENDING,
            )

        # Broadcast new request notification to receiver
        channel_layer = get_channel_layer()
        if channel_layer:
            req_data = FriendRequestSerializer(friend_request, context={"request": request}).data
            async_to_sync(channel_layer.group_send)(
                f"user_{target_user.id}",
                {
                    "type": "friend_request.received",
                    "request": req_data,
                }
            )

        return Response(
            FriendRequestSerializer(friend_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FriendRequestActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action=None):
        friend_request = get_object_or_404(
            FriendRequest.objects.select_related("sender", "receiver"),
            id=pk
        )

        if action == "accept":
            if friend_request.receiver_id != request.user.id:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

            friend_request.status = FriendRequest.RequestStatus.ACCEPTED
            friend_request.save()

            from apps.chats.services import get_or_create_private_conversation
            from apps.chats.serializers import ConversationSerializer
            conversation = get_or_create_private_conversation(friend_request.sender, friend_request.receiver)

            channel_layer = get_channel_layer()
            req_data = FriendRequestSerializer(friend_request, context={"request": request}).data
            conv_data = ConversationSerializer(conversation).data

            if channel_layer:
                for uid in [friend_request.sender_id, friend_request.receiver_id]:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{uid}",
                        {
                            "type": "friend_request.accepted",
                            "request": req_data,
                            "conversation": conv_data,
                        }
                    )
                    async_to_sync(channel_layer.group_send)(
                        f"user_{uid}",
                        {
                            "type": "conversation.created",
                            "conversation": conv_data,
                        }
                    )

            return Response(
                {
                    "detail": "Ally request accepted.",
                    "request": req_data,
                    "conversation": conv_data,
                },
                status=status.HTTP_200_OK,
            )

        elif action == "reject":
            if friend_request.receiver_id != request.user.id:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

            friend_request.status = FriendRequest.RequestStatus.REJECTED
            friend_request.save()

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{friend_request.sender_id}",
                    {
                        "type": "friend_request.rejected",
                        "request_id": friend_request.id,
                    }
                )

            return Response({"detail": "Ally request declined."}, status=status.HTTP_200_OK)

        elif action == "cancel":
            if friend_request.sender_id != request.user.id:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

            receiver_id = friend_request.receiver_id
            req_id = friend_request.id
            friend_request.delete()

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{receiver_id}",
                    {
                        "type": "friend_request.cancelled",
                        "request_id": req_id,
                    }
                )

            return Response({"detail": "Ally request cancelled."}, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        return self.post(request, pk, action="cancel")
