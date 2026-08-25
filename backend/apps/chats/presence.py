import os

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis import ConnectionPool, Redis


# ── Redis connection pool (one pool, shared across the process) ──────
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_REDIS_HOST = os.getenv("REDIS_HOST", "").strip()
_REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

_pool = None
if _REDIS_URL:
    try:
        _pool = ConnectionPool.from_url(_REDIS_URL, decode_responses=True, max_connections=20)
    except Exception as e:
        print(f"Redis pool init warning from REDIS_URL: {e}")
elif _REDIS_HOST:
    try:
        _pool = ConnectionPool(
            host=_REDIS_HOST,
            port=_REDIS_PORT,
            decode_responses=True,
            max_connections=20,
        )
    except Exception as e:
        print(f"Redis pool init warning from host/port: {e}")

PRESENCE_KEY_PREFIX = "chat:presence:"
PRESENCE_TTL = 60 * 60

# In-memory fallback presence dictionary if Redis is unavailable
_in_memory_presence = {}


def get_redis():
    """Return a Redis client backed by the shared connection pool, or None if unavailable."""
    if _pool is None:
        return None
    try:
        return Redis(connection_pool=_pool)
    except Exception:
        return None


def user_presence_key(user_id):
    return f"{PRESENCE_KEY_PREFIX}{user_id}"


def add_connection(user_id):
    redis = get_redis()
    if redis:
        try:
            key = user_presence_key(user_id)
            connection_count = redis.incr(key)
            redis.expire(
                key,
                PRESENCE_TTL,
            )
            return connection_count
        except Exception as e:
            print(f"Redis add_connection error: {e}")

    _in_memory_presence[user_id] = _in_memory_presence.get(user_id, 0) + 1
    return _in_memory_presence[user_id]


def remove_connection(user_id):
    redis = get_redis()
    if redis:
        try:
            key = user_presence_key(user_id)
            connection_count = redis.decr(key)
            if connection_count <= 0:
                redis.delete(key)
                return 0
            return connection_count
        except Exception as e:
            print(f"Redis remove_connection error: {e}")

    count = _in_memory_presence.get(user_id, 0) - 1
    if count <= 0:
        _in_memory_presence.pop(user_id, None)
        return 0
    _in_memory_presence[user_id] = count
    return count


def is_user_online(user_id):
    redis = get_redis()
    if redis:
        try:
            return bool(
                redis.exists(
                    user_presence_key(user_id)
                )
            )
        except Exception as e:
            print(f"Redis is_user_online error: {e}")

    return user_id in _in_memory_presence


def broadcast_presence(
    conversation_id,
    user_id,
    username,
    online,
):
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
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
    except Exception as e:
        print(f"Presence broadcast warning: {e}")