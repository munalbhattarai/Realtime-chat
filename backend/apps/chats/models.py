import uuid
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    CONVERSATION_TYPES = [
        ("PRIVATE", "Private"),
        ("GROUP", "Group"),
    ]

    type = models.CharField(
        max_length=10,
        choices=CONVERSATION_TYPES,
    )

    name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    

class ConversationMember(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="members",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_memberships",
    )

    ROLES = [
        ("ADMIN", "Admin"),
        ("MEMBER", "Member"),
    ]

    role = models.CharField(
        max_length=6,
        choices=ROLES,
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="unique_conversation_user",
            ),
        ]