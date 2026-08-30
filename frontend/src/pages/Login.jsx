import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import SpideyLogo from "../components/common/SpideyLogo";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";

const Login = () => {
  const navigate = useNavigate();

  const {
    login,
    loginWithGoogle,
    isLoading,
    error,
  } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login(formData);
      navigate("/chat", {
        replace: true,
      });
    } catch {
      // Error is already stored in Redux.
    }
  };

  const handleGoogleSuccess = async (credential) => {
    try {
      await loginWithGoogle(credential);
      navigate("/chat", {
        replace: true,
      });
    } catch {
      // Error is already stored in Redux.
    }
  };

  return (
    <main className="relative flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center p-3 sm:p-6 py-6 sm:py-10 spidey-web-bg font-sans">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] h-[50vw] w-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] h-[50vw] w-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-600/15 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md m-auto">
        <div className="rounded-2xl sm:rounded-3xl border border-red-900/40 bg-slate-950/90 p-4 sm:p-7 shadow-[0_0_40px_rgba(220,38,38,0.25)] backdrop-blur-xl">
          {/* Header */}
          <div className="mb-4 sm:mb-5 text-center">
            <div className="mx-auto mb-2 sm:mb-3 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-slate-900 ring-2 sm:ring-3 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <SpideyLogo size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-blue-400 uppercase">
              MB_chat
            </h1>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
              Enter the Web-Verse
            </p>
          </div>

          {/* Validation Errors */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl sm:rounded-2xl border border-red-500/40 bg-red-950/40 px-3.5 py-2.5 text-xs sm:text-sm text-red-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{typeof error === "string" ? error : "Invalid username or password."}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <div className="mb-3.5 sm:mb-4">
            <GoogleAuthButton
              onSuccess={handleGoogleSuccess}
              text="Continue with Google"
            />
          </div>

          {/* Divider */}
          <div className="relative my-3.5 sm:my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative bg-slate-950/95 px-3 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Or with Hero Credentials
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            <div className="space-y-1">
              <label htmlFor="username" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
                Hero Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="Enter your hero username"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 pl-1">
                Web Key (Password)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3.5 sm:mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-black tracking-wider text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span>Connecting to Web-Net...</span>
                </div>
              ) : (
                "CONNECT TO WEB-NET"
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <p className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-slate-400">
            Need a hero account?{" "}
            <Link to="/register" className="font-bold text-red-400 hover:text-red-300 transition">
              Spin New Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;