from rest_framework.permissions import BasePermission


class IsMessageSender(BasePermission):
    message = "You can only modify your own messages."

    def has_object_permission(self, request, view, obj):
        return obj.sender_id == request.user.id