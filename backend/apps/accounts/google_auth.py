import re
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import exceptions
from rest_framework_simplejwt.tokens import RefreshToken

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import Profile
from .serializers import ProfileSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


def verify_google_id_token(credential: str) -> dict:
    """
    Verifies a Google OAuth ID Token server-side using Google's official auth library.
    Validates signature, expiration, issuer, audience, and email verification.
    """
    if not credential or not isinstance(credential, str):
        raise exceptions.ValidationError({"detail": "Google credential token is required."})

    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "").strip() or None

    try:
        # verify_oauth2_token verifies signature, exp, and aud against Google public keys
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise exceptions.ValidationError({"detail": "Invalid or expired Google credential."})
    except Exception as e:
        logger.error(f"Unexpected error verifying Google credential: {e}")
        raise exceptions.ValidationError({"detail": "Could not verify Google credential."})

    # Validate issuer
    issuer = idinfo.get("iss", "")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise exceptions.ValidationError({"detail": "Invalid Google token issuer."})

    # Validate email verification
    email_verified = idinfo.get("email_verified", False)
    if not email_verified:
        raise exceptions.ValidationError({"detail": "Google account email is not verified."})

    email = idinfo.get("email", "").strip().lower()
    if not email:
        raise exceptions.ValidationError({"detail": "No email address found in Google credential."})

    return {
        "email": email,
        "first_name": idinfo.get("given_name", "").strip(),
        "last_name": idinfo.get("family_name", "").strip(),
        "picture": idinfo.get("picture", "").strip(),
        "sub": idinfo.get("sub", "").strip(),
    }


def generate_unique_username(first_name: str, last_name: str, email: str) -> str:
    """
    Generates a clean, unique Django username (max 150 chars) from the user's name or email.
    """
    base = ""
    if first_name or last_name:
        combined = f"{first_name}_{last_name}".strip("_")
        base = re.sub(r"[^\w.]", "", combined).lower()

    if not base:
        email_prefix = email.split("@")[0]
        base = re.sub(r"[^\w.]", "", email_prefix).lower()

    if not base:
        base = "hero"

    # Truncate base to leave room for potential numeric suffix
    base = base[:130]

    candidate = base
    counter = 1
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{base}{counter}"
        counter += 1

    return candidate


@transaction.atomic
def authenticate_or_create_google_user(credential: str) -> dict:
    """
    Validates Google credentials, finds or creates the Django User and Profile,
    and issues SimpleJWT access + refresh tokens in standard format.
    """
    google_data = verify_google_id_token(credential)
    email = google_data["email"]
    first_name = google_data["first_name"]
    last_name = google_data["last_name"]
    picture = google_data["picture"]

    user = User.objects.filter(email__iexact=email).first()

    if user:
        if not user.is_active:
            raise exceptions.AuthenticationFailed("This hero account has been deactivated.")

        # Ensure user profile exists
        Profile.objects.get_or_create(user=user)

        # Fill in missing names without overwriting custom names
        updated_fields = []
        if not user.first_name and first_name:
            user.first_name = first_name
            updated_fields.append("first_name")
        if not user.last_name and last_name:
            user.last_name = last_name
            updated_fields.append("last_name")
        if updated_fields:
            user.save(update_fields=updated_fields)

        # If user has no profile picture yet, use Google profile picture
        if picture and not user.profile.profile_picture:
            user.profile.profile_picture = picture
            user.profile.save(update_fields=["profile_picture"])

    else:
        # Create brand new user
        username = generate_unique_username(first_name, last_name, email)
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        # Mark password as unusable since authenticated via Google OAuth
        user.set_unusable_password()
        user.save()

        # Create Profile
        Profile.objects.create(
            user=user,
            profile_picture=picture or None,
        )

    # Issue SimpleJWT tokens
    refresh = RefreshToken.for_user(user)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "profile": ProfileSerializer(user.profile).data,
        },
    }
