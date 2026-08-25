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