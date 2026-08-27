from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.calls.views import TurnCredentialsView
from apps.calls.services import generate_turn_credentials


class MockUser:
    is_authenticated = True
    id = 1
    username = "peterparker"


class TurnCredentialsTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = TurnCredentialsView.as_view()
        self.url = "/api/calls/turn-credentials/"
        self.user = MockUser()

    def test_unauthenticated_request_rejected(self):
        """Unauthenticated requests must be rejected with 401."""
        request = self.factory.get(self.url)
        request.user = AnonymousUser()
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_request_fallback_when_no_env_keys(self):
        """When Cloudflare env keys are absent, fallback STUN is returned gracefully."""
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        with patch.dict("os.environ", {"CLOUDFLARE_TURN_KEY_ID": "", "CLOUDFLARE_TURN_API_TOKEN": ""}):
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.data
            self.assertIn("iceServers", data)
            self.assertIsInstance(data["iceServers"], list)
            self.assertTrue(len(data["iceServers"]) > 0)
            self.assertEqual(data.get("ttl"), 86400)
            # Ensure no secret keys are present in output
            self.assertNotIn("CLOUDFLARE_TURN_API_TOKEN", data)
            self.assertNotIn("CLOUDFLARE_TURN_KEY_ID", data)

    @patch("apps.calls.services.requests.post")
    def test_authenticated_request_with_cloudflare_mock(self, mock_post):
        """When Cloudflare keys exist, endpoint calls Cloudflare API and returns generated credentials."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "iceServers": {
                "urls": [
                    "turn:turn.cloudflare.com:3478?transport=udp",
                    "turn:turn.cloudflare.com:3478?transport=tcp",
                    "turns:turn.cloudflare.com:5349?transport=tcp",
                ],
                "username": "mock_turn_user_123",
                "credential": "mock_turn_credential_456",
            }
        }
        mock_post.return_value = mock_response

        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        with patch.dict("os.environ", {
            "CLOUDFLARE_TURN_KEY_ID": "mock_key_id",
            "CLOUDFLARE_TURN_API_TOKEN": "mock_token_secret",
        }):
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.data
            self.assertIn("iceServers", data)
            self.assertIsInstance(data["iceServers"], list)
            # Check that turn urls and credentials were included
            turn_server = next((s for s in data["iceServers"] if s.get("username") == "mock_turn_user_123"), None)
            self.assertIsNotNone(turn_server)
            self.assertEqual(turn_server["credential"], "mock_turn_credential_456")
            # Ensure secrets are never leaked
            self.assertNotIn("mock_token_secret", str(data))
            self.assertNotIn("mock_key_id", str(data))

