from django.contrib.auth import get_user_model

from rest_framework import serializers

from .models import Conversation, ConversationMember
from .services import get_or_create_private_conversation


User = get_user_model()


class ConversationMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(
    source="user.id",
    read_only=True,
)

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )

    profile_picture = serializers.SerializerMethodField()

    bio = serializers.CharField(
        source="user.profile.bio",
        read_only=True,
    )

    def get_profile_picture(self, obj):
        if hasattr(obj.user, "profile") and obj.user.profile:
            return obj.user.profile.get_profile_picture_url()
        return None


    class Meta:
        model = ConversationMember
        fields = [
            "user_id",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "bio",
            "role",
            "joined_at",
        ]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(
        many=True,
        read_only=True,
    )
    unread_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "type",
            "name",
            "members",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "members",
            "created_at",
            "updated_at",
        ]


class PrivateConversationCreateSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
    )

    def validate(self, attrs):
        request = self.context["request"]

        if request.user.pk == attrs["user"].pk:
            raise serializers.ValidationError(
                {
                    "user_id": (
                        "You cannot create a private conversation "
                        "with yourself."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = validated_data["user"]

        return get_or_create_private_conversation(
            request.user,
            user,
        )


class GroupConversationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    user_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
    )

    def validate_user_ids(self, value):
        if len(value) < 1:
            raise serializers.ValidationError(
                "You must include at least one other user to create a group."
            )
        return value

    def create(self, validated_data):
        request = self.context["request"]
        from .services import create_group_conversation
        
        return create_group_conversation(
            creator=request.user,
            name=validated_data.get("name", ""),
            users=validated_data["user_ids"],
        )
