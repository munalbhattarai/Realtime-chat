import os

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis import ConnectionPool, Redis


# ── Redis connection pool (one pool, shared across the process) ──────
_REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
_REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

_pool = ConnectionPool(
    host=_REDIS_HOST,
    port=_REDIS_PORT,
    decode_responses=True,
    max_connections=20,
)

PRESENCE_KEY_PREFIX = "chat:presence:"
PRESENCE_TTL = 60 * 60


def get_redis():
    """Return a Redis client backed by the shared connection pool."""
    return Redis(connection_pool=_pool)


def user_presence_key(user_id):
    return f"{PRESENCE_KEY_PREFIX}{user_id}"


def add_connection(user_id):
    redis = get_redis()

    key = user_presence_key(user_id)

    connection_count = redis.incr(key)

    redis.expire(
        key,
        PRESENCE_TTL,
    )

    return connection_count


def remove_connection(user_id):
    redis = get_redis()

    key = user_presence_key(user_id)

    connection_count = redis.decr(key)

    if connection_count <= 0:
        redis.delete(key)
        return 0

    return connection_count


def is_user_online(user_id):
    redis = get_redis()

    return bool(
        redis.exists(
            user_presence_key(user_id)
        )
    )


def broadcast_presence(
    conversation_id,
    user_id,
    username,
    online,
):
    channel_layer = get_channel_layer()

    async_to_sync(
        channel_layer.group_send
    )(
        f"conversation_{conversation_id}",
        {
            "type": "presence.update",
            "user_id": user_id,
            "username": username,
            "online": online,
        },
    )