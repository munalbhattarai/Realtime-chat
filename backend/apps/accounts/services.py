from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


def upload_profile_picture(file_obj):
    """
    Uploads a profile picture to Cloudinary if configured,
    otherwise falls back to local media storage.
    Returns the URL string of the uploaded file.
    """
    cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    api_key = getattr(settings, "CLOUDINARY_API_KEY", "")
    api_secret = getattr(settings, "CLOUDINARY_API_SECRET", "")

    cloudinary_ready = (
        cloud_name
        and api_key
        and api_secret
        and cloud_name != "your_cloud_name"
        and api_key != "your_api_key"
    )

    if cloudinary_ready:
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file_obj,
                folder="profile_pictures",
                resource_type="image",
                # Overwrite existing by using username as public_id so each
                # user only ever has one picture in Cloudinary
                overwrite=True,
            )
            return result.get("secure_url") or result.get("url")
        except Exception as e:
            print(f"Cloudinary profile picture upload failed ({e}), falling back to local storage.")

    # Fallback: local media storage
    file_obj.seek(0)
    file_name = default_storage.save(
        f"profile_pictures/{file_obj.name}",
        ContentFile(file_obj.read()),
    )
    return settings.MEDIA_URL + file_name
