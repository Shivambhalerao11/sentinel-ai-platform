"""
Redis client module with resilient in-memory fallback.
Ensures zero runtime failure if Redis is unavailable or unconfigured.
"""
import logging
from typing import Any, Optional
from app.core.config import settings

logger = logging.getLogger("app.core.redis")


class MemoryCache:
    """Fallback in-memory key-value cache when Redis is unavailable."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def get(self, key: str) -> Optional[Any]:
        return self._store.get(key)

    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        self._store[key] = value
        return True

    def delete(self, key: str) -> bool:
        return self._store.pop(key, None) is not None

    def ping(self) -> bool:
        return True


class SentinelRedis:
    """Production Redis client wrapper with graceful fallback."""

    def __init__(self) -> None:
        self._client: Any = None
        self.is_connected: bool = False
        self._memory_fallback = MemoryCache()
        self._init_client()

    def _init_client(self) -> None:
        try:
            import redis
            url = settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0"
            kwargs: dict[str, Any] = {"socket_timeout": 3, "socket_connect_timeout": 3}
            if settings.REDIS_PASSWORD:
                kwargs["password"] = settings.REDIS_PASSWORD
            
            client = redis.Redis.from_url(url, **kwargs)
            client.ping()
            self._client = client
            self.is_connected = True
            logger.info(f"Successfully connected to Redis instance at {url}")
        except Exception as err:
            logger.warning(f"Redis connection unavailable ({err}). Operating with in-memory fallback cache.")
            self._client = self._memory_fallback
            self.is_connected = False

    def get(self, key: str) -> Optional[str]:
        try:
            val = self._client.get(key)
            if isinstance(val, bytes):
                return val.decode("utf-8")
            return val
        except Exception:
            return self._memory_fallback.get(key)

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        try:
            return bool(self._client.set(key, value, ex=ex))
        except Exception:
            return self._memory_fallback.set(key, value, ex=ex)

    def delete(self, key: str) -> bool:
        try:
            return bool(self._client.delete(key))
        except Exception:
            return self._memory_fallback.delete(key)


redis_client = SentinelRedis()
