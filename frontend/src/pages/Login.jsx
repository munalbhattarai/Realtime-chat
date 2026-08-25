import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import SpideyLogo from "../components/common/SpideyLogo";

const Login = () => {
  const navigate = useNavigate();

  const {
    login,
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

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6 spidey-web-bg relative overflow-hidden font-sans">
      {/* Background glow decoration */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-red-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="rounded-3xl border border-red-900/40 bg-slate-950/80 p-6 sm:p-8 shadow-[0_0_40px_rgba(220,38,38,0.25)] backdrop-blur-xl">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-slate-900 ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <SpideyLogo size={38} className="sm:w-11 sm:h-11" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-blue-400 uppercase">
              Spidey-Chat
            </h1>
            <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Enter the Web-Verse
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{typeof error === "string" ? error : "Invalid username or password."}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
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
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="Enter your hero username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-blue-400 pl-1">
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
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-3.5 text-sm font-black tracking-wide text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="mt-8 text-center text-sm text-slate-400">
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