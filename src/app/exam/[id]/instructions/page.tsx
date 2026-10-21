"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Maximize2, CheckCircle2, Clock, HelpCircle, ArrowLeft } from "lucide-react";

export default function ExamInstructionsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const sessionId = params.id;
  const [agreed, setAgreed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleStartExam = async () => {
    if (!agreed) return;
    setIsLaunching(true);

    try {
      if (document.documentElement && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Proceed even if fullscreen was blocked by browser policy
    }

    router.push(`/exam/${sessionId}/player`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Dark Navy Hero Header */}
      <header className="bg-brand-navy text-white px-6 py-6 sm:py-8 shadow-md">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Pre-Flight Integrity Gate
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Examination Instructions &amp; Rules
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Mock Test 1 - Grade 9 • 90 Minutes • 45 Questions • 180 Marks
            </p>
          </div>

          <Link
            href="/lobby"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Lobby
          </Link>
        </div>
      </header>

      {/* Main Instructions Card */}
      <main className="mx-auto max-w-3xl w-full px-4 py-8 flex-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Paper Structure */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-green" />
              1. Paper Structure &amp; Marking Scheme
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Section 1</span>
                <h3 className="font-bold text-slate-800 text-sm mt-0.5">Mental Ability</h3>
                <p className="text-xs text-slate-500 mt-1">20 Questions • 80 Marks</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Section 2</span>
                <h3 className="font-bold text-slate-800 text-sm mt-0.5">Mathematics</h3>
                <p className="text-xs text-slate-500 mt-1">10 Questions • 40 Marks</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Section 3</span>
                <h3 className="font-bold text-slate-800 text-sm mt-0.5">Natural Sciences</h3>
                <p className="text-xs text-slate-500 mt-1">15 Questions • 60 Marks</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Each question carries <strong>+4.0 marks</strong> for correct answers. There is{" "}
              <strong>no negative marking (0.0 marks deducted)</strong> for incorrect or unattempted
              responses.
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Browser Lockdown & Anticheat */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand-orange" />
              2. Integrity &amp; Browser Lockdown Rules
            </h2>
            <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-green mt-0.5 shrink-0" />
                <span>
                  <strong>Fullscreen Enforcement:</strong> The exam runs in full-screen mode. Exiting
                  fullscreen triggers an integrity violation logged to the examiner.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-green mt-0.5 shrink-0" />
                <span>
                  <strong>Tab &amp; App Tracking:</strong> Navigating away from this tab, pressing
                  Alt+Tab, or opening notifications will be recorded on the live proctor monitor.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-green mt-0.5 shrink-0" />
                <span>
                  <strong>Keyboard Interception:</strong> Developer tools keys (F12, Ctrl+Shift+I)
                  and copy/paste functions are disabled inside the exam player.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-green mt-0.5 shrink-0" />
                <span>
                  <strong>Automated Timer Lock:</strong> The server enforces a hard 90-minute
                  expiration. At <code>00:00:00</code>, your examination will automatically submit.
                </span>
              </li>
            </ul>
          </div>

          <hr className="border-slate-100" />

          {/* Candidate Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-normal">
                I have read and understood all the above instructions. I agree to abide by the
                examination integrity guidelines and accept that any suspicious behavior will be
                logged.
              </span>
            </label>
          </div>

          {/* Launch CTA */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleStartExam}
              disabled={!agreed || isLaunching}
              className={`flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white shadow-sm transition-all ${
                agreed && !isLaunching
                  ? "bg-brand-green hover:bg-brand-green-hover active:scale-95 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Maximize2 className="h-4 w-4" />
              {isLaunching ? "Launching Exam..." : "Start Test Now"}
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        OpenHall • Secure Examination Delivery Environment
      </footer>
    </div>
  );
}
