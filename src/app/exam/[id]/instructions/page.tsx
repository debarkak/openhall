"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Maximize2, CheckCircle2, Clock, ArrowLeft, FileText } from "lucide-react";

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
    <div className="min-h-screen flex flex-col justify-between pb-8">
      {/* Classic 3D Desktop Header */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-200" />
          <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white">
            Pre-Flight Candidate Instructions &amp; Rules
          </span>
        </div>

        <Link
          href="/lobby"
          className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-900 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Lobby
        </Link>
      </header>

      {/* Main Instructions Window */}
      <main className="mx-auto max-w-3xl w-full px-4 py-6 flex-1">
        <div className="retro-window p-4 sm:p-6 space-y-5">
          {/* Paper Structure */}
          <div>
            <div className="retro-titlebar mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-300" />
                1. Structure &amp; Marking Rules
              </span>
            </div>

            <div className="retro-sunken bg-white p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                <div className="retro-panel p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Section 1</span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">Mental Ability</h3>
                  <p className="text-[11px] text-slate-600 mt-1">20 Questions • 80 Marks</p>
                </div>
                <div className="retro-panel p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Section 2</span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">Mathematics</h3>
                  <p className="text-[11px] text-slate-600 mt-1">10 Questions • 40 Marks</p>
                </div>
                <div className="retro-panel p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Section 3</span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">Natural Sciences</h3>
                  <p className="text-[11px] text-slate-600 mt-1">15 Questions • 60 Marks</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Each question carries <strong>+4.0 marks</strong> for correct answers. There is{" "}
                <strong>no negative penalty (0.0 marks deducted)</strong> for incorrect answers.
              </p>
            </div>
          </div>

          {/* Browser Lockdown & Anticheat */}
          <div>
            <div className="retro-titlebar mb-3 bg-gradient-to-r from-red-800 to-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                2. Device Lockdown &amp; Anti-Cheat Security
              </span>
            </div>

            <div className="retro-sunken bg-white p-4">
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-emerald-100 text-emerald-900 px-1 py-0.2 text-[9px] font-black shrink-0">
                    OK
                  </span>
                  <span>
                    <strong>Fullscreen Enforcement:</strong> Fullscreen mode is enforced. Exiting fullscreen immediately freezes questions behind a lockout screen.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-amber-100 text-amber-900 px-1 py-0.2 text-[9px] font-black shrink-0">
                    WARN
                  </span>
                  <span>
                    <strong>Tab &amp; App Tracking:</strong> Navigating away from this tab or pressing Alt+Tab incurs violation strikes. Accumulating 3 strikes terminates and disqualifies the exam.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-red-100 text-red-900 px-1 py-0.2 text-[9px] font-black shrink-0">
                    TRAP
                  </span>
                  <span>
                    <strong>Keyboard Traps:</strong> Developer keys (F12, Ctrl+Shift+I), View Source (Ctrl+U), and copy/paste are disabled.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Candidate Confirmation Checkbox */}
          <div className="retro-panel p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-none border-2 border-slate-700 text-emerald-700"
              />
              <span className="text-xs font-bold text-slate-800 leading-normal">
                I have read and understood all the above rules. I agree to abide by the examination
                integrity policy and accept full device lockdown.
              </span>
            </label>
          </div>

          {/* Launch CTA */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleStartExam}
              disabled={!agreed || isLaunching}
              className={`retro-btn-green px-8 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2 ${
                !agreed || isLaunching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Maximize2 className="h-4 w-4" />
              {isLaunching ? "Entering Fullscreen..." : "Start Examination Now"}
            </button>
          </div>
        </div>
      </main>

      <footer className="py-2 text-center text-[11px] font-semibold text-slate-600">
        OpenHall Examination Platform • Zero-Trust Hardware Delivery
      </footer>
    </div>
  );
}
