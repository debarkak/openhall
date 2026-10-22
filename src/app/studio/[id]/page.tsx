"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Eye,
  Shield,
  Pencil,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Copy,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

interface OptionItem {
  id?: string;
  orderIndex: number;
  text: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  orderIndex: number;
  stem: string;
  diagramUrl?: string | null;
  solutionExplanation?: string | null;
  options: OptionItem[];
}

interface SectionItem {
  id: string;
  title: string;
  orderIndex: number;
  questions: QuestionItem[];
}

interface ExamDetail {
  id: string;
  title: string;
  accessCode: string;
  durationSeconds: number;
  positiveMarks: number;
  negativePenalty: number;
  sections: SectionItem[];
}

const SUBJECT_PRESETS = [
  { title: "mathematics", emoji: "📐", desc: "algebra, geometry & calculus" },
  { title: "physics", emoji: "⚛️", desc: "mechanics, electricity & optics" },
  { title: "chemistry", emoji: "🧪", desc: "organic, inorganic & physical" },
  { title: "computer science", emoji: "💻", desc: "algorithms, data structures & coding" },
  { title: "biology", emoji: "🧬", desc: "genetics, physiology & ecology" },
  { title: "logic & reasoning", emoji: "🧠", desc: "analytical thinking & puzzles" },
  { title: "english & writing", emoji: "📖", desc: "grammar, reading & vocab" },
  { title: "general", emoji: "📁", desc: "miscellaneous questions" },
];

function getSubjectEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("mental") || lower.includes("mat") || lower.includes("aptitude") || lower.includes("reasoning") || lower.includes("logic")) return "🧠";
  if (lower.includes("math") || lower.includes("algebra") || lower.includes("geometry") || lower.includes("calculus")) return "📐";
  if (lower.includes("physic") || lower.includes("mechanic")) return "⚛️";
  if (lower.includes("chem")) return "🧪";
  if (lower.includes("bio")) return "🧬";
  if (lower.includes("science")) return "🔬";
  if (lower.includes("english") || lower.includes("verbal") || lower.includes("language")) return "📖";
  if (lower.includes("forum") || lower.includes("general") || lower.includes("gk")) return "📜";
  if (lower.includes("update") || lower.includes("poll") || lower.includes("notice")) return "🔔";
  if (lower.includes("text") || lower.includes("chat")) return "💬";
  return "📁";
}

