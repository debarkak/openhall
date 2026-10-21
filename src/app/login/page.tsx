"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound, User, ArrowLeft, ShieldCheck, AlertTriangle, GraduationCap, Laptop } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeRole, setActiveRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If redirect query param is /studio, default active role to teacher
  useEffect(() => {
    if (redirectTarget.includes("studio") || redirectTarget.includes("proctor")) {
      setActiveRole("TEACHER");
    }
  }, [redirectTarget]);

  const handleFillCredentials = (role: "STUDENT" | "TEACHER") => {
    setActiveRole(role);
    setErrorMessage(null);
    if (role === "TEACHER") {
      setEmail("teacher@openhall.edu");
      setPassword("teacher123");
    } else {
      setEmail("student@openhall.edu");
      setPassword("student123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const destination = redirectTarget || data.redirectUrl || (data.user.role === "TEACHER" ? "/studio" : "/lobby");
        router.push(destination);
        router.refresh();
      } else {
        setErrorMessage(data.error || "invalid email or password. please try again.");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("network error during sign in. please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      {/* Header Plaque */}
      <div className="retro-sunken bg-white p-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          sign in to open<span className="text-emerald-700">hall</span>
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          enter your encrypted credentials to access the test hall or teacher studio.
        </p>
      </div>

      {/* Quick Preset Selector Buttons */}
      <div>
        <span className="block text-[10px] font-bold text-slate-700 mb-1.5">
          quick demo credentials (click to pre-fill):
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFillCredentials("STUDENT")}
            className={`retro-btn p-2 text-left text-xs font-bold flex items-center gap-2 ${
              activeRole === "STUDENT" ? "ring-2 ring-emerald-600 bg-emerald-50" : ""
            }`}
          >
            <GraduationCap className="h-4 w-4 text-emerald-800 shrink-0" />
            <div className="truncate">
              <span>student</span>
              <span className="block text-[9px] text-slate-500 font-normal font-mono truncate">
                student@openhall.edu
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleFillCredentials("TEACHER")}
            className={`retro-btn p-2 text-left text-xs font-bold flex items-center gap-2 ${
              activeRole === "TEACHER" ? "ring-2 ring-amber-600 bg-amber-50" : ""
            }`}
          >
            <Laptop className="h-4 w-4 text-amber-800 shrink-0" />
            <div className="truncate">
              <span>teacher</span>
              <span className="block text-[9px] text-slate-500 font-normal font-mono truncate">
                teacher@openhall.edu
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="retro-panel bg-red-100 border-red-400 p-2.5 text-xs font-bold text-red-950 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="retro-panel p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-600" />
            email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. student@openhall.edu"
            className="retro-field w-full text-xs p-2"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-slate-600" />
            password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="retro-field w-full text-xs p-2 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="retro-btn-green w-full py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 mt-2"
        >
          <ShieldCheck className="h-4 w-4" />
          {isLoading ? "authenticating credentials..." : "sign in"}
        </button>
      </form>

      {/* Encryption Note */}
      <div className="retro-sunken bg-slate-50 p-3 text-[10px] text-slate-600 space-y-1">
        <p>
          • <strong>password encryption:</strong> all user passwords are encrypted using salted scrypt key derivation (owasp approved).
        </p>
        <p>
          • <strong>session security:</strong> authenticated sessions use http-only signed cryptographic tokens to protect exam integrity.
        </p>
      </div>

      {/* Return link */}
      <div className="text-center pt-1">
        <Link
          href="/"
          className="retro-btn px-3 py-1 text-xs text-slate-700 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          return to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* 2005 Web 2.0 3D Window Frame */}
      <div className="retro-window w-full max-w-md overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-sky-200" />
            <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
              openhall — credentials &amp; encryption gate
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none">
              _
            </span>
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none">
              □
            </span>
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none text-red-700">
              ✕
            </span>
          </div>
        </div>

        {/* Content Body wrapped in Suspense for useSearchParams */}
        <Suspense fallback={
          <div className="p-8 text-center">
            <div className="retro-sunken-dark inline-block p-3 font-mono text-xs text-emerald-400">
              loading authentication gate...
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
