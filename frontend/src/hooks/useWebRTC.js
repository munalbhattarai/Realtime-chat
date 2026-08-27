/**
 * useWebRTC — Full WebRTC lifecycle hook for 1-to-1 video calling.
 *
 * States: idle → calling → connecting → connected → ended
 *         incoming → connecting → connected → ended
 *         (+ rejected, busy, failed)
 *
 * Uses the existing ChatWebSocket instance for signaling.
 * Audio/video is peer-to-peer via RTCPeerConnection.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getIceServers } from "../services/callApi";

/** How long to wait before auto-cancelling an unanswered call (ms). */
const RING_TIMEOUT_MS = 30_000;

/**
 * @param {object} opts
 * @param {React.MutableRefObject} opts.socketRef — ref to the ChatWebSocket instance
 * @param {number|string} opts.currentUserId
 */
export default function useWebRTC({ socketRef, currentUserId }) {
  // ── State ──────────────────────────────────────────────────────────
  const [callState, setCallState] = useState("idle");
  // idle | calling | incoming | connecting | connected | ended | rejected | busy | failed

  const [callId, setCallId] = useState(null);
  const [callConversationId, setCallConversationId] = useState(null);
  const [callerInfo, setCallerInfo] = useState(null); // { caller_id, caller_username }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  // ── Refs ────────────────────────────────────────────────────────────
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef("idle");
  const pendingCandidatesRef = useRef([]);
  const connectedTimestampRef = useRef(null);

  // Keep ref in sync with state (so callbacks see latest value)
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  // Prefetch dynamic ICE servers in background when hook mounts
  useEffect(() => {
    getIceServers().catch(() => {});
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────

  const sendSignal = useCallback(
    (type, data = {}) => {
      if (!socketRef?.current) return;
      socketRef.current.send({ type, ...data });
    },
    [socketRef],
  );

  /** Stop all local media tracks and release the camera/mic. */
  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  /** Close the RTCPeerConnection and clean up. */
  const closePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onnegotiationneeded = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  /** Clear ring/call timers. */
  const clearTimers = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  /** Full cleanup — returns everything to idle. */
  const cleanup = useCallback(
    (newState = "idle") => {
      clearTimers();
      stopLocalMedia();
      closePeerConnection();
      setCallState(newState);
      setCallId(null);
      setCallConversationId(null);
      setCallerInfo(null);
      setIsMuted(false);
      setIsCameraOff(false);
      setCallDuration(0);
      setErrorMessage(null);
      connectedTimestampRef.current = null;
    },
    [clearTimers, stopLocalMedia, closePeerConnection],
  );

  // ── Duration timer ──────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    connectedTimestampRef.current = Date.now();
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      if (connectedTimestampRef.current) {
        setCallDuration(Math.floor((Date.now() - connectedTimestampRef.current) / 1000));
      }
    }, 1000);
  }, []);

  // ── getUserMedia ────────────────────────────────────────────────────
  const acquireMedia = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Your browser does not support video calling.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Camera/microphone permission was denied. Please allow access and try again.");
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No camera or microphone found on this device.");
      }
      throw new Error(`Could not access camera/microphone: ${err.message}`);
    }
  }, []);

  // ── Create RTCPeerConnection ────────────────────────────────────────
  const createPeerConnection = useCallback(
    async (currentCallId, conversationId) => {
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({
        iceServers,
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("call.ice_candidate", {
            call_id: currentCallId,
            conversation_id: conversationId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "connected" || state === "completed") {
          setCallState("connected");
          startDurationTimer();
        } else if (state === "failed") {
          setErrorMessage("Connection failed. The other user may be behind a restrictive firewall.");
          sendSignal("call.end", {
            call_id: currentCallId,
            conversation_id: conversationId,
          });
          cleanup("failed");
        } else if (state === "disconnected") {
          // Might recover — wait briefly before treating as failure
          setTimeout(() => {
            if (peerConnectionRef.current?.iceConnectionState === "disconnected") {
              sendSignal("call.end", {
                call_id: currentCallId,
                conversation_id: conversationId,
              });
              cleanup("ended");
            }
          }, 5000);
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [sendSignal, cleanup, startDurationTimer],
  );

  // ── Initiate a call (caller side) ──────────────────────────────────
  const startCall = useCallback(
    async (conversationId) => {
      if (callStateRef.current !== "idle") return;

      // Check WebRTC support
      if (typeof RTCPeerConnection === "undefined") {
        setErrorMessage("Your browser does not support WebRTC video calls.");
        setCallState("failed");
        return;
      }

      const newCallId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setCallId(newCallId);
      setCallConversationId(conversationId);
      setCallState("calling");
      setErrorMessage(null);

      // Pre-warm ICE servers cache for caller
      getIceServers().catch(() => {});

      // Send invite through signaling
      sendSignal("call.invite", {
        call_id: newCallId,
        conversation_id: conversationId,
      });

      // Auto-cancel after timeout
      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "calling") {
          sendSignal("call.cancel", {
            call_id: newCallId,
            conversation_id: conversationId,
          });
          cleanup("ended");
          setErrorMessage("No answer — the call timed out.");
        }
      }, RING_TIMEOUT_MS);
    },
    [sendSignal, cleanup],
  );

  // ── Accept an incoming call (receiver side) ────────────────────────
  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== "incoming") return;

    const currentCallId = callIdRef.current;
    const conversationId = callConversationId;

    try {
      setCallState("connecting");
      clearTimers();

      // Acquire media first
      const stream = await acquireMedia();

      // Send accept signal
      sendSignal("call.accept", {
        call_id: currentCallId,
        conversation_id: conversationId,
      });

      // Create peer connection and add tracks
      const pc = await createPeerConnection(currentCallId, conversationId);
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // The caller will send the offer next — handled in onCallEvent
    } catch (err) {
      setErrorMessage(err.message);
      sendSignal("call.reject", {
        call_id: currentCallId,
        conversation_id: conversationId,
      });
      cleanup("failed");
    }
  }, [callConversationId, acquireMedia, sendSignal, createPeerConnection, cleanup, clearTimers]);

  // ── Reject an incoming call ────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (callStateRef.current !== "incoming") return;

    sendSignal("call.reject", {
      call_id: callIdRef.current,
      conversation_id: callConversationId,
    });
    cleanup("idle");
  }, [callConversationId, sendSignal, cleanup]);

  // ── End an active call ─────────────────────────────────────────────
  const endCall = useCallback(() => {
    const currentState = callStateRef.current;
    if (currentState === "idle" || currentState === "ended") return;

    const cid = callIdRef.current;
    const convId = callConversationId;

    if (currentState === "calling") {
      sendSignal("call.cancel", { call_id: cid, conversation_id: convId });
    } else {
      sendSignal("call.end", { call_id: cid, conversation_id: convId });
    }
    cleanup("ended");
  }, [callConversationId, sendSignal, cleanup]);

  // ── Media controls ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, []);

  // ── Handle incoming signaling events from WebSocket ────────────────
  const onCallEvent = useCallback(
    async (event) => {
      const { type, call_id, conversation_id } = event;

      switch (type) {
        case "call.invite": {
          // Incoming call from another user
          if (callStateRef.current !== "idle") {
            // We're busy — auto-reject
            sendSignal("call.busy", {
              call_id,
              conversation_id,
            });
            return;
          }
          setCallId(call_id);
          setCallConversationId(conversation_id);
          setCallerInfo({
            caller_id: event.caller_id,
            caller_username: event.caller_username,
          });
          setCallState("incoming");
          setErrorMessage(null);

          // Auto-reject after timeout
          ringTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current === "incoming" && callIdRef.current === call_id) {
              cleanup("idle");
            }
          }, RING_TIMEOUT_MS);
          break;
        }

        case "call.accept": {
          // Our call was accepted — we are the caller
          if (callStateRef.current !== "calling" || callIdRef.current !== call_id) return;
          clearTimers();

          try {
            setCallState("connecting");

            const stream = await acquireMedia();
            const pc = await createPeerConnection(call_id, conversation_id);
            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });

            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal("call.offer", {
              call_id,
              conversation_id,
              sdp: pc.localDescription.toJSON(),
            });
          } catch (err) {
            setErrorMessage(err.message);
            sendSignal("call.end", { call_id, conversation_id });
            cleanup("failed");
          }
          break;
        }

        case "call.reject": {
          if (callIdRef.current !== call_id) return;
          clearTimers();
          cleanup("rejected");
          break;
        }

        case "call.busy": {
          if (callIdRef.current !== call_id) return;
          clearTimers();
          cleanup("busy");
          break;
        }

        case "call.offer": {
          // We are the receiver — set remote description and send answer
          if (callIdRef.current !== call_id) return;
          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));

            // Flush any pending ICE candidates
            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal("call.answer", {
              call_id,
              conversation_id,
              sdp: pc.localDescription.toJSON(),
            });
          } catch (err) {
            setErrorMessage(`WebRTC error: ${err.message}`);
            sendSignal("call.end", { call_id, conversation_id });
            cleanup("failed");
          }
          break;
        }

        case "call.answer": {
          // We are the caller — set remote description
          if (callIdRef.current !== call_id) return;
          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));

            // Flush pending ICE candidates
            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];
          } catch (err) {
            setErrorMessage(`WebRTC error: ${err.message}`);
            cleanup("failed");
          }
          break;
        }

        case "call.ice_candidate": {
          if (callIdRef.current !== call_id) return;
          const pc = peerConnectionRef.current;

          if (!event.candidate) return;

          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(event.candidate));
            } catch (err) {
              console.warn("ICE candidate error:", err);
            }
          } else {
            // Buffer candidates until remote description is set
            pendingCandidatesRef.current.push(event.candidate);
          }
          break;
        }

        case "call.end": {
          if (callIdRef.current !== call_id) return;
          cleanup("ended");
          break;
        }

        case "call.cancel": {
          if (callIdRef.current !== call_id) return;
          cleanup("idle");
          break;
        }

        default:
          break;
      }
    },
    [sendSignal, cleanup, clearTimers, acquireMedia, createPeerConnection],
  );

  // ── Cleanup on unmount (tab close, navigation, etc.) ───────────────
  useEffect(() => {
    return () => {
      if (
        callStateRef.current !== "idle" &&
        callStateRef.current !== "ended" &&
        callStateRef.current !== "rejected" &&
        callStateRef.current !== "busy" &&
        callStateRef.current !== "failed"
      ) {
        // Try to notify the other side
        if (socketRef?.current && callIdRef.current) {
          const cid = callIdRef.current;
          const convId = callConversationId;
          if (callStateRef.current === "calling") {
            socketRef.current.send({
              type: "call.cancel",
              call_id: cid,
              conversation_id: convId,
            });
          } else {
            socketRef.current.send({
              type: "call.end",
              call_id: cid,
              conversation_id: convId,
            });
          }
        }
      }
      // Always clean up media regardless of state
      clearTimers();
      stopLocalMedia();
      closePeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── beforeunload handler (browser close/refresh) ───────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        callStateRef.current !== "idle" &&
        callStateRef.current !== "ended" &&
        socketRef?.current &&
        callIdRef.current
      ) {
        socketRef.current.send({
          type: "call.end",
          call_id: callIdRef.current,
          conversation_id: callConversationId,
        });
      }
      // Stop media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [callConversationId, socketRef]);

  return {
    // State
    callState,
    callId,
    callConversationId,
    callerInfo,
    isMuted,
    isCameraOff,
    callDuration,
    errorMessage,

    // Refs for video elements
    localVideoRef,
    remoteVideoRef,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    onCallEvent,
    cleanup,
  };
}
