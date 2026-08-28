/**
 * GoogleAuthButton — Production-ready Google OAuth 2.0 / OpenID Connect button.
 *
 * Uses Google Identity Services (GIS).
 * Supports both VITE_GOOGLE_CLIENT_ID and dynamic backend fallback from settings.GOOGLE_CLIENT_ID.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getGoogleClientId } from "../../features/auth/authApi";

// Official Google "G" 4-color SVG icon
const GoogleGIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const STATIC_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const GoogleAuthButton = ({ onSuccess, onError, text = "Continue with Google", disabled = false }) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState(STATIC_GOOGLE_CLIENT_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const googleBtnContainerRef = useRef(null);

  // Fetch client ID from backend if not defined in frontend env
  useEffect(() => {
    if (clientId) return;

    let isMounted = true;
    getGoogleClientId().then((id) => {
      if (isMounted && id) {
        setClientId(id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        const err = "Google login did not return credentials.";
        setLocalError(err);
        onError?.(err);
        return;
      }

      setIsLoading(true);
      setLocalError(null);

      try {
        await onSuccess?.(response.credential);
      } catch (err) {
        const errorMsg =
          err?.response?.data?.detail ||
          err?.message ||
          "Google authentication failed. Please try again.";
        setLocalError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  // Load Google Identity Services script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-jssdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsScriptLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-jssdk";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.warn("Failed to load Google Identity Services SDK.");
    };
    document.body.appendChild(script);
  }, []);

  // Initialize GIS and render native hidden/overlay button
  useEffect(() => {
    if (!isScriptLoaded || !window.google?.accounts?.id || !clientId) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnContainerRef.current) {
        googleBtnContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 380,
        });
      }
    } catch (e) {
      console.warn("Error initializing Google Sign-In:", e);
    }
  }, [isScriptLoaded, clientId, handleCredentialResponse]);

  const handleCustomButtonClick = async () => {
    let activeClientId = clientId;

    if (!activeClientId) {
      setIsLoading(true);
      try {
        activeClientId = await getGoogleClientId();
        if (activeClientId) {
          setClientId(activeClientId);
        }
      } catch {
        // Handled below
      } finally {
        setIsLoading(false);
      }
    }

    if (!activeClientId) {
      const msg = "Google Client ID is not configured. Please set GOOGLE_CLIENT_ID on Render or VITE_GOOGLE_CLIENT_ID on Cloudflare Pages.";
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    if (!window.google?.accounts?.id) {
      const msg = "Google services are initializing. Please wait a moment.";
      setLocalError(msg);
      return;
    }

    setLocalError(null);
    try {
      // Trigger native Google Prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.info("Google Prompt not displayed:", notification.getNotDisplayedReason());
          const nativeBtn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
          if (nativeBtn) {
            nativeBtn.click();
          }
        } else if (notification.isSkippedMoment()) {
          console.info("Google Prompt skipped:", notification.getSkippedReason());
        }
      });
    } catch (err) {
      console.warn("Google prompt error:", err);
      const nativeBtn = googleBtnContainerRef.current?.querySelector('div[role="button"]');
      if (nativeBtn) {
        nativeBtn.click();
      }
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Hidden native container for Google renderButton fallback */}
      <div
        ref={googleBtnContainerRef}
        className="hidden"
        aria-hidden="true"
      />

      {/* Styled Spidey-Theme Google Button */}
      <button
        type="button"
        onClick={handleCustomButtonClick}
        disabled={disabled || isLoading}
        className="group relative flex w-full items-center justify-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-700/60 bg-slate-900/90 px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:border-red-500/50 hover:bg-slate-800/90 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500/20 border-t-red-500" />
            <span className="text-slate-300">Connecting to Google…</span>
          </div>
        ) : (
          <>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm transition-transform group-hover:scale-110">
              <GoogleGIcon size={16} />
            </div>
            <span className="tracking-wide text-slate-200 group-hover:text-white transition-colors">
              {text}
            </span>
          </>
        )}
      </button>

      {localError && (
        <p className="text-center text-xs font-semibold text-rose-400 animate-fadeIn">
          {localError}
        </p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
