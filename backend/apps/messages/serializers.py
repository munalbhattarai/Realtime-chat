from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )
    readBy = serializers.SerializerMethodField()

    def get_readBy(self, message):
        receipts = message.read_receipts.all()

        return {
            str(receipt.user_id): {
                "userId": receipt.user_id,
                "username": receipt.user.username,
                "readAt": receipt.read_at.isoformat(),
            }
            for receipt in receipts
        }

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_username",
            "content",
            "image_url",
            "created_at",
            "updated_at",
            "readBy",
        ]

        read_only_fields = [
            "id",
            "sender",
            "sender_username",
            "created_at",
            "updated_at",
            "readBy",
        ]
