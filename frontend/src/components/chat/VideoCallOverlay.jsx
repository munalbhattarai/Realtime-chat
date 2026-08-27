/**
 * VideoCallOverlay — Full-screen overlay for 1-to-1 video calling.
 *
 * Features:
 * - High-Definition uncropped video with smart ambient glow
 * - Floating, draggable PiP self-view (Desktop mouse + Mobile touch)
 * - View swapping (swap local & remote streams)
 * - Fit / Fill toggle (prevent zoom-in vs fill screen)
 * - Duration timer & HD connection indicator
 * - Call controls (Mute, Camera toggle, Fit mode, Swap view, End call)
 */
import { useEffect, useCallback, useRef, useState } from "react";
import "./VideoCall.css";

// ── SVG Icons ────────────────────────────────────────────────────────
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

const SwapIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
    <polyline points="7.5 19.79 7.5 14.6 3 12" />
    <polyline points="21 12 16.5 14.6 16.5 19.79" />
  </svg>
);

const AspectFitIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="12" x="3" y="6" rx="2" />
    <path d="M9 10h6" />
    <path d="M9 14h6" />
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
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onDismiss,
}) => {
  const mainVideoRef = useRef(null);
  const ambientVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const pipContainerRef = useRef(null);

  // States
  const [isSwapped, setIsSwapped] = useState(false);
  const [fitMode, setFitMode] = useState("contain"); // 'contain' (uncropped HD) | 'cover' (fill screen)
  const [pipPos, setPipPos] = useState(null); // { x, y }
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startPipX: 0, startPipY: 0, hasMoved: false });

  // Active main stream vs PiP stream based on swap state
  const mainStream = isSwapped ? localStream : remoteStream;
  const pipStream = isSwapped ? remoteStream : localStream;
  const isMainMuted = isSwapped; // local video should be muted, remote video should play audio
  const isPipMuted = !isSwapped; // local video in PiP should be muted

  // Attach stream to main video + ambient glow layer
  useEffect(() => {
    const mainEl = mainVideoRef.current;
    const ambientEl = ambientVideoRef.current;

    if (mainEl) {
      if (mainStream) {
        if (mainEl.srcObject !== mainStream) {
          mainEl.srcObject = mainStream;
        }
        mainEl.play().catch(() => {});
      } else {
        mainEl.srcObject = null;
      }
    }

    if (ambientEl) {
      if (mainStream) {
        if (ambientEl.srcObject !== mainStream) {
          ambientEl.srcObject = mainStream;
        }
        ambientEl.play().catch(() => {});
      } else {
        ambientEl.srcObject = null;
      }
    }
  }, [mainStream, callState]);

  // Attach stream to PiP video
  useEffect(() => {
    const pipEl = pipVideoRef.current;
    if (pipEl) {
      if (pipStream) {
        if (pipEl.srcObject !== pipStream) {
          pipEl.srcObject = pipStream;
        }
        pipEl.play().catch(() => {});
      } else {
        pipEl.srcObject = null;
      }
    }
  }, [pipStream, callState, isCameraOff]);

  // Reset drag position and swap state on call end/reset
  useEffect(() => {
    if (callState === "idle") {
      setPipPos(null);
      setIsSwapped(false);
      setIsDragging(false);
    }
  }, [callState]);

  // ── Draggable PiP Touch & Mouse Handlers ────────────────────────────
  const onDragStart = useCallback((clientX, clientY) => {
    const el = pipContainerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startPipX: rect.left,
      startPipY: rect.top,
      hasMoved: false,
    };
    setIsDragging(true);
  }, []);

  const onDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartRef.current.mouseX;
    const deltaY = clientY - dragStartRef.current.mouseY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    const pipWidth = pipContainerRef.current?.offsetWidth || 130;
    const pipHeight = pipContainerRef.current?.offsetHeight || 98;
    const margin = 12;

    const maxX = window.innerWidth - pipWidth - margin;
    const maxY = window.innerHeight - pipHeight - 80; // 80px space for bottom controls

    const newX = Math.max(margin, Math.min(maxX, dragStartRef.current.startPipX + deltaX));
    const newY = Math.max(margin, Math.min(maxY, dragStartRef.current.startPipY + deltaY));

    setPipPos({ x: newX, y: newY });
  }, [isDragging]);

  const onDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Magnetic snap to closest edge (left or right)
    if (pipPos) {
      const pipWidth = pipContainerRef.current?.offsetWidth || 130;
      const margin = 14;
      const midPoint = window.innerWidth / 2;
      const snappedX = pipPos.x + pipWidth / 2 < midPoint ? margin : window.innerWidth - pipWidth - margin;
      setPipPos((prev) => (prev ? { ...prev, x: snappedX } : null));
    }
  }, [isDragging, pipPos]);

  // Window-level move and end listeners while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => onDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => onDragEnd();
    const handleTouchMove = (e) => {
      if (e.touches?.[0]) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => onDragEnd();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  // Auto-dismiss ended/rejected/busy after 3.5 seconds
  useEffect(() => {
    if (callState === "ended" || callState === "rejected" || callState === "busy" || callState === "failed") {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 3500);
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

  const displayName = callerInfo?.caller_username || otherUserName || "Ally";
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
            <span className="vc-connecting-text">Establishing web connection…</span>
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
          {/* Top status bar: duration timer & HD indicator */}
          <div className="vc-top-bar">
            <div className="vc-duration">
              <span className="vc-dot" />
              <span className="vc-time">{formatDuration(callDuration)}</span>
            </div>
            <div className="vc-badge-hd">
              <span className="vc-hd-dot" />
              <span>1080p HD</span>
            </div>
          </div>

          {/* Ambient blurred backdrop video layer (eliminates black borders without zooming the subject) */}
          {mainStream && (
            <video
              ref={ambientVideoRef}
              autoPlay
              playsInline
              muted
              className="vc-ambient-glow"
              aria-hidden="true"
            />
          )}

          {/* Main uncropped HD video element */}
          <video
            ref={mainVideoRef}
            autoPlay
            playsInline
            muted={isMainMuted}
            className={`vc-main-video ${fitMode === "cover" ? "fit-cover" : "fit-contain"} ${mainStream ? "block" : "hidden"}`}
            style={isSwapped ? { transform: "scaleX(-1)" } : undefined}
          />

          {/* Placeholder when waiting for remote video */}
          {!mainStream && (
            <div className="vc-remote-placeholder">
              <div className="vc-avatar-large">
                <span>{avatarLetter}</span>
              </div>
              <span className="vc-remote-label">Connected • Video streaming…</span>
            </div>
          )}

          {/* Floating Draggable PiP Window */}
          <div
            ref={pipContainerRef}
            className={`vc-local-pip ${isDragging ? "is-dragging" : ""}`}
            style={
              pipPos
                ? {
                    left: `${pipPos.x}px`,
                    top: `${pipPos.y}px`,
                    bottom: "auto",
                    right: "auto",
                  }
                : undefined
            }
            onMouseDown={(e) => {
              if (e.button === 0) onDragStart(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches?.[0]) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            title="Drag to reposition • Click swap button to switch view"
          >
            {/* Grab handle indicator */}
            <div className="vc-pip-handle" />

            {/* Swap button */}
            <button
              className="vc-pip-swap-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsSwapped((prev) => !prev);
              }}
              title="Swap main & PiP views"
            >
              <SwapIcon size={14} />
            </button>

            {/* PiP video content */}
            {isCameraOff && !isSwapped ? (
              <div className="vc-local-off">
                <span>Camera Off</span>
              </div>
            ) : (
              <video
                ref={pipVideoRef}
                autoPlay
                playsInline
                muted={isPipMuted}
                className="w-full h-full object-cover"
                style={!isSwapped ? { transform: "scaleX(-1)" } : undefined}
              />
            )}
          </div>

          {/* Bottom Call Controls */}
          <div className="vc-controls">
            {/* Mute Mic */}
            <button
              className={`vc-ctrl-btn ${isMuted ? "active" : ""}`}
              onClick={onToggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </button>

            {/* Camera Toggle */}
            <button
              className={`vc-ctrl-btn ${isCameraOff ? "active" : ""}`}
              onClick={onToggleCamera}
              title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isCameraOff ? <VideoOffIcon /> : <VideoIcon />}
            </button>

            {/* Fit / Fill toggle (prevents zoom in vs fills screen) */}
            <button
              className={`vc-ctrl-btn ${fitMode === "cover" ? "active" : ""}`}
              onClick={() => setFitMode((prev) => (prev === "contain" ? "cover" : "contain"))}
              title={fitMode === "contain" ? "Fill Screen" : "Fit Full Video (No Zoom)"}
            >
              <AspectFitIcon />
            </button>

            {/* Swap Streams Toggle */}
            <button
              className={`vc-ctrl-btn ${isSwapped ? "active" : ""}`}
              onClick={() => setIsSwapped((prev) => !prev)}
              title="Swap Views (Self / Remote)"
            >
              <SwapIcon />
            </button>

            {/* End Call */}
            <button className="vc-btn vc-btn-end" onClick={onEnd} title="End Call">
              <PhoneOffIcon size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ended / Rejected / Busy / Failed ────────────────────
  const toastConfig = {
    ended: { title: "Call Ended", message: "The web call has ended.", icon: "info" },
    rejected: { title: "Call Declined", message: "The other user declined the call.", icon: "info" },
    busy: { title: "User Busy", message: "The other user is currently in another call.", icon: "info" },
    failed: {
      title: "Call Disconnected",
      message: errorMessage || "The media connection could not be established.",
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
