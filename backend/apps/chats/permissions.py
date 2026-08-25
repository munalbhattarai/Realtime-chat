from rest_framework.permissions import BasePermission


class IsConversationMember(BasePermission):
    message = "You must be a member of this conversation."

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and obj.members.filter(user=request.user).exists()
        )