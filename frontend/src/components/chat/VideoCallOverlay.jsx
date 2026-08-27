/**
 * VideoCallOverlay — Full-screen overlay for 1-to-1 video calling.
 *
 * Renders on top of the chat when callState !== "idle".
 * Contains: incoming call screen, calling screen, connected view,
 * error/rejected/busy toasts, and call controls.
 */
import { useEffect, useCallback } from "react";
import "./VideoCall.css";

// ── SVG icon helpers ─────────────────────────────────────────────────
const PhoneIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const PhoneOffIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67" />
    <path d="M8.09 9.91A16 16 0 0 1 5.47 6.5L4.2 7.77a2 2 0 0 1-2.11.45 12.84 12.84 0 0 1-.7-2.81A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91z" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const MicIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VideoIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ── Helper: format duration ──────────────────────────────────────────
function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ── Component ────────────────────────────────────────────────────────
const VideoCallOverlay = ({
  callState,
  callerInfo,
  otherUserName,
  isMuted,
  isCameraOff,
  callDuration,
  errorMessage,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onDismiss,
}) => {
  // Auto-dismiss ended/rejected/busy after 3 seconds
  useEffect(() => {
    if (callState === "ended" || callState === "rejected" || callState === "busy" || callState === "failed") {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [callState, onDismiss]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (callState === "incoming") {
          onReject?.();
        } else if (
          callState === "calling" ||
          callState === "connecting" ||
          callState === "connected"
        ) {
          onEnd?.();
        } else {
          onDismiss?.();
        }
      }
    },
    [callState, onReject, onEnd, onDismiss],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (callState === "idle") return null;

  const displayName = callerInfo?.caller_username || otherUserName || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // ── Incoming call ───────────────────────────────────────
  if (callState === "incoming") {
    return (
      <div className="vc-overlay" role="dialog" aria-label="Incoming video call">
        <div className="vc-signal-card">
          <div className="vc-avatar-ring ringing">
            <span className="vc-avatar-letter">{avatarLetter}</span>
          </div>
          <span className="vc-label">Incoming Video Call</span>
          <span className="vc-username">{displayName}</span>
          <span className="vc-status">
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "vcDotPulse 1s infinite" }} />
            Waiting for your response…
          </span>
          <div className="vc-actions">
            <button className="vc-btn vc-btn-reject" onClick={onReject} title="Reject call">
              <PhoneOffIcon size={26} />
            </button>
            <button className="vc-btn vc-btn-accept" onClick={onAccept} title="Accept call">
              <PhoneIcon size={26} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Calling (waiting for answer) ────────────────────────
  if (callState === "calling") {
    return (
      <div className="vc-overlay" role="dialog" aria-label="Calling">
        <div className="vc-signal-card">
          <div className="vc-avatar-ring calling">
            <span className="vc-avatar-letter">{avatarLetter}</span>
          </div>
          <span className="vc-label">Video Calling</span>
          <span className="vc-username">{displayName}</span>
          <span className="vc-status">
            <div className="vc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            Ringing…
          </span>
          <div className="vc-actions">
            <button className="vc-btn vc-btn-cancel" onClick={onEnd} title="Cancel call">
              <PhoneOffIcon size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting (WebRTC handshake in progress) ───────────
  if (callState === "connecting") {
    return (
      <div className="vc-overlay" role="dialog" aria-label="Connecting">
        <div className="vc-signal-card">
          <div className="vc-connecting">
            <div className="vc-spinner" />
            <span className="vc-connecting-text">Establishing connection…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected (active call) ─────────────────────────────
  if (callState === "connected") {
    return (
      <div className="vc-overlay" role="dialog" aria-label="Video call in progress">
        <div className="vc-connected">
          {/* Duration badge */}
          <div className="vc-duration">
            <span className="vc-dot" />
            <span className="vc-time">{formatDuration(callDuration)}</span>
          </div>

          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vc-remote-video"
            style={{ display: remoteVideoRef?.current?.srcObject ? "block" : "none" }}
          />

          {/* Remote placeholder when no video */}
          {!remoteVideoRef?.current?.srcObject && (
            <div className="vc-remote-placeholder">
              <div className="vc-avatar-large">
                <span>{avatarLetter}</span>
              </div>
              <span className="vc-remote-label">Camera off</span>
            </div>
          )}

          {/* Local video PiP */}
          <div className="vc-local-pip">
            {isCameraOff ? (
              <div className="vc-local-off">
                <span>You</span>
              </div>
            ) : (
              <video ref={localVideoRef} autoPlay playsInline muted />
            )}
          </div>

          {/* Controls */}
          <div className="vc-controls">
            <button
              className={`vc-ctrl-btn ${isMuted ? "active" : ""}`}
              onClick={onToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </button>
            <button
              className={`vc-ctrl-btn ${isCameraOff ? "active" : ""}`}
              onClick={onToggleCamera}
              title={isCameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {isCameraOff ? <VideoOffIcon /> : <VideoIcon />}
            </button>
            <button className="vc-btn vc-btn-end" onClick={onEnd} title="End call">
              <PhoneOffIcon size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ended / Rejected / Busy / Failed ────────────────────
  const toastConfig = {
    ended: { title: "Call Ended", message: "The call has ended.", icon: "info" },
    rejected: { title: "Call Rejected", message: "The other user declined the call.", icon: "info" },
    busy: { title: "User Busy", message: "The other user is currently in another call.", icon: "info" },
    failed: {
      title: "Call Failed",
      message: errorMessage || "The connection could not be established.",
      icon: "error",
    },
  };

  const toast = toastConfig[callState];
  if (!toast) return null;

  return (
    <div className="vc-overlay" role="alert">
      <div className="vc-toast">
        <div className={`vc-toast-icon ${toast.icon}`}>
          {toast.icon === "error" ? <PhoneOffIcon size={24} /> : <PhoneIcon size={24} />}
        </div>
        <span className="vc-toast-title">{toast.title}</span>
        <span className="vc-toast-msg">{toast.message}</span>
        <button className="vc-toast-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
