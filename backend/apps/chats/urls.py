from django.urls import path

from .views import (
    ConversationListView,
    PrivateConversationCreateView,
    GroupConversationCreateView,
    ConversationDeleteView,
    GroupLeaveView,
    GroupMemberManagementView,
)

urlpatterns = [
    path(
        "conversations/",
        ConversationListView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/private/",
        PrivateConversationCreateView.as_view(),
        name="private-conversation-create",
    ),
    path(
        "conversations/group/",
        GroupConversationCreateView.as_view(),
        name="group-conversation-create",
    ),
    path(
        "conversations/<uuid:pk>/",
        ConversationDeleteView.as_view(),
        name="conversation-delete",
    ),
    path(
        "conversations/<uuid:pk>/leave/",
        GroupLeaveView.as_view(),
        name="group-leave",
    ),
    path(
        "conversations/<uuid:pk>/members/",
        GroupMemberManagementView.as_view(),
        name="group-member-add",
    ),
    path(
        "conversations/<uuid:pk>/members/<int:user_id>/",
        GroupMemberManagementView.as_view(),
        name="group-member-remove",
    ),
]
