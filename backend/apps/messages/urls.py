from django.urls import path

from .views import (
    ConversationMessageListCreateView,
    MessageDetailView,
    UploadMessageImageView,
)


urlpatterns = [
    path(
        "conversations/<uuid:conversation_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="conversation-messages",
    ),
    path(
        "conversations/<uuid:conversation_id>/upload-image/",
        UploadMessageImageView.as_view(),
        name="conversation-upload-image",
    ),
    path(
        "<uuid:pk>/",
        MessageDetailView.as_view(),
        name="message-detail",
    ),
]