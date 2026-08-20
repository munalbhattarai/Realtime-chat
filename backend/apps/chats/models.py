import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Conversation(models.Model):

    class ConversationType(models.TextChoices):
        PRIVATE = "PRIVATE", "Private"
        GROUP = "GROUP", "Group"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    type = models.CharField(
        max_length=10,
        choices=ConversationType.choices,
    )

    name = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    # Used only for PRIVATE conversations.
    # The smaller user ID must always be stored in private_user_1.
    private_user_1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="private_conversations_as_user_1",
    )

    private_user_2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="private_conversations_as_user_2",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()

        if self.type == self.ConversationType.PRIVATE:
            if not self.private_user_1 or not self.private_user_2:
                raise ValidationError(
                    "Private conversations must have two users."
                )

            if self.private_user_1_id == self.private_user_2_id:
                raise ValidationError(
                    "A user cannot have a private conversation with themselves."
                )

            if self.private_user_1_id > self.private_user_2_id:
                raise ValidationError(
                    "private_user_1 must have the smaller user ID."
                )

        elif self.type == self.ConversationType.GROUP:
            if self.private_user_1 or self.private_user_2:
                raise ValidationError(
                    "Group conversations cannot have private users."
                )

    class Meta:
        constraints = [
        models.UniqueConstraint(
            fields=["private_user_1", "private_user_2"],
            condition=models.Q(
                type="PRIVATE",
            ),
            name="unique_private_conversation_pair",
        ),
    ]

    def __str__(self):
        if self.type == self.ConversationType.PRIVATE:
            return f"Private conversation: {self.private_user_1} & {self.private_user_2}"

        return self.name or "Unnamed group"


class ConversationMember(models.Model):

    class MemberRole(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"

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

    role = models.CharField(
        max_length=6,
        choices=MemberRole.choices,
        default=MemberRole.MEMBER,
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="unique_conversation_user",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.conversation}"