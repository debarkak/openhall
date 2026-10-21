"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LogIn } from "lucide-react";

interface AuthStatusButtonProps {
  user?: {
    email: string;
    name: string;
    role: string;
  } | null;
}

export function AuthStatusButton({ user }: AuthStatusButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-800 inline-flex items-center gap-1 hover:bg-slate-100"
      >
        <LogIn className="h-3 w-3" />
        sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-800 inline-flex items-center gap-1 hover:bg-red-50 hover:text-red-800"
      title={`signed in as ${user.email} (${user.role.toLowerCase()})`}
    >
      <LogOut className="h-3 w-3" />
      sign out
    </button>
  );
}

export default AuthStatusButton;
