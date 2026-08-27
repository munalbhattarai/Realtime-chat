from django.db import models
from django.conf import settings


# Create your models here.

class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    profile_picture = models.ImageField(upload_to="profile_pictures/", blank=True, null=True, max_length=500)

    bio = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username

    def get_profile_picture_url(self):
        """Returns the full URL of the profile picture, or None."""
        if not self.profile_picture:
            return None
        # If already a full URL (Cloudinary), return as-is
        val = str(self.profile_picture)
        if val.startswith("http://") or val.startswith("https://"):
            return val
        # Local file — let Django build the media URL
        try:
            return self.profile_picture.url
        except Exception:
            return None


class FriendRequest(models.Model):
    class RequestStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests",
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friend_requests",
    )
    status = models.CharField(
        max_length=10,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                name="unique_sender_receiver_friend_request",
            )
        ]
        indexes = [
            models.Index(fields=["sender", "status"]),
            models.Index(fields=["receiver", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"