export default function QuestionComposerPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Active section & question selection
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  // Left sidebar category collapsing
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Inline section editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState("");

  // Question Form State (Google Forms style)
  const [questionType, setQuestionType] = useState<"single_choice" | "multiple_choice">("single_choice");
  const [stem, setStem] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [showDiagramInput, setShowDiagramInput] = useState(false);
  const [isUploadingDiagram, setIsUploadingDiagram] = useState(false);
  const [showFormulaBar, setShowFormulaBar] = useState(false);
  const [solutionExplanation, setSolutionExplanation] = useState("");
  const [showExplanation, setShowExplanation] = useState(true);
  const [options, setOptions] = useState<OptionItem[]>([
    { orderIndex: 0, text: "", isCorrect: true },
    { orderIndex: 1, text: "", isCorrect: false },
    { orderIndex: 2, text: "", isCorrect: false },
    { orderIndex: 3, text: "", isCorrect: false },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Ref array for option inputs to enable fluid Google Forms Enter key hopping
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const stemInputRef = useRef<HTMLTextAreaElement | null>(null);
  const diagramFileInputRef = useRef<HTMLInputElement | null>(null);
  const stemSelectionRef = useRef({ start: 0, end: 0 });

  const loadExamDetail = useCallback(async (preserveSectionId?: string) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      if (res.status === 401) {
        const destination = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }
      if (res.status === 403) {
        window.location.assign("/lobby");
        return;
      }
      if (res.ok) {
        const data: ExamDetail = await res.json();
        setExam(data);

        const targetSecId = preserveSectionId || (data.sections.length > 0 ? data.sections[0].id : "");
        setSelectedSectionId(targetSecId);
      }
    } catch (err) {
      console.error("failed to load exam detail:", err);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void loadExamDetail();
  }, [loadExamDetail]);

  const loadQuestionIntoForm = (q: QuestionItem, secId: string) => {
    setSelectedSectionId(secId);
    setSelectedQuestion(q);
    setStem(q.stem);
    stemSelectionRef.current = { start: q.stem.length, end: q.stem.length };
    setDiagramUrl(q.diagramUrl || "");
    setShowDiagramInput(!!q.diagramUrl);
    setSolutionExplanation(q.solutionExplanation || "");
    setFeedback(null);
    setOptions(
      q.options.map((o) => ({
        id: o.id,
        orderIndex: o.orderIndex,
        text: o.text,
        isCorrect: o.isCorrect,
      }))
    );
  };

  const handleNewQuestion = (targetSecId?: string) => {
    if (targetSecId) {
      setSelectedSectionId(targetSecId);
    }
    setSelectedQuestion(null);
    setStem("");
    stemSelectionRef.current = { start: 0, end: 0 };
    setDiagramUrl("");
    setShowDiagramInput(false);
    setSolutionExplanation("");
    setFeedback(null);
    setOptions([
      { orderIndex: 0, text: "", isCorrect: true },
      { orderIndex: 1, text: "", isCorrect: false },
      { orderIndex: 2, text: "", isCorrect: false },
      { orderIndex: 3, text: "", isCorrect: false },
    ]);
  };

  const handleDiagramUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingDiagram(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/admin/exams/${examId}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(data.error || "image upload failed. try again.");
      }

      setDiagramUrl(data.url);
      setShowDiagramInput(true);
      setFeedback({ type: "success", message: "image uploaded. save the question to keep this attachment." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "image upload failed. try again.",
      });
    } finally {
      setIsUploadingDiagram(false);
      if (diagramFileInputRef.current) diagramFileInputRef.current.value = "";
    }
  };

  const handleDuplicateQuestion = () => {
    setSelectedQuestion(null);
    setFeedback({
      type: "success",
      message: "question duplicated as a new draft! adjust values and save when ready.",
    });
  };

  const toggleCategoryCollapse = (secId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const startDraftInSection = (secId: string) => {
    setSelectedSectionId(secId);
    handleNewQuestion(secId);
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: false,
    }));
  };

  const insertMacro = (macro: string) => {
    const start = Math.max(0, Math.min(stemSelectionRef.current.start, stem.length));
    const end = Math.max(start, Math.min(stemSelectionRef.current.end, stem.length));
    const nextStem = `${stem.slice(0, start)}${macro}${stem.slice(end)}`;
    const caret = start + macro.length;

    setStem(nextStem);
    stemSelectionRef.current = { start: caret, end: caret };

    requestAnimationFrame(() => {
      const textarea = stemInputRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const newIdx = options.length;
    setOptions((prev) => [
      ...prev,
      { orderIndex: newIdx, text: "", isCorrect: false },
    ]);
    setTimeout(() => {
      optionInputRefs.current[newIdx]?.focus();
    }, 50);
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, optIdx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (optIdx < options.length - 1) {
        optionInputRefs.current[optIdx + 1]?.focus();
      } else if (options.length < 6) {
        handleAddOption();
      }
    }
  };

  const applyPreset = (preset: "4_choices" | "true_false") => {
    if (preset === "4_choices") {
      setOptions([
        { orderIndex: 0, text: "", isCorrect: true },
        { orderIndex: 1, text: "", isCorrect: false },
        { orderIndex: 2, text: "", isCorrect: false },
        { orderIndex: 3, text: "", isCorrect: false },
      ]);
    } else if (preset === "true_false") {
      setOptions([
        { orderIndex: 0, text: "true", isCorrect: true },
        { orderIndex: 1, text: "false", isCorrect: false },
      ]);
    }
  };

  const handleCreateSection = async (title: string) => {
    if (!title || !title.trim()) return;

    try {
      const res = await fetch(`/api/admin/exams/${examId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim().toLowerCase() }),
      });

      if (res.ok) {
        const newSec: SectionItem = await res.json();
        setIsSectionModalOpen(false);
        setCustomSectionInput("");
        await loadExamDetail(newSec.id);
        startDraftInSection(newSec.id);
        setFeedback({ type: "success", message: `category "${newSec.title.toLowerCase()}" created successfully!` });
      } else {
        setFeedback({ type: "error", message: "failed to create category." });
      }
    } catch {
      setFeedback({ type: "error", message: "network error creating category." });
    }
  };

  const handleUpdateSectionTitle = async (secId: string) => {
    if (!editingSectionTitle.trim()) {
      setEditingSectionId(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/sections/${secId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingSectionTitle.trim().toLowerCase() }),
      });

      if (res.ok) {
        setEditingSectionId(null);
        await loadExamDetail(secId);
        setFeedback({ type: "success", message: "category renamed successfully." });
      } else {
        setFeedback({ type: "error", message: "failed to rename category." });
      }
    } catch {
      setFeedback({ type: "error", message: "network error updating category." });
    }
  };

  const handleDeleteSection = async (secId: string, title: string) => {
    if (!confirm(`are you sure you want to delete category "${title}" and all its questions?`)) return;

    try {
      const res = await fetch(`/api/admin/sections/${secId}`, { method: "DELETE" });
      if (res.ok) {
        await loadExamDetail();
        handleNewQuestion();
        setFeedback({ type: "success", message: `deleted category "${title}".` });
      } else {
        setFeedback({ type: "error", message: "failed to delete category." });
      }
    } catch {
      setFeedback({ type: "error", message: "network error deleting category." });
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedSectionId) {
      setFeedback({ type: "error", message: "please select a category first." });
      return;
    }

    if (!stem.trim()) {
      setFeedback({ type: "error", message: "question stem cannot be empty. please type a question prompt." });
      return;
    }

    const filledOptions = options.filter((o) => o.text && o.text.trim());
    if (filledOptions.length < 2) {
      setFeedback({
        type: "error",
        message: "please enter text for at least 2 multiple-choice options.",
      });
      return;
    }

    // Default first choice as correct if none selected
    if (!filledOptions.some((o) => o.isCorrect)) {
      filledOptions[0].isCorrect = true;
    }

    setIsSaving(true);

    try {
      const endpoint = selectedQuestion
        ? `/api/admin/questions/${selectedQuestion.id}`
        : `/api/admin/sections/${selectedSectionId}/questions`;

      const method = selectedQuestion ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem: stem.trim(),
          diagramUrl: diagramUrl.trim() || null,
          solutionExplanation: solutionExplanation.trim() || null,
          options: filledOptions,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: "success",
          message: selectedQuestion
            ? "question updated successfully!"
            : "question saved! ready for the next question.",
        });
        await loadExamDetail(selectedSectionId);
        handleNewQuestion(selectedSectionId);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          message: errData.error || "failed to save question. please try again.",
        });
      }
    } catch (err) {
      console.error("failed to save question:", err);
      setFeedback({ type: "error", message: "network error while saving question." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, { method: "DELETE" });
      if (res.ok) {
        setFeedback({ type: "success", message: "question deleted successfully." });
        handleNewQuestion(selectedSectionId);
        await loadExamDetail(selectedSectionId);
      } else {
        setFeedback({ type: "error", message: "failed to delete question." });
      }
    } catch {
      setFeedback({ type: "error", message: "network error while deleting question." });
    }
  };

  if (loading || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="retro-window p-6 text-center max-w-xs w-full">
          <div className="retro-sunken-dark p-3 font-mono text-xs text-emerald-400">
            loading question composer...
          </div>
        </div>
      </div>
    );
  }

  const activeSection = exam.sections.find((s) => s.id === selectedSectionId) || exam.sections[0];
  const activeQuestions = activeSection?.questions || [];
  const currentQIndex = selectedQuestion
    ? activeQuestions.findIndex((q) => q.id === selectedQuestion.id) + 1
    : activeQuestions.length + 1;

  const correctChoiceIdx = options.findIndex((o) => o.isCorrect);
  const correctChoiceLetter = correctChoiceIdx >= 0 ? String.fromCharCode(97 + correctChoiceIdx) : "a";

  return (
    <div className="min-h-screen flex flex-col font-sans pb-8">
      {/* Studio Top Bar */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-900 inline-flex items-center gap-1 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3 w-3" />
            studio
          </Link>
          <span className="text-xs sm:text-sm font-black text-white tracking-tight">
            {exam.title.toLowerCase()} <span className="font-mono text-sky-200">[{exam.accessCode.toLowerCase()}]</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/proctor/${exam.id}`}
            className="retro-btn-cyan px-2.5 py-1 text-[11px] inline-flex items-center gap-1 font-bold"
          >
            <Shield className="h-3.5 w-3.5" />
            proctor
          </Link>
        </div>
      </header>

      {/* Main Composer Workspace */}
      <div className="flex flex-1 flex-col md:flex-row p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Left Sidebar: Discord-Style Category & Channels Tree */}
        <aside className="retro-window w-full md:w-72 shrink-0 p-3 flex flex-col select-none">
          {/* Header Action */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-300">
            <span className="text-[11px] font-black tracking-wider text-slate-800">
              categories &amp; channels
            </span>
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(true)}
              className="retro-btn px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 hover:bg-slate-100"
              title="add subject category"
            >
              <Plus className="h-3 w-3" /> category
            </button>
          </div>

          {/* Discord-Style Hierarchical Tree */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {exam.sections.map((sec) => {
              const isCollapsed = !!collapsedSections[sec.id];
              const isCurrentSection = selectedSectionId === sec.id;
              const emoji = getSubjectEmoji(sec.title);
              const isEditing = editingSectionId === sec.id;

              return (
                <div key={sec.id} className="retro-panel p-2 space-y-1">
                  {/* Category Header */}
                  {isEditing ? (
                    <div className="flex items-center gap-1 bg-white p-1 retro-sunken">
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        className="flex-1 text-xs text-slate-900 focus:outline-none px-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateSectionTitle(sec.id);
                          if (e.key === "Escape") setEditingSectionId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateSectionTitle(sec.id)}
                        className="retro-btn-green px-1.5 py-0.5 text-[10px]"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSectionId(null)}
                        className="retro-btn px-1.5 py-0.5 text-[10px]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="group flex items-center justify-between px-1.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-200 cursor-pointer select-none"
                      onClick={() => toggleCategoryCollapse(sec.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm shrink-0 leading-none">{emoji}</span>
                        <span className="text-slate-400 font-light">|</span>
                        <span className="truncate tracking-tight font-bold text-slate-900">
                          {sec.title.toLowerCase()}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-600 transition-transform duration-150 shrink-0 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="retro-sunken px-1 text-[10px] font-mono text-slate-700 bg-white">
                          {sec.questions.length}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startDraftInSection(sec.id);
                            }}
                            className="retro-btn p-0.5 text-slate-800"
                            title={`add question to ${sec.title.toLowerCase()}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSectionId(sec.id);
                              setEditingSectionTitle(sec.title);
                            }}
                            className="retro-btn p-0.5 text-slate-800"
                            title="rename"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {sec.questions.length === 0 && exam.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(sec.id, sec.title);
                              }}
                              className="retro-btn p-0.5 text-red-700 hover:bg-red-100"
                              title="delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nested Questions Channels */}
                  {!isCollapsed && (
                    <div className="pl-2 border-l-2 border-slate-400 space-y-1 pt-1">
                      {sec.questions.map((q, idx) => {
                        const isSelected = selectedQuestion?.id === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => loadQuestionIntoForm(q, sec.id)}
                            className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer select-none ${
                              isSelected
                                ? "retro-sunken bg-amber-100 text-slate-900 font-black border-slate-700"
                                : "retro-btn bg-slate-100 hover:bg-white text-slate-700"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold shrink-0 text-slate-500">
                              #
                            </span>
                            <span className="font-bold shrink-0 text-[11px]">
                              q{idx + 1}
                            </span>
                            <span className="truncate flex-1">
                              {q.stem}
                            </span>
                          </button>
                        );
                      })}

                      {/* LIVE DRAFT CHANNEL */}
                      {isCurrentSection && !selectedQuestion && (
                        <div className="w-full flex items-center gap-1.5 px-2 py-1 text-xs retro-sunken bg-emerald-100 text-emerald-900 border-emerald-600 font-bold">
                          <span className="font-mono text-xs font-bold text-emerald-700 shrink-0">
                            #
                          </span>
                          <span className="font-black text-emerald-800 shrink-0 text-[11px]">
                            q{sec.questions.length + 1}
                          </span>
                          <span className="truncate flex-1 text-slate-800 font-semibold">
                            {stem.trim() || "(live draft...)"}
                          </span>
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                        </div>
                      )}

                      {sec.questions.length === 0 && (!isCurrentSection || selectedQuestion) && (
                        <button
                          type="button"
                          onClick={() => startDraftInSection(sec.id)}
                          className="retro-btn w-full text-left flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600"
                        >
                          <Plus className="h-3 w-3" /> add first question
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Side: Google Forms Style Question Maker Card */}
        <main className="flex-1 overflow-y-auto">
          <form onSubmit={handleSaveQuestion} className="space-y-3">
            {/* Notification / Toast Banner */}
            {feedback && (
              <div
                className={`retro-panel p-3 text-xs font-bold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-100 text-emerald-950 border-emerald-500"
                    : "bg-red-100 text-red-950 border-red-500"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Google Forms Question Card */}
            <div className="retro-window bg-white shadow-sm overflow-hidden border-2 border-slate-300">
              {/* Form Top Accent Stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

              <div className="p-4 sm:p-5 space-y-4">
                {/* Card Header Row: Question Counter, Category Tag & Question Type Dropdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="retro-btn bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-800">
                      question #{currentQIndex}
                    </span>
                    {!selectedQuestion ? (
                      <span className="retro-btn bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-black inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        draft
                      </span>
                    ) : (
                      <span className="retro-btn bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black">
                        editing
                      </span>
                    )}

                    {/* Category Selector on Question Card */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-500">in:</span>
                      <select
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        className="retro-field text-xs font-bold py-0.5 px-2 bg-white"
                      >
                        {exam.sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {getSubjectEmoji(sec.title)} {sec.title.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Google Forms Question Type Selector */}
                    <div className="flex items-center gap-1">
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(
                          e.target.value === "multiple_choice" ? "multiple_choice" : "single_choice"
                        )}
                        className="retro-field text-xs font-bold py-1 px-2.5 bg-slate-50"
                      >
                        <option value="single_choice">🔘 multiple choice (single answer)</option>
                        <option value="multiple_choice">☑️ checkboxes (multiple answer)</option>
                      </select>
                    </div>

                    <span className="retro-sunken px-2 py-0.5 text-[11px] font-bold text-slate-600 bg-slate-50">
                      +{exam.positiveMarks.toFixed(1)} marks
                    </span>
                  </div>
                </div>

                {/* Question Prompt (Stem) Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800">
                      question prompt:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowDiagramInput((prev) => !prev)}
                        className={`retro-btn px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${
                          showDiagramInput ? "bg-sky-100 text-sky-900 border-sky-400" : ""
                        }`}
                        title="toggle diagram image attachment"
                      >
                        <ImageIcon className="h-3 w-3" />
                        {showDiagramInput ? "hide image" : "add image"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFormulaBar((prev) => !prev)}
                        className={`retro-btn px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${
                          showFormulaBar ? "bg-amber-100 text-amber-900 border-amber-400" : ""
                        }`}
                        title="toggle math formulas palette"
                      >
                        <Sparkles className="h-3 w-3" />
                        {showFormulaBar ? "hide math bar" : "math bar"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={stemInputRef}
                    rows={3}
                    value={stem}
                    onChange={(e) => {
                      setStem(e.target.value);
                      stemSelectionRef.current = {
                        start: e.currentTarget.selectionStart,
                        end: e.currentTarget.selectionEnd,
                      };
                    }}
                    onSelect={(e) => {
                      stemSelectionRef.current = {
                        start: e.currentTarget.selectionStart,
                        end: e.currentTarget.selectionEnd,
                      };
                    }}
                    placeholder="type question stem here (e.g. calculate the gaussian integral: $\int_{0}^{\infty} e^{-x^2} dx$)..."
                    className="retro-field w-full text-xs sm:text-sm font-sans p-3 leading-relaxed"
                  />

                  {/* Real-Time Live KaTeX Formula Preview */}
                  {stem.trim() && (
                    <div className="retro-sunken bg-slate-50 p-2.5 text-xs text-slate-900">
                      <span className="block text-[9px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> formula live preview:
                      </span>
                      <KaTeXRenderer content={stem} />
                    </div>
                  )}
                </div>

                {/* Collapsible Diagram URL Row */}
                {showDiagramInput && (
                  <div className="retro-panel p-3 bg-slate-50/70 border border-slate-300 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                        diagram / image:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={diagramFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="sr-only"
                          aria-label="choose a question image"
                          onChange={(event) => void handleDiagramUpload(event.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => diagramFileInputRef.current?.click()}
                          disabled={isUploadingDiagram}
                          className="retro-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold"
                        >
                          <Upload className="h-3 w-3" />
                          {isUploadingDiagram ? "uploading…" : "upload image"}
                        </button>
                        {diagramUrl && (
                          <button
                            type="button"
                            onClick={() => setDiagramUrl("")}
                            className="text-[10px] text-red-700 hover:underline font-bold"
                          >
                            remove image
                          </button>
                        )}
                      </div>
                    </div>
                    <p
                      className="retro-sunken p-2 text-center text-[10px] text-slate-600"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        void handleDiagramUpload(event.dataTransfer.files?.[0]);
                      }}
                    >
                      drop an image here, or paste an image url below · png, jpeg, gif, or webp · up to 5 mb
                    </p>
                    <input
                      type="text"
                      value={diagramUrl}
                      onChange={(e) => setDiagramUrl(e.target.value)}
                      placeholder="https://example.com/diagram.png"
                      className="retro-field w-full text-xs py-1.5 px-2"
                    />
                    {diagramUrl && (
                      <div className="retro-sunken p-2 bg-white flex justify-center max-h-48 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={diagramUrl} alt="diagram preview" className="max-h-40 object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Math Formula Shortcut Bar */}
                {showFormulaBar && (
                  <div className="retro-panel p-2.5 bg-amber-50/50 border border-amber-200">
                    <span className="block text-[10px] font-black text-slate-700 mb-1.5">
                      click formula snippet to insert into question stem:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "fraction \\frac", macro: "$\\frac{a}{b}$" },
                        { label: "square root \\sqrt", macro: "$\\sqrt{x}$" },
                        { label: "superscript x²", macro: "$x^2$" },
                        { label: "subscript x_i", macro: "$x_i$" },
                        { label: "integral \\int", macro: "$$\\int_{0}^{\\infty} f(x) dx$$" },
                        { label: "sum \\sum", macro: "$$\\sum_{i=1}^{n} x_i$$" },
                        { label: "matrix [M]", macro: "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$" },
                        { label: "α", macro: "$\\alpha$" },
                        { label: "β", macro: "$\\beta$" },
                        { label: "θ", macro: "$\\theta$" },
                        { label: "π", macro: "$\\pi$" },
                        { label: "±", macro: "$\\pm$" },
                        { label: "≤", macro: "$\\le$" },
                        { label: "≥", macro: "$\\ge$" },
                        { label: "H₂SO₄", macro: "$\\text{H}_2\\text{SO}_4$" },
                      ].map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertMacro(item.macro)}
                          className="retro-btn px-2 py-0.5 text-[10px] font-mono hover:bg-white"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multiple Choice Options List (Google Forms Style) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-black text-slate-800">
                        options:
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        click the circle to set the correct answer key. press enter to add next option.
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset("4_choices")}
                        className="retro-btn px-2 py-0.5 text-[10px] text-slate-700"
                        title="reset to 4 choices (a, b, c, d)"
                      >
                        + 4 choices
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("true_false")}
                        className="retro-btn px-2 py-0.5 text-[10px] text-slate-700"
                        title="set options to true / false"
                      >
                        + true / false
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`group flex items-center gap-2 p-1.5 rounded transition-colors ${
                          opt.isCorrect
                            ? "retro-sunken bg-emerald-50/80 border-emerald-500"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        {/* Radio Button for Answer Key */}
                        <button
                          type="button"
                          onClick={() => {
                            setOptions((prev) =>
                              prev.map((o, i) => ({
                                ...o,
                                isCorrect: questionType === "multiple_choice" ? (i === optIdx ? !o.isCorrect : o.isCorrect) : i === optIdx,
                              }))
                            );
                          }}
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            opt.isCorrect
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-400 hover:border-slate-600 bg-white"
                          }`}
                          title={opt.isCorrect ? "marked as correct answer key" : "click to set as correct answer"}
                        >
                          {opt.isCorrect ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                        </button>

                        {/* Letter Identifier */}
                        <span className="retro-btn flex h-6 w-6 shrink-0 items-center justify-center text-xs font-black select-none">
                          {String.fromCharCode(97 + optIdx)}
                        </span>

                        {/* Option Input Field */}
                        <input
                          ref={(el) => {
                            optionInputRefs.current[optIdx] = el;
                          }}
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOptions((prev) =>
                              prev.map((o, i) => (i === optIdx ? { ...o, text: val } : o))
                            );
                          }}
                          onKeyDown={(e) => handleOptionKeyDown(e, optIdx)}
                          placeholder={`choice ${optIdx + 1} formula (e.g. $\\frac{\\sqrt{\\pi}}{2}$)`}
                          className="retro-field flex-1 text-xs py-1.5 px-2 bg-white"
                        />

                        {/* Inline Math Preview Badge */}
                        {opt.text && opt.text.includes("$") && (
                          <div className="retro-sunken bg-white px-2 py-0.5 text-xs shrink-0 max-w-[140px] truncate">
                            <KaTeXRenderer content={opt.text} />
                          </div>
                        )}

                        {/* Remove Option Button */}
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setOptions((prev) => prev.filter((_, i) => i !== optIdx))
                            }
                            className="retro-btn p-1 text-red-700 hover:bg-red-100 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="remove choice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Google Forms Style "+ Add option" Row */}
                  {options.length < 6 && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-blue-700 hover:text-blue-900 rounded hover:bg-blue-50 transition-colors"
                      >
                        <span className="h-4 w-4 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center text-[11px] font-black">
                          +
                        </span>
                        <span>add option</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Answer Key & Explanation Drawer (Google Forms Quiz Style) */}
                <div className="retro-panel p-3 bg-slate-50 border border-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>answer key:</span>
                      <span className="retro-sunken px-2 py-0.5 font-mono text-[11px] bg-white text-emerald-800">
                        choice [{correctChoiceLetter}]
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (+{exam.positiveMarks.toFixed(1)} marks)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowExplanation((prev) => !prev)}
                      className="text-[11px] text-blue-700 hover:underline font-bold"
                    >
                      {showExplanation ? "hide explanation" : "add explanation / derivation"}
                    </button>
                  </div>

                  {showExplanation && (
                    <div className="space-y-1.5 pt-1">
                      <textarea
                        rows={2}
                        value={solutionExplanation}
                        onChange={(e) => setSolutionExplanation(e.target.value)}
                        placeholder="step-by-step mathematical reasoning or physics derivation shown on candidate scorecard..."
                        className="retro-field w-full text-xs p-2 bg-white"
                      />
                      {solutionExplanation.trim() && (
                        <div className="retro-sunken bg-white p-2 text-xs text-slate-800">
                          <KaTeXRenderer content={solutionExplanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Forms Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDuplicateQuestion}
                      className="retro-btn px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-100"
                      title="duplicate this question as a new draft"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-600" />
                      duplicate
                    </button>

                    {selectedQuestion && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                        className="retro-btn text-red-700 hover:bg-red-100 px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"
                        title="delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        delete
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleNewQuestion(selectedSectionId)}
                      className="retro-btn px-2.5 py-1 text-xs font-bold"
                      title="clear form"
                    >
                      clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="retro-btn-green px-5 py-1.5 text-xs sm:text-sm font-black inline-flex items-center gap-1.5 shadow"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "saving..." : selectedQuestion ? "update question" : "save question"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Add Category Presets Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="retro-window w-full max-w-md overflow-hidden">
            <div className="retro-titlebar">
              <span className="text-xs font-bold tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                add category channel
              </span>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-700 mb-3">
                select a subject preset, or enter a custom category name:
              </p>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SUBJECT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCreateSection(preset.title)}
                    className="retro-btn flex items-center justify-between p-2 text-left text-xs font-bold hover:bg-white"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{preset.emoji}</span>
                      <span className="truncate">{preset.title}</span>
                    </div>
                    <Plus className="h-3 w-3 text-slate-600 shrink-0" />
                  </button>
                ))}
              </div>

              {/* Custom Category Input */}
              <div className="pt-3 border-t border-slate-300">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  or custom channel name:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSectionInput}
                    onChange={(e) => setCustomSectionInput(e.target.value)}
                    placeholder="e.g. updates, social science, logic"
                    className="retro-field flex-1 text-xs py-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateSection(customSectionInput);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateSection(customSectionInput)}
                    disabled={!customSectionInput.trim()}
                    className="retro-btn-green px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
