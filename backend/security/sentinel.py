import time
import os
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("security.sentinel")

# ── Threat Weights ───────────────────────────────────────────────────────────

THREAT_WEIGHTS = {
    "LOGIN_FAILED": 15,
    "ADMIN_LOGIN_FAILED": 35,
    "TOKEN_REUSE_DETECTED": 60,       # High probability of stolen session token
    "PROMPT_INJECTION_DETECTED": 25,  # Adversarial prompt injection / jailbreak
    "PROBE_PATH_TRAVERSAL": 40,       # ../ or etc/passwd probes
    "PROBE_SQLI": 40,                 # ' OR 1=1 or union select probes
    "RATE_LIMIT_EXCEEDED": 10,
}

QUARANTINE_THRESHOLD = 50   # 50 points = 15-minute quarantine
CRITICAL_THRESHOLD   = 100  # 100 points = 60-minute quarantine
WINDOW_SECONDS       = 15 * 60  # 15-minute sliding window

@dataclass
class ThreatEvent:
    event_type: str
    weight: int
    timestamp: float
    details: str = ""

@dataclass
class HostThreatRecord:
    events: List[ThreatEvent] = field(default_factory=list)
    quarantined_until: float = 0.0
    last_seen: float = 0.0


class ThreatSentinel:
    """
    Central Threat Sentinel for tracking behavioral security anomalies.
    Supports both distributed Redis cluster coordination and zero-dependency
    bounded in-memory fail-safe operation.
    """
    def __init__(self):
        self._hosts: Dict[str, HostThreatRecord] = {}
        self._redis_client = None
        self._init_redis()

    def _init_redis(self):
        """Optional Redis connection for multi-worker / multi-node deployments."""
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                self._redis_client = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=1.0)
                self._redis_client.ping()
                logger.info("[SENTINEL] Connected to Redis distributed threat cluster.")
            except Exception as e:
                logger.warning(f"[SENTINEL] Redis not available ({e}), falling back to in-memory sentinel.")
                self._redis_client = None

    def _cleanup_old_events(self, record: HostThreatRecord, now: float) -> None:
        """Prunes events outside the active sliding window."""
        cutoff = now - WINDOW_SECONDS
        record.events = [e for e in record.events if e.timestamp > cutoff]

    def record_event(self, ip: str, event_type: str, details: str = "") -> int:
        """
        Records an adversarial or suspicious event for an IP address.
        Returns the updated total threat score for that IP.
        """
        if not ip or ip in ("127.0.0.1", "localhost", "unknown"):
            return 0

        now = time.time()
        record = self._hosts.setdefault(ip, HostThreatRecord())
        record.last_seen = now
        self._cleanup_old_events(record, now)

        weight = THREAT_WEIGHTS.get(event_type, 10)
        record.events.append(ThreatEvent(event_type, weight, now, details))

        total_score = sum(e.weight for e in record.events)

        # Check for quarantine trigger
        if total_score >= CRITICAL_THRESHOLD:
            quarantine_duration = 3600  # 1 hour
            record.quarantined_until = max(record.quarantined_until, now + quarantine_duration)
            if self._redis_client:
                try:
                    self._redis_client.setex(f"sentinel:quarantine:{ip}", quarantine_duration, str(total_score))
                except Exception:
                    pass
            logger.critical(
                f"[SENTINEL_CRITICAL_QUARANTINE] IP {ip} quarantined for 1 hour. Score: {total_score}. Trigger: {event_type} - {details}"
            )
        elif total_score >= QUARANTINE_THRESHOLD:
            quarantine_duration = 900   # 15 minutes
            record.quarantined_until = max(record.quarantined_until, now + quarantine_duration)
            if self._redis_client:
                try:
                    self._redis_client.setex(f"sentinel:quarantine:{ip}", quarantine_duration, str(total_score))
                except Exception:
                    pass
            logger.warning(
                f"[SENTINEL_QUARANTINE] IP {ip} quarantined for 15 minutes. Score: {total_score}. Trigger: {event_type} - {details}"
            )

        return total_score

    def is_quarantined(self, ip: str) -> Tuple[bool, int]:
        """
        Checks if an IP is currently quarantined.
        Returns: (is_quarantined, remaining_seconds)
        """
        if not ip:
            return False, 0

        now = time.time()

        # Check Redis cluster first if available
        if self._redis_client:
            try:
                ttl = self._redis_client.ttl(f"sentinel:quarantine:{ip}")
                if ttl and ttl > 0:
                    return True, ttl
            except Exception:
                pass

        if ip not in self._hosts:
            return False, 0

        record = self._hosts[ip]
        if record.quarantined_until > now:
            remaining = int(record.quarantined_until - now)
            return True, remaining

        return False, 0

    def get_score(self, ip: str) -> int:
        """Returns the active threat score for an IP."""
        if not ip or ip not in self._hosts:
            return 0
        now = time.time()
        record = self._hosts[ip]
        self._cleanup_old_events(record, now)
        return sum(e.weight for e in record.events)

    def manual_unban(self, ip: str) -> bool:
        """Removes an IP from quarantine."""
        if self._redis_client:
            try:
                self._redis_client.delete(f"sentinel:quarantine:{ip}")
            except Exception:
                pass

        if ip in self._hosts:
            self._hosts[ip].quarantined_until = 0.0
            self._hosts[ip].events.clear()
            return True
        return False

    def get_threat_summary(self) -> dict:
        """Generates an operational threat summary for administrative auditing."""
        now = time.time()
        active_quarantines = []
        high_risk_hosts = []

        for ip, record in list(self._hosts.items()):
            self._cleanup_old_events(record, now)
            score = sum(e.weight for e in record.events)
            
            if record.quarantined_until > now:
                active_quarantines.append({
                    "ip": ip,
                    "remaining_seconds": int(record.quarantined_until - now),
                    "score": score,
                    "event_count": len(record.events)
                })
            elif score > 20:
                high_risk_hosts.append({
                    "ip": ip,
                    "score": score,
                    "event_count": len(record.events)
                })

        return {
            "total_tracked_hosts": len(self._hosts),
            "active_quarantines": active_quarantines,
            "high_risk_hosts": high_risk_hosts,
        }

# Global singleton instance
sentinel = ThreatSentinel()

