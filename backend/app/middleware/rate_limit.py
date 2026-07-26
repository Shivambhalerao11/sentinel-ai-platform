"""
Rate Limiting Middleware for Auth and OTP endpoints.
Prevents brute-force attacks and OTP spamming using sliding window tracking per IP / identifier.
"""
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self):
        # Key: (ip_or_identifier, action), Value: list of request timestamps
        self.requests: Dict[Tuple[str, str], List[float]] = defaultdict(list)

    def check_rate_limit(self, key: str, action: str, max_requests: int, window_seconds: int):
        now = time.time()
        bucket_key = (key, action)
        timestamps = self.requests[bucket_key]

        # Filter out timestamps outside window
        cutoff = now - window_seconds
        valid_timestamps = [t for t in timestamps if t > cutoff]
        self.requests[bucket_key] = valid_timestamps

        if len(valid_timestamps) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - valid_timestamps[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {action}. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        self.requests[bucket_key].append(now)


rate_limiter = RateLimiter()
