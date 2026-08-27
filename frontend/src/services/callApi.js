import api from "./api";

// Fallback public STUN configuration if backend / Cloudflare is unreachable
const DEFAULT_FALLBACK_STUN = [
  {
    urls: [
      "stun:stun.cloudflare.com:3478",
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
  },
];

// In-memory cache for dynamic ICE server credentials (never in localStorage)
let cachedIceServers = null;
let cacheExpiresAt = 0;
let inflightPromise = null;

/**
 * Fetch dynamic ICE servers (Cloudflare TURN + STUN) from the backend with in-memory caching.
 * @param {boolean} forceRefresh - If true, bypasses the cache and fetches fresh credentials.
 * @returns {Promise<Array<RTCIceServer>>}
 */
export async function getIceServers(forceRefresh = false) {
  const now = Date.now();

  // Return cached credentials if valid (with 5-minute safety buffer before TTL expiry)
  if (!forceRefresh && cachedIceServers && cacheExpiresAt - now > 5 * 60 * 1000) {
    return cachedIceServers;
  }

  // Deduplicate concurrent requests
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const response = await api.get("/calls/turn-credentials/");
      const data = response.data;

      let servers = [];
      if (Array.isArray(data?.iceServers)) {
        servers = data.iceServers;
      } else if (data?.iceServers && typeof data.iceServers === "object") {
        servers = [data.iceServers];
      }

      if (servers.length > 0) {
        cachedIceServers = servers;
        const ttlSeconds = typeof data.ttl === "number" ? data.ttl : 86400;
        cacheExpiresAt = Date.now() + ttlSeconds * 1000;
        return cachedIceServers;
      }
    } catch (err) {
      console.warn("Could not fetch Cloudflare TURN credentials, falling back to STUN:", err?.message || err);
    } finally {
      inflightPromise = null;
    }

    // Return existing cache if present or default fallback STUN
    return cachedIceServers || DEFAULT_FALLBACK_STUN;
  })();

  return inflightPromise;
}

/**
 * Clear the in-memory ICE server cache (e.g. on logout).
 */
export function clearIceServersCache() {
  cachedIceServers = null;
  cacheExpiresAt = 0;
  inflightPromise = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:logout", clearIceServersCache);
}

