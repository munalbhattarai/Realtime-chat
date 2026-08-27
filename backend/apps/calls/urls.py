from django.urls import path
from apps.calls.views import TurnCredentialsView

urlpatterns = [
    path("turn-credentials/", TurnCredentialsView.as_view(), name="turn-credentials"),
]
