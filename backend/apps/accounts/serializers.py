from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "display_name", "email", "is_staff", "is_email_verified"]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "display_name", "password"]

    def validate_username(self, value: str) -> str:
        username = value.strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return username

    def create(self, validated_data: dict) -> User:
        user = User.objects.create_user(
            username=validated_data["username"],
            email="",
            password=validated_data["password"],
        )
        if validated_data.get("display_name"):
            user.display_name = validated_data["display_name"]
            user.save(update_fields=["display_name"])
        return user