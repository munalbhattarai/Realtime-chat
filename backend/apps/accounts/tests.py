from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.accounts.models import Profile

User = get_user_model()


class GoogleAuthTests(APITestCase):
    def setUp(self):
        self.google_url = reverse("google-auth")
        self.login_url = reverse("login")
        self.register_url = reverse("register")
        self.logout_url = reverse("logout")

        self.existing_user = User.objects.create_user(
            username="peterparker",
            email="peter.parker@dailybugle.com",
            password="StrongPassword123!",
            first_name="Peter",
            last_name="Parker",
        )
        Profile.objects.create(user=self.existing_user, bio="Your friendly neighborhood Spider-Man")

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_1_google_credential_verification_success(self, mock_verify):
        """Test 1: Google credential verification succeeds and returns JWT tokens."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "miles.morales@brooklyn.edu",
            "email_verified": True,
            "given_name": "Miles",
            "family_name": "Morales",
            "picture": "https://lh3.googleusercontent.com/a/miles-avatar.jpg",
            "sub": "google-sub-123456",
        }

        response = self.client.post(self.google_url, {"credential": "mock-valid-google-id-token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "miles.morales@brooklyn.edu")
        self.assertEqual(response.data["user"]["first_name"], "Miles")

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_2_invalid_google_credential(self, mock_verify):
        """Test 2: Invalid Google credential returns 400 Bad Request."""
        mock_verify.side_effect = ValueError("Invalid token signature")

        response = self.client.post(self.google_url, {"credential": "invalid-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_3_expired_google_credential(self, mock_verify):
        """Test 3: Expired Google credential returns 400 Bad Request."""
        mock_verify.side_effect = ValueError("Token has expired")

        response = self.client.post(self.google_url, {"credential": "expired-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_4_unverified_google_email(self, mock_verify):
        """Test 4: Unverified Google email is rejected."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "unverified@gmail.com",
            "email_verified": False,
            "given_name": "Test",
            "family_name": "User",
            "sub": "sub-999",
        }

        response = self.client.post(self.google_url, {"credential": "mock-token-unverified"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Google account email is not verified", str(response.data))

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_5_existing_user_login(self, mock_verify):
        """Test 5: Existing user logging in with Google does not duplicate user."""
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "peter.parker@dailybugle.com",
            "email_verified": True,
            "given_name": "Peter",
            "family_name": "Parker",
            "picture": "https://lh3.googleusercontent.com/a/spidey.jpg",
            "sub": "google-sub-peter",
        }

        user_count_before = User.objects.count()
        response = self.client.post(self.google_url, {"credential": "mock-peter-token"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), user_count_before)
        self.assertEqual(response.data["user"]["id"], self.existing_user.id)
        self.assertEqual(response.data["user"]["username"], "peterparker")

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_6_new_user_creation(self, mock_verify):
        """Test 6: New user creation creates Django User and Profile with unusable password."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "gwen.stacy@earth65.org",
            "email_verified": True,
            "given_name": "Gwen",
            "family_name": "Stacy",
            "picture": "https://lh3.googleusercontent.com/a/gwen.jpg",
            "sub": "google-sub-gwen",
        }

        response = self.client.post(self.google_url, {"credential": "mock-gwen-token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        new_user = User.objects.filter(email="gwen.stacy@earth65.org").first()
        self.assertIsNotNone(new_user)
        self.assertEqual(new_user.first_name, "Gwen")
        self.assertEqual(new_user.last_name, "Stacy")
        self.assertFalse(new_user.has_usable_password())
        self.assertIsNotNone(new_user.profile)
        self.assertEqual(new_user.profile.get_profile_picture_url(), "https://lh3.googleusercontent.com/a/gwen.jpg")

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_7_duplicate_user_prevention(self, mock_verify):
        """Test 7: Multiple Google logins with the same email result in exactly 1 User."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "norman.osborn@oscorp.com",
            "email_verified": True,
            "given_name": "Norman",
            "family_name": "Osborn",
            "sub": "google-sub-norman",
        }

        # First login (creates user)
        res1 = self.client.post(self.google_url, {"credential": "norman-token-1"})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        user_id_1 = res1.data["user"]["id"]

        # Second login (authenticates same user)
        res2 = self.client.post(self.google_url, {"credential": "norman-token-2"})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        user_id_2 = res2.data["user"]["id"]

        self.assertEqual(user_id_1, user_id_2)
        self.assertEqual(User.objects.filter(email="norman.osborn@oscorp.com").count(), 1)

    @patch("apps.accounts.google_auth.id_token.verify_oauth2_token")
    def test_8_jwt_token_validity(self, mock_verify):
        """Test 8: SimpleJWT access token returned by Google auth is valid for API calls."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "otto.octavius@horizon.edu",
            "email_verified": True,
            "given_name": "Otto",
            "family_name": "Octavius",
            "sub": "google-sub-otto",
        }

        response = self.client.post(self.google_url, {"credential": "otto-token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        access_token_str = response.data["access"]
        # Verify access token is a valid SimpleJWT token
        token = AccessToken(access_token_str)
        self.assertEqual(int(token["user_id"]), response.data["user"]["id"])

        # Authenticate with this token against /api/accounts/me/
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token_str}")
        me_response = self.client.get(reverse("me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "otto.octavius@horizon.edu")

    def test_9_existing_password_login_still_works(self):
        """Test 9: Existing email/password login still works normally."""
        response = self.client.post(
            self.login_url,
            {"username": "peterparker", "password": "StrongPassword123!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "peterparker")

    def test_10_existing_logout_still_works(self):
        """Test 10: Existing logout blacklists the refresh token."""
        login_res = self.client.post(
            self.login_url,
            {"username": "peterparker", "password": "StrongPassword123!"},
        )
        access_token = login_res.data["access"]
        refresh_token = login_res.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_res = self.client.post(self.logout_url, {"refresh": refresh_token})
        self.assertEqual(logout_res.status_code, status.HTTP_205_RESET_CONTENT)

        # Refreshing with the blacklisted token should now fail
        refresh_res = self.client.post(reverse("token_refresh"), {"refresh": refresh_token})
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)
