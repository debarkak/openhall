"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { Check, Info, AlertTriangle, X, ShieldAlert, Maximize2, XCircle } from "lucide-react";
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
          throw new Error("Failed to load exam session");
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
        console.error("Exam load failed:", err);
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
        // Fallback navigation
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
    // Retain existing saved attempt if already completed, else mark as visited unanswered
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
        // Trigger the Interstitial Guardrail Modal!
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

  // Section global question offset for numbered badges (e.g. Section 2 starts at Q21)
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
          <span className="text-sm font-semibold text-slate-600">Loading Examination...</span>
        </div>
      </div>
    );
  }

  const currentQuestionNumber = sectionStartQuestionNumber + currentQuestionIndex;
  const isLastQuestionInExam =
    currentSectionIndex === manifest.sections.length - 1 &&
    currentQuestionIndex === activeSection.questions.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-exam-bg exam-viewport">
      {/* 1. Header Bar (Top Widescreen & Portrait) */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm">
        {/* Left: Exam Title & Instructions trigger */}
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            {manifest.title}
          </h1>
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-brand-cyan hover:underline"
          >
            <Info className="h-3.5 w-3.5" />
            Read Instructions
          </button>
        </div>

        {/* Center/Right: Countdown Timer & End Test CTA */}
        <div className="flex items-center gap-3 sm:gap-6">
          <CircularProgressGauge
            remainingSeconds={remainingSeconds}
            totalDurationSeconds={manifest.durationSeconds}
          />

          <button
            type="button"
            onClick={() => setIsEndTestModalOpen(true)}
            className="rounded-md bg-brand-orange px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-orange-hover active:scale-95 transition"
          >
            End Test
          </button>
        </div>
      </header>

      {/* 2. Section Selector Tabs */}
      <nav className="border-b border-slate-200 bg-brand-cyan-subtle px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
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
                className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-brand-cyan-tab text-slate-900 border border-brand-cyan-border shadow-xs"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Main Player Viewport: 2-Column Split in Landscape (>= 1024px) / Stacked in Portrait */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row gap-6 p-4 sm:p-6 pb-28 lg:pb-6">
        {/* LEFT COLUMN: Question Stem, Options, and Controls (68% width on desktop) */}
        <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Question Viewport */}
          <div className="p-5 sm:p-7">
            {/* Question Index Badge & Section Indicator */}
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green-text">
                  Q{currentQuestionNumber}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Section: {activeSection.title}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                +4.0 / 0.0 marks
              </span>
            </div>

            {/* Question Stem Text / Formula */}
            <div className="text-base sm:text-lg font-medium leading-relaxed text-slate-900 mb-6">
              <KaTeXRenderer content={activeQuestion.stem} />
            </div>

            {/* Optional Question Diagram Image */}
            {activeQuestion.diagramUrl && (
              <div className="my-5 flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeQuestion.diagramUrl}
                  alt={`Diagram for Question ${currentQuestionNumber}`}
                  className="max-h-72 w-auto object-contain rounded-lg shadow-xs"
                />
              </div>
            )}

            {/* Radio Choice Options */}
            <div className="space-y-3 pt-2">
              {activeQuestion.options.map((option, optIdx) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`flex items-center gap-3.5 rounded-xl border p-3.5 sm:p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-brand-cyan bg-cyan-50/40 ring-1 ring-brand-cyan shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Circular Radio Indicator */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                        isSelected
                          ? "bg-brand-cyan text-white shadow-xs"
                          : "border-2 border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>

                    {/* Option Text / Formula */}
                    <div className="flex-1 text-sm sm:text-base font-medium text-slate-800">
                      <KaTeXRenderer content={option.text} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Control Bar (Embedded in card footer on Desktop) */}
          <ActionControlBar
            hasSelection={selectedOptionId !== null}
            onDeselect={handleDeselect}
            onSkip={handleSkip}
            onSaveAndNext={handleSaveAndNext}
            isLastQuestion={isLastQuestionInExam}
            disabled={isSubmitting}
          />
        </div>

        {/* RIGHT COLUMN: Question Palette Sidebar (32% width on desktop) */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sticky top-24">
            <QuestionPalette
              totalQuestions={activeSection.questions.length}
              currentIndex={currentQuestionIndex}
              attemptStatuses={activeSectionPaletteStatuses}
              onSelectQuestion={handlePaletteSelect}
              startIndex={sectionStartQuestionNumber}
            />

            {/* Legend */}
            <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-brand-green-light border border-brand-green-border" />
                <span>Attempted &amp; Saved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-white border-2 border-brand-green" />
                <span>Current Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-exam-badge border border-exam-border" />
                <span>Unvisited / Unanswered</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Interstitial Guardrail Modal (Frame 30) */}
      <SaveAttemptModal
        isOpen={isGuardrailOpen}
        onCancel={handleGuardrailCancel}
        onConfirm={handleGuardrailConfirm}
        onClose={() => setIsGuardrailOpen(false)}
      />

      {/* Submission Loading Overlay Spinner (Frame 26) */}
      {isSubmitting && <SubmissionSpinner />}

      {/* Manual End Test Confirmation Modal */}
      {isEndTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-brand-orange mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm Submission</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to end and submit your examination? Once submitted, you cannot
              revisit or modify any answers.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEndTestModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEndTestModalOpen(false);
                  handleAutoSubmit();
                }}
                className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-orange-hover"
              >
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Blocked Key Shortcut Warning Toast */}
      {blockedKeyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{blockedKeyToast}</span>
        </div>
      )}

      {/* 2. Fullscreen Integrity Lockout Overlay */}
      {isFullscreenLocked && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-white text-center select-none">
          <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-slate-900 p-8 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-white">
              Fullscreen Lockdown Enforced
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              OpenHall assessment mode requires Fullscreen. All question viewing and input are frozen until you return to Fullscreen mode.
            </p>
            {strikes > 0 && (
              <div className="mt-4 rounded-lg bg-red-950/60 border border-red-500/30 p-2.5 text-xs text-red-300 font-semibold">
                Recorded Integrity Violations: <strong>{strikes} / {maxStrikes} Strikes</strong>
              </div>
            )}
            <button
              type="button"
              onClick={reEnterFullscreen}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-green-hover active:scale-95 transition cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
              Enter Fullscreen &amp; Unlock Exam
            </button>
          </div>
        </div>
      )}

      {/* 3. Strike Violation Warning Dialog */}
      {activeViolationModal && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border-2 border-red-500 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-extrabold uppercase tracking-tight">
                Integrity Alert: Window Focus Lost
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {activeViolationModal.message}
            </p>
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center justify-between text-xs font-bold text-red-800">
              <span>Violation Strike Recorded:</span>
              <span className="font-mono text-sm">{activeViolationModal.strike} of {maxStrikes}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Accumulating 3 strikes will permanently terminate and disqualify your exam attempt.
            </p>
            <button
              type="button"
              onClick={dismissViolationModal}
              className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            >
              I Acknowledge — Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* 4. Permanent Disqualification Lockout Screen */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-white text-center select-none">
          <div className="max-w-md w-full rounded-2xl border-2 border-red-600 bg-red-950/90 p-8 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white uppercase">
              Exam Disqualified
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-red-200 leading-relaxed">
              Your examination session has been terminated due to exceeding the maximum allowed integrity violations (3 Strikes). All test interactions are locked and logged in the telemetry audit.
            </p>
            <div className="mt-6">
              <Link
                href={`/exam/${sessionId}/results`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-red-950 hover:bg-slate-100 transition"
              >
                View Incident Scorecard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Popup Modal */}
      {isInstructionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Exam Instructions</h3>
              <button
                type="button"
                onClick={() => setIsInstructionsOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>• Total Questions: <strong>45 questions</strong> across 3 sections.</p>
              <p>• Marking: <strong>+4.0 marks</strong> per correct question. No negative penalty.</p>
              <p>• Navigation: You may freely switch between sections using the tabs at the top.</p>
              <p>• Saving: Use <strong>[Save &amp; Next]</strong> to commit your selection.</p>
              <p>• Integrity: Exiting fullscreen or switching applications is recorded in telemetry.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstructionsOpen(false)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Blocked Key Shortcut Warning Toast */}
      {blockedKeyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{blockedKeyToast}</span>
        </div>
      )}

      {/* 2. Fullscreen Integrity Lockout Overlay */}
      {isFullscreenLocked && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-white text-center select-none">
          <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-slate-900 p-8 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-white">
              Fullscreen Lockdown Enforced
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              OpenHall assessment mode requires Fullscreen. All question viewing and input are frozen until you return to Fullscreen mode.
            </p>
            {strikes > 0 && (
              <div className="mt-4 rounded-lg bg-red-950/60 border border-red-500/30 p-2.5 text-xs text-red-300 font-semibold">
                Recorded Integrity Violations: <strong>{strikes} / {maxStrikes} Strikes</strong>
              </div>
            )}
            <button
              type="button"
              onClick={reEnterFullscreen}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-green-hover active:scale-95 transition cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
              Enter Fullscreen &amp; Unlock Exam
            </button>
          </div>
        </div>
      )}

      {/* 3. Strike Violation Warning Dialog */}
      {activeViolationModal && !isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border-2 border-red-500 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-extrabold uppercase tracking-tight">
                Integrity Alert: Window Focus Lost
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {activeViolationModal.message}
            </p>
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center justify-between text-xs font-bold text-red-800">
              <span>Violation Strike Recorded:</span>
              <span className="font-mono text-sm">{activeViolationModal.strike} of {maxStrikes}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Accumulating 3 strikes will permanently terminate and disqualify your exam attempt.
            </p>
            <button
              type="button"
              onClick={dismissViolationModal}
              className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            >
              I Acknowledge — Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* 4. Permanent Disqualification Lockout Screen */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-white text-center select-none">
          <div className="max-w-md w-full rounded-2xl border-2 border-red-600 bg-red-950/90 p-8 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white uppercase">
              Exam Disqualified
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-red-200 leading-relaxed">
              Your examination session has been terminated due to exceeding the maximum allowed integrity violations (3 Strikes). All test interactions are locked and logged in the telemetry audit.
            </p>
            <div className="mt-6">
              <Link
                href={`/exam/${sessionId}/results`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-red-950 hover:bg-slate-100 transition"
              >
                View Incident Scorecard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
