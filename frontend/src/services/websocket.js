/**
 * ChatWebSocket — resilient WebSocket wrapper with:
 *  • Automatic reconnection (exponential backoff, 1 s → 30 s cap)
 *  • Message queue — buffers sends while disconnected, flushes on reconnect
 *  • Clean lifecycle (connect / disconnect / destroy)
 */

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 20;

export class ChatWebSocket {
  constructor({
    conversationId,
    token,
    onMessage,
    onOpen,
    onClose,
    onError,
    onReconnecting,
  }) {
    this.conversationId = conversationId;
    this.token = token;

    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.onReconnecting = onReconnecting;

    this.socket = null;
    this._destroyed = false;
    this._reconnectAttempt = 0;
    this._reconnectTimer = null;
    this._messageQueue = [];
    this._wasConnected = false;
  }

  /* ── public API ─────────────────────────────────────── */

  connect() {
    if (this._destroyed) return;

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this._createSocket();
  }

  send(data) {
    if (this._destroyed) return false;

    // If the socket is open, send immediately
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      this.socket.send(JSON.stringify(data));
      return true;
    }

    // Otherwise queue the message for when we reconnect
    this._messageQueue.push(data);
    return true; // return true — the message WILL be sent
  }

  disconnect() {
    this._destroyed = true;
    this._clearReconnectTimer();
    this._messageQueue = [];

    if (this.socket) {
      this.socket.onclose = null; // prevent reconnect logic from firing
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected() {
    return (
      this.socket?.readyState === WebSocket.OPEN
    );
  }

  /* ── internals ──────────────────────────────────────── */

  _createSocket() {
    const protocol =
      window.location.protocol === "https:"
        ? "wss"
        : "ws";

    const wsHost =
      import.meta.env.VITE_WS_HOST ||
      "127.0.0.1:8000";

    const url =
      `${protocol}://${wsHost}` +
      `/ws/chat/${this.conversationId}/` +
      `?token=${encodeURIComponent(this.token)}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this._reconnectAttempt = 0;
      this._wasConnected = true;
      this._flushQueue();
      this.onOpen?.();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(data);
      } catch (error) {
        this.onError?.(error);
      }
    };

    this.socket.onerror = (error) => {
      this.onError?.(error);
    };

    this.socket.onclose = (event) => {
      this.socket = null;
      this.onClose?.(event);

      // Only auto-reconnect if we haven't been explicitly destroyed
      if (!this._destroyed) {
        this._scheduleReconnect();
      }
    };
  }

  _scheduleReconnect() {
    if (this._destroyed) return;
    if (this._reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return;

    this._reconnectAttempt++;

    // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this._reconnectAttempt - 1),
      RECONNECT_MAX_MS,
    );

    this.onReconnecting?.(this._reconnectAttempt, delay);

    this._reconnectTimer = setTimeout(() => {
      if (!this._destroyed) {
        this._createSocket();
      }
    }, delay);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  _flushQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this._messageQueue.length > 0) {
      const data = this._messageQueue.shift();
      this.socket.send(JSON.stringify(data));
    }
  }
}
