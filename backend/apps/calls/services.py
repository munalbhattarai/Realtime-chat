import logging
import os
import requests

logger = logging.getLogger(__name__)

DEFAULT_STUN_SERVERS = [
    {
        "urls": [
            "stun:stun.cloudflare.com:3478",
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
        ]
    }
]

CLOUDFLARE_TURN_URL_TEMPLATE = (
    "https://rtc.live.cloudflare.com/v1/turn/keys/{key_id}/credentials/generate-ice-servers"
)


def generate_turn_credentials(ttl=86400):
    """
    Generate temporary ICE server credentials via Cloudflare TURN API.
    Returns a dictionary with 'iceServers' and 'ttl' for frontend RTCPeerConnection.
    Never exposes backend secrets (API token or TURN key ID).
    """
    key_id = os.getenv("CLOUDFLARE_TURN_KEY_ID", "").strip()
    api_token = os.getenv("CLOUDFLARE_TURN_API_TOKEN", "").strip()

    if not key_id or not api_token:
        # Fallback to public STUN if Cloudflare TURN is not configured (e.g. local dev)
        return {
            "iceServers": DEFAULT_STUN_SERVERS,
            "ttl": ttl,
            "fallback": True,
        }

    url = CLOUDFLARE_TURN_URL_TEMPLATE.format(key_id=key_id)
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    payload = {"ttl": ttl}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code != 200:
            logger.warning(
                "Cloudflare TURN API returned status code %s",
                response.status_code,
            )
            return {
                "iceServers": DEFAULT_STUN_SERVERS,
                "ttl": ttl,
                "fallback": True,
            }

        data = response.json()
        raw_ice = data.get("iceServers")

        formatted_servers = []
        # Include default STUN servers alongside TURN servers
        formatted_servers.extend(DEFAULT_STUN_SERVERS)

        if isinstance(raw_ice, list):
            formatted_servers.extend(raw_ice)
        elif isinstance(raw_ice, dict):
            formatted_servers.append(raw_ice)

        return {
            "iceServers": formatted_servers,
            "ttl": ttl,
            "fallback": False,
        }
    except Exception as exc:
        logger.warning("Error contacting Cloudflare TURN API: %s", exc)
        return {
            "iceServers": DEFAULT_STUN_SERVERS,
            "ttl": ttl,
            "fallback": True,
        }
