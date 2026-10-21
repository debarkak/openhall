"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Maximize2, Clock, ArrowLeft, FileText } from "lucide-react";
import { CandidateExamManifest } from "@/lib/types";

export default function ExamInstructionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [manifest, setManifest] = useState<CandidateExamManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/manifest?preview=1`);
        if (res.ok) {
          const data: CandidateExamManifest = await res.json();
          setManifest(data);
        } else if (res.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else if (res.status === 403) {
          router.replace("/lobby");
        } else {
          setLoadError("could not load this exam session. return to the lobby and try again.");
        }
      } catch (err) {
        console.error("failed to load manifest:", err);
        setLoadError("could not connect to the exam server. check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, [sessionId, router]);

  const handleStartExam = async () => {
    if (!agreed) return;
    setIsLaunching(true);

    try {
      if (document.documentElement && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser user gesture fallback
    }

    router.push(`/exam/${sessionId}/player`);
  };

  const totalQuestions = manifest?.sections.reduce((acc, s) => acc + s.questions.length, 0) || 0;
  const durationMins = manifest ? Math.floor(manifest.durationSeconds / 60) : 90;

  return (
    <div className="min-h-screen flex flex-col justify-between pb-8">
      {/* Top Header */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-200" />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
            {manifest?.title.toLowerCase() || "exam instructions"}
          </span>
        </div>

        <Link
          href="/lobby"
          className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-900 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          lobby
        </Link>
      </header>

      {/* Main Instructions Window */}
      <main className="mx-auto max-w-2xl w-full px-4 py-6 flex-1">
        <div className="retro-window p-4 sm:p-5 space-y-4">
          {/* Exam Summary */}
          <div>
            <div className="retro-titlebar mb-2.5 py-1">
              <span className="text-xs font-bold tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-300" />
                exam details
              </span>
            </div>

            <div className="retro-sunken bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                <h1 className="text-base font-bold text-slate-900">
                  {manifest?.title.toLowerCase() || (loading ? "loading..." : "exam")}
                </h1>
                <span className="retro-sunken px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                  {durationMins} mins • {totalQuestions} questions
                </span>
              </div>

              {loadError ? (
                <div className="retro-panel mb-3 bg-red-50 border-red-300 p-3 text-xs text-red-900">
                  {loadError}
                  <Link href="/lobby" className="ml-2 font-bold underline">return to lobby</Link>
                </div>
              ) : null}

              {manifest && manifest.sections.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {manifest.sections.map((sec, idx) => (
                    <div key={sec.id} className="retro-panel p-2.5">
                      <span className="text-[10px] font-bold text-slate-500">section {idx + 1}</span>
                      <h3 className="font-bold text-slate-900 text-xs mt-0.5 truncate">{sec.title.toLowerCase()}</h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">{sec.questions.length} question{sec.questions.length === 1 ? "" : "s"}</p>
                    </div>
                  ))}
                </div>
              )}

              {manifest && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  default marking: <strong>+{manifest.positiveMarks}</strong> for a correct answer and <strong>-{manifest.negativePenalty}</strong> for an incorrect answer. individual questions may use different values.
                </p>
              )}
            </div>
          </div>

          {/* Rules & Lockdown */}
          <div>
            <div className="retro-titlebar mb-2.5 py-1 bg-gradient-to-r from-red-800 to-slate-800">
              <span className="text-xs font-bold tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                test rules &amp; anti-cheat
              </span>
            </div>

            <div className="retro-sunken bg-white p-4">
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-emerald-100 text-emerald-950 px-1 py-0.2 text-[9px] font-bold shrink-0">
                    1
                  </span>
                  <span>
                    <strong>fullscreen required:</strong> the test runs in fullscreen. if you exit fullscreen, questions freeze until you re-enter.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-amber-100 text-amber-950 px-1 py-0.2 text-[9px] font-bold shrink-0">
                    2
                  </span>
                  <span>
                    <strong>no alt-tabbing:</strong> switching tabs or applications gives you a violation strike. <strong>3 strikes = test terminated &amp; disqualified.</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="retro-btn bg-red-100 text-red-950 px-1 py-0.2 text-[9px] font-bold shrink-0">
                    3
                  </span>
                  <span>
                    <strong>no devtools or copy-paste:</strong> f12, inspect element, right-click, and clipboard shortcuts are blocked.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Candidate Checkbox */}
          <div className="retro-panel p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-none border-2 border-slate-700 text-emerald-700"
              />
              <span className="text-xs font-bold text-slate-800 leading-normal">
                i understand the rules and agree to take this test under fullscreen lockdown.
              </span>
            </label>
          </div>

          {/* Launch CTA */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleStartExam}
              disabled={!manifest || !agreed || isLaunching}
              className={`retro-btn-green px-6 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 ${
                !manifest || !agreed || isLaunching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Maximize2 className="h-4 w-4" />
              {isLaunching ? "entering fullscreen..." : "start test"}
            </button>
          </div>
        </div>
      </main>

      <footer className="py-2 text-center text-[11px] font-semibold text-slate-500">
        openhall • self-hosted examination system
      </footer>
    </div>
  );
}
