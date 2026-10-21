"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";
import { CircularProgressGauge } from "@/components/exam/CircularProgressGauge";
import { QuestionPalette } from "@/components/exam/QuestionPalette";
import { ActionControlBar } from "@/components/exam/ActionControlBar";
import { SaveAttemptModal } from "@/components/exam/SaveAttemptModal";
import { SubmissionSpinner } from "@/components/exam/SubmissionSpinner";
import { useBrowserLockdown } from "@/lib/anticheat";
import { persistAttemptLocally, getLocalAttempts } from "@/lib/storage";
import { CandidateExamManifest, ItemStatus } from "@/lib/types";
import { Info, AlertTriangle, ShieldAlert, Maximize2, XCircle } from "lucide-react";
import Link from "next/link";

export default function ExamPlayerPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const sessionId = params.id;

  // Manifest and session state
  const [manifest, setManifest] = useState<CandidateExamManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active section & question navigation
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Candidate provisional selection for current question
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Persistent attempt statuses: Map<questionId, { optionId, status }>
  const [attempts, setAttempts] = useState<
    Record<string, { optionId: string | null; status: ItemStatus }>
  >({});

  // Guardrail Modal State
  const [guardrailTargetIndex, setGuardrailTargetIndex] = useState<number | null>(null);
  const [isGuardrailOpen, setIsGuardrailOpen] = useState(false);

  // Early submission confirm modal
  const [isEndTestModalOpen, setIsEndTestModalOpen] = useState(false);

  // Instructions popup modal
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // Server-authoritative timer countdown (seconds remaining)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5400);

  // Browser Lockdown with Real-Time Fullscreen Enforcement and 3-Strike Disqualification
  const {
    isFullscreenLocked,
    strikes,
    maxStrikes,
    isDisqualified,
    activeViolationModal,
    blockedKeyToast,
    reEnterFullscreen,
    dismissViolationModal,
  } = useBrowserLockdown({
    sessionId,
    enabled: !isSubmitting && !!manifest,
    maxStrikes: 3,
  });

  // 1. Fetch sanitized manifest on mount
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/manifest`);
        if (!res.ok) {
          throw new Error("failed to load exam session");
        }
        const data: CandidateExamManifest = await res.json();
        setManifest(data);

        // Merge initial server attempts with local IndexedDB cached attempts
        const localCached = await getLocalAttempts(sessionId);
        const merged = { ...data.initialAttempts, ...localCached };
        setAttempts(merged);

        // Calculate initial remaining seconds from server deadline
        const deadlineMs = new Date(data.deadline).getTime();
        const nowMs = Date.now();
        const diffSec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
        setRemainingSeconds(diffSec);

        setLoading(false);
      } catch (err) {
        console.error("exam load failed:", err);
      }
    }
    loadExam();
  }, [sessionId]);

  // Active Section & Question helpers
  const activeSection = manifest?.sections[currentSectionIndex] || null;
  const activeQuestion = activeSection?.questions[currentQuestionIndex] || null;

  // Sync provisional selection whenever active question changes
  useEffect(() => {
    if (activeQuestion) {
      const saved = attempts[activeQuestion.id];
      setSelectedOptionId(saved?.optionId ?? null);
    }
  }, [activeQuestion, attempts]);

  // 2. High-precision authoritative countdown loop
  useEffect(() => {
    if (!manifest || isSubmitting) return;

    const deadlineMs = new Date(manifest.deadline).getTime();

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const diff = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [manifest, isSubmitting]);

  // 3. Final Submission Handler
  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        router.push(`/exam/${sessionId}/results`);
      } else {
        router.push(`/exam/${sessionId}/results`);
      }
    } catch {
      router.push(`/exam/${sessionId}/results`);
    }
  }, [sessionId, isSubmitting, router]);

  // 4. Save and Next Handler
  const handleSaveAndNext = useCallback(async () => {
    if (!activeQuestion || !activeSection || isSubmitting) return;

    const qId = activeQuestion.id;
    const newStatus: ItemStatus = selectedOptionId ? "ATTEMPTED_SAVED" : "VISITED_UNANSWERED";

    // Optimistically update memory and IndexedDB
    setAttempts((prev) => ({
      ...prev,
      [qId]: { optionId: selectedOptionId, status: newStatus },
    }));
    await persistAttemptLocally(sessionId, qId, selectedOptionId, newStatus);

    // Debounced network dispatch
    fetch(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: qId,
        optionId: selectedOptionId,
        status: newStatus,
      }),
    }).catch(() => {});

    // Advance to next question or next section
    if (currentQuestionIndex < activeSection.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (manifest && currentSectionIndex < manifest.sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
  }, [
    activeQuestion,
    activeSection,
    selectedOptionId,
    sessionId,
    currentQuestionIndex,
    currentSectionIndex,
    manifest,
    isSubmitting,
  ]);

  // 5. Deselect Handler
  const handleDeselect = useCallback(() => {
    setSelectedOptionId(null);
  }, []);

  // 6. Skip Handler
  const handleSkip = useCallback(async () => {
    if (!activeQuestion || !activeSection) return;

    const qId = activeQuestion.id;
    const currentAttempt = attempts[qId];
    if (!currentAttempt || currentAttempt.status !== "ATTEMPTED_SAVED") {
      setAttempts((prev) => ({
        ...prev,
        [qId]: { optionId: null, status: "VISITED_UNANSWERED" },
      }));
      await persistAttemptLocally(sessionId, qId, null, "VISITED_UNANSWERED");
    }

    // Advance forward
    if (currentQuestionIndex < activeSection.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (manifest && currentSectionIndex < manifest.sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
  }, [activeQuestion, activeSection, attempts, sessionId, currentQuestionIndex, currentSectionIndex, manifest]);

  // 7. Palette Navigation with Guardrail Check
  const handlePaletteSelect = useCallback(
    (targetIndex: number) => {
      if (!activeQuestion) return;

      const saved = attempts[activeQuestion.id];
      const hasUncommittedChange =
        selectedOptionId !== null &&
        selectedOptionId !== (saved?.optionId ?? null);

      if (hasUncommittedChange) {
        setGuardrailTargetIndex(targetIndex);
        setIsGuardrailOpen(true);
      } else {
        setCurrentQuestionIndex(targetIndex);
      }
    },
    [activeQuestion, attempts, selectedOptionId]
  );

  // Guardrail Modal Confirm: Save provisional choice and jump
  const handleGuardrailConfirm = useCallback(async () => {
    if (!activeQuestion || guardrailTargetIndex === null) return;

    const qId = activeQuestion.id;
    setAttempts((prev) => ({
      ...prev,
      [qId]: { optionId: selectedOptionId, status: "ATTEMPTED_SAVED" },
    }));
    await persistAttemptLocally(sessionId, qId, selectedOptionId, "ATTEMPTED_SAVED");

    fetch(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: qId,
        optionId: selectedOptionId,
        status: "ATTEMPTED_SAVED",
      }),
    }).catch(() => {});

    setIsGuardrailOpen(false);
    setCurrentQuestionIndex(guardrailTargetIndex);
    setGuardrailTargetIndex(null);
  }, [activeQuestion, guardrailTargetIndex, selectedOptionId, sessionId]);

  // Guardrail Modal Cancel: Discard provisional choice and jump
  const handleGuardrailCancel = useCallback(() => {
    if (guardrailTargetIndex === null) return;
    setIsGuardrailOpen(false);
    setCurrentQuestionIndex(guardrailTargetIndex);
    setGuardrailTargetIndex(null);
  }, [guardrailTargetIndex]);

  // Section global question offset for numbered badges
  const sectionStartQuestionNumber = useMemo(() => {
    if (!manifest) return 1;
    let offset = 1;
    for (let i = 0; i < currentSectionIndex; i++) {
      offset += manifest.sections[i].questions.length;
    }
    return offset;
  }, [manifest, currentSectionIndex]);

  // Attempt statuses array for active section palette
  const activeSectionPaletteStatuses = useMemo(() => {
    if (!activeSection) return {};
    const res: Record<number, ItemStatus> = {};
    activeSection.questions.forEach((q, idx) => {
      res[idx] = attempts[q.id]?.status || "UNVISITED";
    });
    return res;
  }, [activeSection, attempts]);

  if (loading || !manifest || !activeSection || !activeQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="retro-window p-6 text-center max-w-xs w-full">
          <div className="retro-sunken bg-white p-4">
            <div className="retro-sunken-dark p-2 font-mono text-xs text-emerald-400 mb-3">
              initializing engine...
            </div>
            <span className="text-xs font-bold text-slate-700">loading examination manifest...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestionNumber = sectionStartQuestionNumber + currentQuestionIndex;
  const isLastQuestionInExam =
    currentSectionIndex === manifest.sections.length - 1 &&
    currentQuestionIndex === activeSection.questions.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-[#d8dde4] exam-viewport">
      {/* 1. Classic 3D Header Bar */}
      <header className="retro-titlebar sticky top-0 z-30 h-14 shadow-sm">
        {/* Left: Exam Title & Instructions trigger */}
        <div className="flex items-center gap-3">
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate max-w-xs sm:max-w-md">
            {manifest.title.toLowerCase()}
          </h1>
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="retro-btn hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-900"
          >
            <Info className="h-3 w-3 text-sky-700" />
            instructions
          </button>
        </div>

        {/* Center/Right: Countdown Timer & End Test CTA */}
        <div className="flex items-center gap-2 sm:gap-4">
          <CircularProgressGauge
            remainingSeconds={remainingSeconds}
            totalDurationSeconds={manifest.durationSeconds}
          />

          <button
            type="button"
            onClick={() => setIsEndTestModalOpen(true)}
            className="retro-btn-orange px-3.5 py-1.5 text-xs sm:text-sm font-black"
          >
            end test
          </button>
        </div>
      </header>

      {/* 2. Classic 3D Section Selector Tabs */}
      <nav className="border-b-2 border-b-slate-400 bg-slate-300 px-4 pt-2">
        <div className="mx-auto flex max-w-7xl items-end gap-1.5 overflow-x-auto">
          {manifest.sections.map((section, idx) => {
            const isActive = idx === currentSectionIndex;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setCurrentSectionIndex(idx);
                  setCurrentQuestionIndex(0);
                }}
                className={`whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm font-bold border-2 border-b-0 border-t-white border-l-white border-r-[#475569] ${
                  isActive
                    ? "bg-white text-slate-900 -mb-[2px] z-10 shadow-xs"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {section.title.toLowerCase()}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Main Player Viewport */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row gap-5 p-4 sm:p-6 pb-28 lg:pb-6">
        {/* LEFT COLUMN: Question Stem, Options, and Controls */}
        <div className="retro-window flex flex-1 flex-col justify-between overflow-hidden">
          {/* Question Viewport */}
          <div className="p-4 sm:p-6">
            {/* Question Index Badge & Section Indicator */}
            <div className="retro-panel flex items-center justify-between p-2.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="retro-btn bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-900">
                  question {currentQuestionNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  section: {activeSection.title.toLowerCase()}
                </span>
              </div>
              <span className="retro-sunken px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                marks: +4.0 / 0.0
              </span>
            </div>

            {/* Question Stem Text / Formula */}
            <div className="retro-sunken bg-white p-5 sm:p-6 mb-5">
              <div className="text-sm sm:text-base font-semibold leading-relaxed text-slate-900">
                <KaTeXRenderer content={activeQuestion.stem} />
              </div>

              {/* Optional Question Diagram Image */}
              {activeQuestion.diagramUrl && (
                <div className="retro-sunken mt-4 flex justify-center bg-slate-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeQuestion.diagramUrl}
                    alt={`diagram for question ${currentQuestionNumber}`}
                    className="max-h-72 w-auto object-contain"
                  />
                </div>
              )}
            </div>

            {/* Radio Choice Options */}
            <div className="space-y-2.5">
              {activeQuestion.options.map((option, optIdx) => {
                const isSelected = selectedOptionId === option.id;
                const letter = String.fromCharCode(97 + optIdx); // 'a', 'b', 'c', 'd'
                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer select-none rounded-md border transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-sky-100 via-sky-50 to-white border-sky-500 shadow-sm ring-1 ring-sky-500 font-bold"
                        : "retro-panel hover:bg-slate-100"
                    }`}
                  >
                    {/* 2005 Glossy Indicator Pill */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-black ${
                        isSelected ? "retro-btn-cyan" : "retro-btn"
                      }`}
                    >
                      {letter}
                    </div>

                    {/* Option Text / Formula */}
                    <div className="flex-1 text-xs sm:text-sm text-slate-900">
                      <KaTeXRenderer content={option.text} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Control Bar */}
          <ActionControlBar
            hasSelection={selectedOptionId !== null}
            onDeselect={handleDeselect}
            onSkip={handleSkip}
            onSaveAndNext={handleSaveAndNext}
            isLastQuestion={isLastQuestionInExam}
            disabled={isSubmitting}
          />
        </div>

        {/* RIGHT COLUMN: Question Palette Sidebar */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="retro-window p-4 sticky top-20">
            <QuestionPalette
              totalQuestions={activeSection.questions.length}
              currentIndex={currentQuestionIndex}
              attemptStatuses={activeSectionPaletteStatuses}
              onSelectQuestion={handlePaletteSelect}
              startIndex={sectionStartQuestionNumber}
            />

            {/* 2005 Legend */}
            <div className="retro-sunken bg-white p-3 mt-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 retro-btn-green rounded text-[9px] flex items-center justify-center font-black">✓</span>
                <span className="font-bold text-slate-800">attempted &amp; saved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 retro-btn-orange rounded text-[9px] flex items-center justify-center font-black">!</span>
                <span className="font-bold text-slate-800">visited (unanswered)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 retro-btn ring-2 ring-blue-600 rounded text-[9px] flex items-center justify-center font-black">●</span>
                <span className="font-bold text-slate-800">active current</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 retro-btn rounded text-[9px] flex items-center justify-center">○</span>
                <span className="font-semibold text-slate-700">unvisited</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Interstitial Guardrail Modal */}
      <SaveAttemptModal
        isOpen={isGuardrailOpen}
        onCancel={handleGuardrailCancel}
        onConfirm={handleGuardrailConfirm}
        onClose={() => setIsGuardrailOpen(false)}
      />

      {/* Submission Loading Overlay Spinner */}
      {isSubmitting && <SubmissionSpinner />}

      {/* Manual End Test Confirmation Modal */}
      {isEndTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="retro-window w-full max-w-sm overflow-hidden">
            <div className="retro-titlebar bg-gradient-to-r from-amber-700 to-amber-900">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-200" />
                <span className="text-xs font-bold tracking-wide">submit test?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEndTestModalOpen(false)}
                className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="retro-sunken bg-white p-3.5 text-xs text-slate-700 leading-relaxed mb-4">
                ready to turn in your test? you won&apos;t be able to change any answers after submitting.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEndTestModalOpen(false)}
                  className="retro-btn px-3.5 py-1 text-xs font-bold"
                >
                  keep working
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEndTestModalOpen(false);
                    handleAutoSubmit();
                  }}
                  className="retro-btn-orange px-4 py-1 text-xs font-black"
                >
                  yes, submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Popup Modal */}
      {isInstructionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="retro-window w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="retro-titlebar">
              <div className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-sky-200" />
                <span className="text-xs font-bold tracking-wide">test guidelines</span>
              </div>
              <button
                type="button"
                onClick={() => setIsInstructionsOpen(false)}
                className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="retro-sunken bg-white p-3.5 space-y-2 text-xs text-slate-700 leading-relaxed mb-3">
                <p>• <strong>sections:</strong> click subject tabs at the top to navigate between sections.</p>
                <p>• <strong>palette:</strong> click question numbers on the right to jump directly to any question.</p>
                <p>• <strong>save answers:</strong> click <strong>[save &amp; next]</strong> to record each answer.</p>
                <p>• <strong>lockdown:</strong> exiting fullscreen or alt-tabbing triggers an integrity strike (3 strikes = disqualified).</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsInstructionsOpen(false)}
                  className="retro-btn px-4 py-1 text-xs font-bold"
                >
                  got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Blocked Key Shortcut Warning Toast */}
      {blockedKeyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 retro-window p-2 bg-slate-900 text-amber-300 flex items-center gap-2 text-xs font-bold">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>{blockedKeyToast.toLowerCase()}</span>
        </div>
      )}

      {/* 2. Fullscreen Integrity Lockout Overlay */}
      {isFullscreenLocked && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 text-slate-900 select-none">
          <div className="retro-window max-w-sm w-full overflow-hidden">
            <div className="retro-titlebar bg-gradient-to-r from-red-800 to-red-950">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-300" />
                <span className="text-xs font-bold tracking-wide">
                  fullscreen required
                </span>
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="retro-sunken bg-white p-4 text-left mb-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  this test requires fullscreen mode. all questions are frozen until you restore fullscreen.
                </p>
                {strikes > 0 && (
                  <div className="mt-2.5 retro-panel bg-red-50 p-2 text-xs font-bold text-red-800 border-red-300">
                    strikes recorded: {strikes} of {maxStrikes}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={reEnterFullscreen}
                className="retro-btn-green w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                resume fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Strike Violation Warning Dialog */}
      {activeViolationModal && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 select-none">
          <div className="retro-window max-w-sm w-full overflow-hidden">
            <div className="retro-titlebar bg-gradient-to-r from-amber-700 to-red-800">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-300" />
                <span className="text-xs font-bold tracking-wide">
                  focus lost (strike {activeViolationModal.strike} of {maxStrikes})
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="retro-sunken bg-white p-3 text-xs text-slate-700 leading-relaxed mb-3">
                {activeViolationModal.message.toLowerCase()}
              </div>
              <div className="retro-panel bg-red-100 p-2 flex items-center justify-between text-xs font-bold text-red-900 border-red-300 mb-3">
                <span>violations:</span>
                <span className="font-mono text-sm">{activeViolationModal.strike} of {maxStrikes} strikes</span>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">
                accumulating 3 strikes will immediately submit and disqualify your test.
              </p>
              <button
                type="button"
                onClick={dismissViolationModal}
                className="retro-btn w-full py-1.5 text-xs font-bold hover:bg-slate-100"
              >
                return to test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Permanent Disqualification Lockout Screen */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none">
          <div className="retro-window max-w-sm w-full overflow-hidden">
            <div className="retro-titlebar bg-gradient-to-r from-red-900 to-black">
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-bold tracking-wider">
                  test disqualified
                </span>
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="retro-sunken bg-red-50 p-3.5 text-xs text-red-900 leading-relaxed mb-4 text-left">
                your test session was terminated after reaching 3 integrity strikes (tab switching or focus loss). your answers have been submitted.
              </div>
              <Link
                href={`/exam/${sessionId}/results`}
                className="retro-btn-orange w-full py-2 text-xs inline-block text-center font-bold"
              >
                view scorecard &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
