"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";
import { CircularProgressGauge } from "@/components/exam/CircularProgressGauge";
import { QuestionPalette } from "@/components/exam/QuestionPalette";
import { ActionControlBar } from "@/components/exam/ActionControlBar";
import { SaveAttemptModal } from "@/components/exam/SaveAttemptModal";
import { SubmissionSpinner } from "@/components/exam/SubmissionSpinner";
import { useBrowserLockdown } from "@/lib/anticheat";
import {
  countOfflineAttempts,
  discardOfflineQueue,
  flushOfflineQueue,
  getLocalAttempts,
  persistAttemptLocally,
  queueOfflineAttempt,
} from "@/lib/storage";
import { AttemptSubmissionPayload, CandidateExamManifest, ItemStatus } from "@/lib/types";
import { Info, AlertTriangle, ShieldAlert, Maximize2, XCircle } from "lucide-react";
import Link from "next/link";

interface QuestionNavigationTarget {
  sectionIndex: number;
  questionIndex: number;
}

export default function ExamPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  // Manifest and session state
  const [manifest, setManifest] = useState<CandidateExamManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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
  const [guardrailTarget, setGuardrailTarget] = useState<QuestionNavigationTarget | null>(null);
  const [isGuardrailOpen, setIsGuardrailOpen] = useState(false);

  // Early submission confirm modal
  const [isEndTestModalOpen, setIsEndTestModalOpen] = useState(false);

  // Instructions popup modal
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // Server-authoritative timer countdown (seconds remaining)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5400);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncRevision, setSyncRevision] = useState(0);
  const syncInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingSavesRef = useRef(new Set<Promise<void>>());

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
    initialStrikes: manifest?.integrityStrikes ?? 0,
    maxStrikes: 3,
  });

  const syncAttemptToServer = useCallback((payload: AttemptSubmissionPayload) => {
    const sync = async () => {
      if (!navigator.onLine) {
        await queueOfflineAttempt(payload);
        if (mountedRef.current) {
          setHasPendingSync(true);
          setSyncRevision((revision) => revision + 1);
        }
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`/api/sessions/${payload.sessionId}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (response.ok) return;

        await queueOfflineAttempt(payload);
        if (mountedRef.current) {
          setHasPendingSync(true);
          setSyncRevision((revision) => revision + 1);
        }
      } catch {
        await queueOfflineAttempt(payload);
        if (mountedRef.current) {
          setHasPendingSync(true);
          setSyncRevision((revision) => revision + 1);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const task = sync();
    pendingSavesRef.current.add(task);
    void task.finally(() => pendingSavesRef.current.delete(task));
    return task;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !manifest || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);

    const synchronizeQueuedAttempts = async () => {
      let remaining = 0;
      try {
        const queuedBeforeSync = await countOfflineAttempts(sessionId);
        if (queuedBeforeSync === 0) {
          if (mountedRef.current) setHasPendingSync(false);
          return;
        }

        if (mountedRef.current) setHasPendingSync(true);
        await flushOfflineQueue(async (payload) => {
          try {
            const response = await fetch(`/api/sessions/${payload.sessionId}/attempt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            return response.ok;
          } catch {
            return false;
          }
        }, sessionId);

        remaining = await countOfflineAttempts(sessionId);
        if (mountedRef.current) setHasPendingSync(remaining > 0);
      } finally {
        syncInFlightRef.current = false;
        if (mountedRef.current) setIsSyncing(false);
      }

      if (remaining > 0 && navigator.onLine && mountedRef.current) {
        window.setTimeout(() => {
          if (mountedRef.current) setSyncRevision((revision) => revision + 1);
        }, 15000);
      }
    };

    void synchronizeQueuedAttempts();
  }, [isOnline, manifest, sessionId, syncRevision]);

  // 1. Fetch sanitized manifest on mount
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/manifest`);
        if (!res.ok) {
          if (res.status === 401) {
            router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
            return;
          }

          const error = await res.json().catch(() => ({}));
          if (res.status === 403 && error.error === "This exam session is no longer active.") {
            router.replace(`/exam/${sessionId}/results`);
            return;
          }

          if (res.status === 403) {
            router.replace("/lobby");
            return;
          }

          throw new Error(error.error || "could not load this exam session");
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

      } catch (err) {
        console.error("exam load failed:", err);
        setLoadError(err instanceof Error ? err.message : "could not load this exam session");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [sessionId, router]);

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

  // 2. Final Submission Handler
  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setSubmissionError(null);
    setIsSubmitting(true);
    let unsyncedAnswerCount = 0;

    try {
      if (activeQuestion && selectedOptionId) {
        const finalAttempt: AttemptSubmissionPayload = {
          sessionId,
          questionId: activeQuestion.id,
          optionId: selectedOptionId,
          status: "ATTEMPTED_SAVED",
          timestamp: new Date().toISOString(),
        };
        setAttempts((current) => ({
          ...current,
          [activeQuestion.id]: { optionId: selectedOptionId, status: "ATTEMPTED_SAVED" },
        }));
        await persistAttemptLocally(sessionId, activeQuestion.id, selectedOptionId, "ATTEMPTED_SAVED");
        await syncAttemptToServer(finalAttempt);
      }

      await Promise.all(Array.from(pendingSavesRef.current));
      await flushOfflineQueue(async (payload) => {
        try {
          const response = await fetch(`/api/sessions/${payload.sessionId}/attempt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          return response.ok;
        } catch {
          return false;
        }
      }, sessionId);
      unsyncedAnswerCount = await countOfflineAttempts(sessionId);

      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        if (unsyncedAnswerCount > 0) {
          await discardOfflineQueue(sessionId);
          router.push(`/exam/${sessionId}/results?answers=unsynced`);
        } else {
          router.push(`/exam/${sessionId}/results`);
        }
      } else if (res.status === 409) {
        if (unsyncedAnswerCount > 0) {
          await discardOfflineQueue(sessionId);
          router.push(`/exam/${sessionId}/results?answers=unsynced`);
        } else {
          router.push(`/exam/${sessionId}/results`);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmissionError(data.error || "the exam could not be submitted. check your connection and retry.");
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmissionError(error instanceof Error
        ? error.message
        : "the exam could not be submitted. check your connection and retry.");
      setIsSubmitting(false);
    }
  }, [sessionId, isSubmitting, router, activeQuestion, selectedOptionId, syncAttemptToServer]);

  // 3. High-precision authoritative countdown loop
  useEffect(() => {
    if (!manifest || isSubmitting || submissionError) return;

    const deadlineMs = new Date(manifest.deadline).getTime();

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const diff = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        void handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [manifest, isSubmitting, submissionError, handleAutoSubmit]);

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
    void syncAttemptToServer({
      sessionId,
      questionId: qId,
      optionId: selectedOptionId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });

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
    syncAttemptToServer,
  ]);

  // 5. Deselect Handler
  const handleDeselect = useCallback(async () => {
    if (!activeQuestion || isSubmitting) return;

    const questionId = activeQuestion.id;
    const payload: AttemptSubmissionPayload = {
      sessionId,
      questionId,
      optionId: null,
      status: "VISITED_UNANSWERED",
      timestamp: new Date().toISOString(),
    };
    setSelectedOptionId(null);
    setAttempts((current) => ({
      ...current,
      [questionId]: { optionId: null, status: "VISITED_UNANSWERED" },
    }));
    await persistAttemptLocally(sessionId, questionId, null, "VISITED_UNANSWERED");
    void syncAttemptToServer(payload);
  }, [activeQuestion, isSubmitting, sessionId, syncAttemptToServer]);

  // 6. Skip Handler
  const handleSkip = useCallback(async () => {
    if (!activeQuestion || !activeSection || isSubmitting) return;

    const qId = activeQuestion.id;
    const payload: AttemptSubmissionPayload = {
      sessionId,
      questionId: qId,
      optionId: null,
      status: "VISITED_UNANSWERED",
      timestamp: new Date().toISOString(),
    };
    setSelectedOptionId(null);
    setAttempts((prev) => ({
      ...prev,
      [qId]: { optionId: null, status: "VISITED_UNANSWERED" },
    }));
    await persistAttemptLocally(sessionId, qId, null, "VISITED_UNANSWERED");
    void syncAttemptToServer(payload);

    // Advance forward
    if (currentQuestionIndex < activeSection.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (manifest && currentSectionIndex < manifest.sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
  }, [activeQuestion, activeSection, sessionId, currentQuestionIndex, currentSectionIndex, manifest, isSubmitting, syncAttemptToServer]);

  // 7. Palette Navigation with Guardrail Check
  const navigateToQuestion = useCallback((target: QuestionNavigationTarget) => {
    if (!activeQuestion || isSubmitting) return;
    if (target.sectionIndex === currentSectionIndex && target.questionIndex === currentQuestionIndex) return;

    const saved = attempts[activeQuestion.id];
    const hasUncommittedChange = selectedOptionId !== (saved?.optionId ?? null);
    if (hasUncommittedChange) {
      setGuardrailTarget(target);
      setIsGuardrailOpen(true);
      return;
    }

    setCurrentSectionIndex(target.sectionIndex);
    setCurrentQuestionIndex(target.questionIndex);
  }, [activeQuestion, attempts, currentQuestionIndex, currentSectionIndex, isSubmitting, selectedOptionId]);

  const handlePaletteSelect = useCallback((targetIndex: number) => {
    navigateToQuestion({ sectionIndex: currentSectionIndex, questionIndex: targetIndex });
  }, [currentSectionIndex, navigateToQuestion]);

  // Guardrail Modal Confirm: Save provisional choice and jump
  const handleGuardrailConfirm = useCallback(async () => {
    if (!activeQuestion || guardrailTarget === null) return;

    const qId = activeQuestion.id;
    const newStatus: ItemStatus = selectedOptionId ? "ATTEMPTED_SAVED" : "VISITED_UNANSWERED";
    setAttempts((prev) => ({
      ...prev,
      [qId]: { optionId: selectedOptionId, status: newStatus },
    }));
    await persistAttemptLocally(sessionId, qId, selectedOptionId, newStatus);
    void syncAttemptToServer({
      sessionId,
      questionId: qId,
      optionId: selectedOptionId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });

    setIsGuardrailOpen(false);
    setCurrentSectionIndex(guardrailTarget.sectionIndex);
    setCurrentQuestionIndex(guardrailTarget.questionIndex);
    setGuardrailTarget(null);
  }, [activeQuestion, guardrailTarget, selectedOptionId, sessionId, syncAttemptToServer]);

  // Guardrail Modal Cancel: Discard provisional choice and jump
  const handleGuardrailCancel = useCallback(() => {
    if (guardrailTarget === null) return;
    setIsGuardrailOpen(false);
    setCurrentSectionIndex(guardrailTarget.sectionIndex);
    setCurrentQuestionIndex(guardrailTarget.questionIndex);
    setGuardrailTarget(null);
  }, [guardrailTarget]);

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

  if (loading) {
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

  if (!manifest || !activeSection || !activeQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="retro-window max-w-md w-full p-5 text-center">
          <div className="retro-sunken bg-white p-4">
            <h1 className="text-sm font-black text-red-900">exam unavailable</h1>
            <p className="mt-2 text-xs text-slate-700">
              {loadError || "this exam does not contain any questions."}
            </p>
            <Link href="/lobby" className="retro-btn mt-4 inline-flex px-4 py-2 text-xs font-bold">
              return to lobby
            </Link>
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
                onClick={() => navigateToQuestion({ sectionIndex: idx, questionIndex: 0 })}
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

      {(!isOnline || hasPendingSync || isSyncing) && (
        <div
          className={`mx-auto mt-3 flex w-[min(95%,80rem)] items-center gap-2 rounded border px-3 py-2 text-xs font-bold ${
            !isOnline
              ? "border-amber-400 bg-amber-50 text-amber-950"
              : isSyncing
              ? "border-sky-300 bg-sky-50 text-sky-950"
              : "border-red-300 bg-red-50 text-red-950"
          }`}
          role="status"
          aria-live="polite"
        >
          {!isOnline
            ? "offline · answers are saved on this device and will sync when the connection returns"
            : isSyncing
            ? "syncing saved answers…"
            : "some answers are waiting to sync · check your connection before submitting"}
        </div>
      )}

      {/* 3. Main Player Viewport */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row gap-5 p-4 sm:p-6 pb-28 lg:pb-6">
        {submissionError && (
          <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(95vw,36rem)] -translate-x-1/2 items-center justify-between gap-3 retro-window border-red-400 bg-red-50 p-3 text-xs text-red-950 shadow-lg">
            <span>{submissionError}</span>
            <button
              type="button"
              onClick={handleAutoSubmit}
              className="retro-btn-orange shrink-0 px-3 py-1.5 font-bold"
            >
              retry submission
            </button>
          </div>
        )}

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
                marks: +{(activeQuestion.positiveMarks ?? manifest.positiveMarks).toFixed(1)} / -{(activeQuestion.negativePenalty ?? manifest.negativePenalty).toFixed(1)}
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
            <div className="space-y-2.5" role="radiogroup" aria-label="answer options">
              {activeQuestion.options.map((option, optIdx) => {
                const isSelected = selectedOptionId === option.id;
                const letter = String.fromCharCode(97 + optIdx); // 'a', 'b', 'c', 'd'
                return (
                  <div
                    key={option.id}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`answer ${letter}`}
                    tabIndex={isSelected || (!selectedOptionId && optIdx === 0) ? 0 : -1}
                    onClick={() => setSelectedOptionId(option.id)}
                    onKeyDown={(event) => {
                      const optionCount = activeQuestion.options.length;
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        setSelectedOptionId(option.id);
                      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        event.preventDefault();
                        const next = activeQuestion.options[(optIdx + 1) % optionCount];
                        setSelectedOptionId(next.id);
                        document.getElementById(`answer-${next.id}`)?.focus();
                      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        event.preventDefault();
                        const previous = activeQuestion.options[(optIdx - 1 + optionCount) % optionCount];
                        setSelectedOptionId(previous.id);
                        document.getElementById(`answer-${previous.id}`)?.focus();
                      }
                    }}
                    id={`answer-${option.id}`}
                    className={`flex w-full items-center gap-3 p-3 text-left cursor-pointer select-none rounded-md border transition-all ${
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
                    <div className="min-w-0 flex-1 text-xs sm:text-sm text-slate-900">
                      <KaTeXRenderer content={option.text} />
                      {option.imageUrl && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={option.imageUrl} alt={`illustration for answer ${letter}`} className="max-h-40 max-w-full object-contain" />
                        </div>
                      )}
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
                <p>• <strong>focus:</strong> leaving the exam tab or exiting fullscreen may be recorded. repeated focus events can end the attempt.</p>
                <p>• <strong>fullscreen:</strong> the exam uses it when your browser supports it; otherwise you can keep working without it.</p>
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
                  fullscreen paused
                </span>
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="retro-sunken bg-white p-4 text-left mb-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  this browser left fullscreen. the questions are paused while you choose whether to resume it.
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
                resume exam
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
