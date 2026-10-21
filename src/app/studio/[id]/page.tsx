"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

export default function QuestionComposerPage({
  params,
}: {
  params: { id: string };
}) {
  const examId = params.id;
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Active section & question selection
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  // Discord-style Category Collapsing: Map<sectionId, boolean> (false = expanded)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Inline Section Editing State
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState("");

  // Composer Form State
  const [stem, setStem] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [solutionExplanation, setSolutionExplanation] = useState("");
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

  const loadExamDetail = async (preserveSectionId?: string) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      if (res.ok) {
        const data: ExamDetail = await res.json();
        setExam(data);

        const targetSecId = preserveSectionId || selectedSectionId || (data.sections.length > 0 ? data.sections[0].id : "");
        setSelectedSectionId(targetSecId);
      }
    } catch (err) {
      console.error("failed to load exam detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamDetail();
  }, [examId]);

  const loadQuestionIntoForm = (q: QuestionItem, secId: string) => {
    setSelectedSectionId(secId);
    setSelectedQuestion(q);
    setStem(q.stem);
    setDiagramUrl(q.diagramUrl || "");
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
    setDiagramUrl("");
    setSolutionExplanation("");
    setFeedback(null);
    setOptions([
      { orderIndex: 0, text: "", isCorrect: true },
      { orderIndex: 1, text: "", isCorrect: false },
      { orderIndex: 2, text: "", isCorrect: false },
      { orderIndex: 3, text: "", isCorrect: false },
    ]);
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
      [secId]: false, // Auto-expand when adding question
    }));
  };

  const insertMacro = (macro: string) => {
    setStem((prev) => prev + macro);
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
      setFeedback({ type: "error", message: "please select a category on the left first." });
      return;
    }

    if (!stem.trim()) {
      setFeedback({ type: "error", message: "question stem cannot be empty. please type a question." });
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
            : "question saved! ready for next question below.",
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
  const activeEmoji = activeSection ? getSubjectEmoji(activeSection.title) : "📁";

  return (
    <div className="min-h-screen flex flex-col font-sans pb-8">
      {/* Studio Header */}
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
        <aside className="retro-window w-full md:w-80 shrink-0 p-3 flex flex-col select-none">
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

        {/* Center/Right: Visual Question Composer & Real-Time KaTeX Preview */}
        <main className="retro-window flex-1 p-5 overflow-y-auto">
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            {/* Header info & Action Buttons */}
            <div className="retro-panel flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedQuestion ? `editing question` : `compose new question`}
                  </h2>
                  {!selectedQuestion && (
                    <span className="retro-btn bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-black">
                      ● live draft
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                  <span className="font-bold">category:</span>
                  <span className="retro-sunken px-2 py-0.5 text-[11px] font-bold text-slate-800 bg-white">
                    {activeEmoji} | {activeSection?.title.toLowerCase() || "none"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedQuestion && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                    className="retro-btn text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNewQuestion(selectedSectionId)}
                  className="retro-btn px-3.5 py-1.5 text-xs font-bold"
                >
                  clear form
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="retro-btn-green px-5 py-1.5 text-xs sm:text-sm font-black inline-flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "saving..." : selectedQuestion ? "update question" : "save question"}
                </button>
              </div>
            </div>

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

            {/* Math Macro Toolbar */}
            <div className="retro-panel p-3">
              <span className="block text-[10px] font-black text-slate-700 mb-1.5">
                katex formula shortcut bar (click to insert):
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
                    className="retro-btn px-2 py-0.5 text-[11px] font-mono hover:bg-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Stem Text Area */}
            <div className="retro-panel p-4">
              <label className="block text-[11px] font-black text-slate-800 mb-1.5">
                question stem (supports latex $formula$ or markdown):
              </label>
              <textarea
                rows={4}
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder="type question stem here. e.g. simplify $\frac{p + \sqrt{p^2-q^2}}{p - \sqrt{p^2-q^2}}$..."
                className="retro-field w-full text-xs font-mono p-2.5"
              />

              {/* Real-Time Live KaTeX Preview */}
              <div className="mt-3 pt-3 border-t border-slate-300">
                <span className="text-[10px] font-black text-slate-600 mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> live render preview:
                </span>
                <div className="retro-sunken bg-white p-3 min-h-[44px] text-xs sm:text-sm text-slate-900">
                  <KaTeXRenderer content={stem || "live formula preview will appear here..."} />
                </div>
              </div>
            </div>

            {/* Diagram URL Field */}
            <div className="retro-panel p-4">
              <label className="block text-[11px] font-black text-slate-800 mb-1.5">
                diagram / vector graphic url (optional):
              </label>
              <input
                type="text"
                value={diagramUrl}
                onChange={(e) => setDiagramUrl(e.target.value)}
                placeholder="https://example.com/diagram.png or relative path"
                className="retro-field w-full text-xs"
              />
              {diagramUrl && (
                <div className="retro-sunken mt-3 p-2 bg-slate-50 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={diagramUrl} alt="diagram preview" className="max-h-40 object-contain" />
                </div>
              )}
            </div>

            {/* Options Manager */}
            <div className="retro-panel p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-300 pb-2">
                <label className="block text-[11px] font-black text-slate-800">
                  multiple choice options (select radio to set correct key):
                </label>
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((prev) => [
                        ...prev,
                        { orderIndex: prev.length, text: "", isCorrect: false },
                      ])
                    }
                    className="retro-btn px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> add choice
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-2.5 p-2 ${
                      opt.isCorrect
                        ? "retro-sunken bg-emerald-50 border-emerald-600 font-bold"
                        : "retro-panel bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctKey"
                      checked={opt.isCorrect}
                      onChange={() =>
                        setOptions((prev) =>
                          prev.map((o, i) => ({ ...o, isCorrect: i === optIdx }))
                        )
                      }
                      className="h-4 w-4 text-emerald-700 cursor-pointer"
                      title="set as correct answer"
                    />

                    <span className="retro-btn flex h-6 w-6 items-center justify-center text-xs font-black">
                      {String.fromCharCode(97 + optIdx)}
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((o, i) => (i === optIdx ? { ...o, text: val } : o))
                        );
                      }}
                      placeholder={`choice ${optIdx + 1} formula (e.g. $\\frac{p^2}{q^2}$)`}
                      className="retro-field flex-1 text-xs py-1"
                    />

                    {opt.text && opt.text.includes("$") && (
                      <div className="retro-sunken bg-white px-2 py-0.5 text-xs">
                        <KaTeXRenderer content={opt.text} />
                      </div>
                    )}

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((prev) => prev.filter((_, i) => i !== optIdx))
                        }
                        className="retro-btn p-1 text-red-700 hover:bg-red-100"
                        title="remove choice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation / Solution Note */}
            <div className="retro-panel p-4">
              <label className="block text-[11px] font-black text-slate-800 mb-1.5">
                solution explanation (shown on candidate scorecard):
              </label>
              <textarea
                rows={3}
                value={solutionExplanation}
                onChange={(e) => setSolutionExplanation(e.target.value)}
                placeholder="step-by-step mathematical reasoning or physics derivation..."
                className="retro-field w-full text-xs p-2.5"
              />
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
