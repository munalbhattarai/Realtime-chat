import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction

from .models import Message


def upload_image_to_cloudinary(file_obj):
    """
    Uploads an image file to Cloudinary if configured.
    Falls back gracefully to local media storage if Cloudinary credentials are missing or fail.
    """
    cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    api_key = getattr(settings, "CLOUDINARY_API_KEY", "")
    api_secret = getattr(settings, "CLOUDINARY_API_SECRET", "")

    if cloud_name and api_key and api_secret and cloud_name != "your_cloud_name":
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file_obj,
                folder="chat_images",
                resource_type="image",
            )
            return result.get("secure_url") or result.get("url")
        except Exception as e:
            print(f"Cloudinary upload failed ({e}), falling back to local storage.")

    # Fallback: Save to local media directory
    file_name = default_storage.save(f"chat_images/{file_obj.name}", ContentFile(file_obj.read()))
    return settings.MEDIA_URL + file_name


@transaction.atomic
def create_message(
    *,
    conversation,
    sender,
    content="",
    image_url=None,
):
    content = (content or "").strip()

    if not content and not image_url:
        raise ValueError(
            "Message must contain text content or an image."
        )

    msg = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content,
        image_url=image_url,
    )
    conversation.save(update_fields=["updated_at"])
    return msg



@transaction.atomic
def mark_message_as_read(
    *,
    message_id,
    user,
):
    from django.utils import timezone
    from .models import MessageRead

    message = (
        Message.objects
        .select_related(
            "conversation",
            "sender",
        )
        .get(id=message_id)
    )

    if message.sender_id == user.id:
        return message, None, False

    if message.conversation.members.filter(
        user=user
    ).exists() is False:
        raise PermissionError(
            "You are not a member of this conversation."
        )

    receipt, created = MessageRead.objects.get_or_create(
        message=message,
        user=user,
        defaults={
            "read_at": timezone.now(),
        },
    )

    return message, receipt, created


@transaction.atomic
def mark_conversation_messages_as_read(*, conversation_id, user):
    from django.utils import timezone
    from .models import MessageRead
    
    unread_messages = list(Message.objects.filter(
        conversation_id=conversation_id
    ).exclude(
        sender_id=user.id
    ).exclude(
        read_receipts__user_id=user.id
    ))
    
    receipts_to_create = []
    now = timezone.now()
    for msg in unread_messages:
        receipts_to_create.append(
            MessageRead(message=msg, user=user, read_at=now)
        )
    
    if receipts_to_create:
        MessageRead.objects.bulk_create(receipts_to_create, ignore_conflicts=True)
    return unread_messages

