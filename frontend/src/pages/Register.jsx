import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import SpideyLogo from "../components/common/SpideyLogo";

const Register = () => {
  const navigate = useNavigate();

  const {
    register,
    isLoading,
    error,
  } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirmation: "",
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
      await register(formData);

      navigate("/login", {
        replace: true,
      });
    } catch {
      // Error is already stored in Redux.
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6 py-8 sm:py-10 spidey-web-bg relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-red-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-auto">
        <div className="rounded-3xl border border-red-900/40 bg-slate-950/80 p-6 sm:p-8 shadow-[0_0_40px_rgba(220,38,38,0.25)] backdrop-blur-xl">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-slate-900 ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <SpideyLogo size={38} className="sm:w-11 sm:h-11" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-blue-400 uppercase">
              Join Web-Verse
            </h1>
            <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Become a Spidey-Chat Ally
            </p>
          </div>

          {error && (
            <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-300">
              <div className="flex items-center gap-2 font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>Please fix the following errors:</span>
              </div>
              <ul className="list-disc pl-6 space-y-1 text-xs text-red-300 font-medium">
                {typeof error === "string" ? (
                  <li>{error}</li>
                ) : (
                  Object.entries(error).map(([field, messages]) => (
                    <li key={field}>
                      <strong className="capitalize">{field}:</strong> {Array.isArray(messages) ? messages.join(", ") : messages}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
                  First name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                  placeholder="Peter"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="last_name" className="text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
                  Last name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                  placeholder="Parker"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-blue-400 pl-1">
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
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="spidey123"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-blue-400 pl-1">
                Hero Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                placeholder="spidey@web-verse.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password_confirmation" className="text-xs font-bold uppercase tracking-wider text-red-400 pl-1">
                  Confirm password
                </label>
                <input
                  id="password_confirmation"
                  name="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  minLength={8}
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-3.5 text-sm font-black tracking-wide text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span>Spinning New Account...</span>
                </div>
              ) : (
                "CREATE WEB ACCOUNT"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already a Web-Verse ally?{" "}
            <Link to="/login" className="font-bold text-red-400 hover:text-red-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Register;