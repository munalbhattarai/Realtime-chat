from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    GoogleAuthView,
    GoogleClientIdView,
    LogoutView,
    MeView,
    UserSearchView,
    FriendRequestListCreateView,
    FriendRequestActionView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("google-client-id/", GoogleClientIdView.as_view(), name="google-client-id"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("search/", UserSearchView.as_view(), name="user_search"),
    path("friend-requests/", FriendRequestListCreateView.as_view(), name="friend-requests"),
    path("friend-requests/<int:pk>/accept/", FriendRequestActionView.as_view(), {"action": "accept"}, name="friend-request-accept"),
    path("friend-requests/<int:pk>/reject/", FriendRequestActionView.as_view(), {"action": "reject"}, name="friend-request-reject"),
    path("friend-requests/<int:pk>/cancel/", FriendRequestActionView.as_view(), {"action": "cancel"}, name="friend-request-cancel"),
]

