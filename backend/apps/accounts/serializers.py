from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Profile
from .services import upload_profile_picture


User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        return obj.get_profile_picture_url()

    class Meta:
        model = Profile
        fields = [
            "bio",
            "profile_picture",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this email already exists.",
            )
        ],
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    password_confirmation = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirmation",
            "first_name",
            "last_name",
        ]

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError({
                "password_confirmation": "Passwords do not match."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("password_confirmation")

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        Profile.objects.create(user=user)

        return user


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "profile": ProfileSerializer(
                self.user.profile
            ).data,
        }

        return data


class MeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)

    # Used for multipart/form-data
    bio = serializers.CharField(
        required=False,
        write_only=True,
    )

    profile_picture = serializers.ImageField(
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "profile",
            "bio",
            "profile_picture",
        ]

        read_only_fields = [
            "id",
            "username",
            "email",
        ]

    def update(self, instance, validated_data):
        # Get nested profile data from JSON
        profile_data = validated_data.pop("profile", {})

        # Get direct profile fields from multipart/form-data
        bio = validated_data.pop("bio", None)
        profile_picture = validated_data.pop("profile_picture", None)

        # Update User fields
        instance.first_name = validated_data.get(
            "first_name",
            instance.first_name,
        )

        instance.last_name = validated_data.get(
            "last_name",
            instance.last_name,
        )

        instance.save()

        # Update Profile
        profile = instance.profile

        if "bio" in profile_data:
            profile.bio = profile_data["bio"]

        # Multipart values take precedence
        if bio is not None:
            profile.bio = bio

        # Upload profile picture to Cloudinary (or local fallback)
        if profile_picture is not None:
            url = upload_profile_picture(profile_picture)
            profile.profile_picture = url
        elif "profile_picture" in profile_data:
            url = upload_profile_picture(profile_data["profile_picture"])
            profile.profile_picture = url

        profile.save()
        instance.refresh_from_db()

        return instance



class UserSearchSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "profile",
        ]
