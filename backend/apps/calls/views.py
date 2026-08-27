from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.calls.services import generate_turn_credentials


class TurnCredentialsView(APIView):
    """
    Authenticated endpoint to fetch temporary ICE server credentials for WebRTC.
    Requires a valid JWT Bearer token.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        credentials = generate_turn_credentials(ttl=86400)
        return Response(credentials, status=status.HTTP_200_OK)
