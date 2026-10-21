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
  Hash,
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
  { title: "Mental Ability Test (MAT)", emoji: "🧠", desc: "Logic & Analytical Reasoning" },
  { title: "Mathematics", emoji: "📐", desc: "Algebra, Geometry & Calculus" },
  { title: "Natural Sciences", emoji: "🔬", desc: "Physics, Chemistry & Biology" },
  { title: "Physics", emoji: "⚛️", desc: "Mechanics, Electricity & Optics" },
  { title: "Chemistry", emoji: "🧪", desc: "Physical, Organic & Inorganic" },
  { title: "Biology", emoji: "🧬", desc: "Botany, Zoology & Genetics" },
  { title: "English & Verbal", emoji: "📖", desc: "Comprehension & Vocabulary" },
  { title: "General Knowledge (GK)", emoji: "📜", desc: "Current Affairs & History" },
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
      console.error("Failed to load exam detail:", err);
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
        body: JSON.stringify({ title: title.trim() }),
      });

      if (res.ok) {
        const newSec: SectionItem = await res.json();
        setIsSectionModalOpen(false);
        setCustomSectionInput("");
        await loadExamDetail(newSec.id);
        startDraftInSection(newSec.id);
        setFeedback({ type: "success", message: `Category "${newSec.title}" created successfully!` });
      } else {
        setFeedback({ type: "error", message: "Failed to create category." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error creating category." });
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
        body: JSON.stringify({ title: editingSectionTitle.trim() }),
      });

      if (res.ok) {
        setEditingSectionId(null);
        await loadExamDetail(secId);
        setFeedback({ type: "success", message: "Category renamed successfully." });
      } else {
        setFeedback({ type: "error", message: "Failed to rename category." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error updating category." });
    }
  };

  const handleDeleteSection = async (secId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete category "${title}" and all its questions?`)) return;

    try {
      const res = await fetch(`/api/admin/sections/${secId}`, { method: "DELETE" });
      if (res.ok) {
        await loadExamDetail();
        handleNewQuestion();
        setFeedback({ type: "success", message: `Deleted category "${title}".` });
      } else {
        setFeedback({ type: "error", message: "Failed to delete category." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error deleting category." });
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedSectionId) {
      setFeedback({ type: "error", message: "Please select a category on the left first." });
      return;
    }

    if (!stem.trim()) {
      setFeedback({ type: "error", message: "Question stem cannot be empty. Please type a question." });
      return;
    }

    const filledOptions = options.filter((o) => o.text && o.text.trim());
    if (filledOptions.length < 2) {
      setFeedback({
        type: "error",
        message: "Please enter text for at least 2 multiple-choice options.",
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
            ? "Question updated successfully!"
            : "Question saved! Ready for next question below.",
        });
        await loadExamDetail(selectedSectionId);
        
        // Immediately ready the next question draft inside this same section
        handleNewQuestion(selectedSectionId);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          message: errData.error || "Failed to save question. Please try again.",
        });
      }
    } catch (err) {
      console.error("Failed to save question:", err);
      setFeedback({ type: "error", message: "Network error while saving question." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, { method: "DELETE" });
      if (res.ok) {
        setFeedback({ type: "success", message: "Question deleted successfully." });
        handleNewQuestion(selectedSectionId);
        await loadExamDetail(selectedSectionId);
      } else {
        setFeedback({ type: "error", message: "Failed to delete question." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error while deleting question." });
    }
  };

  if (loading || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center font-semibold text-slate-500">
          Loading Question Composer...
        </div>
      </div>
    );
  }

  const activeSection = exam.sections.find((s) => s.id === selectedSectionId) || exam.sections[0];
  const activeEmoji = activeSection ? getSubjectEmoji(activeSection.title) : "📁";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Studio Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Studio
          </Link>
          <span className="text-sm font-bold text-slate-800">
            {exam.title} <span className="font-mono text-xs text-brand-cyan">({exam.accessCode})</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/proctor/${exam.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-brand-orange hover:bg-orange-100 transition"
          >
            <Shield className="h-4 w-4" />
            Live Proctor
          </Link>
        </div>
      </header>

      {/* Main Composer Workspace */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Discord-Style Category & Channels Tree */}
        <aside className="w-full md:w-80 shrink-0 border-r border-slate-200 bg-white p-3 overflow-y-auto flex flex-col select-none">
          {/* Header Action */}
          <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-100">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Categories &amp; Questions
            </span>
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(true)}
              className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-brand-green hover:text-white transition cursor-pointer"
              title="Add Subject Category"
            >
              <Plus className="h-3.5 w-3.5" /> Category
            </button>
          </div>

          {/* Discord-Style Hierarchical Tree */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {exam.sections.map((sec) => {
              const isCollapsed = !!collapsedSections[sec.id];
              const isCurrentSection = selectedSectionId === sec.id;
              const emoji = getSubjectEmoji(sec.title);
              const isEditing = editingSectionId === sec.id;

              return (
                <div key={sec.id} className="space-y-0.5">
                  {/* Category Header (Discord Style: [Emoji] | [Name] ⌄) */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-900 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateSectionTitle(sec.id);
                          if (e.key === "Escape") setEditingSectionId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateSectionTitle(sec.id)}
                        className="rounded p-1 bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSectionId(null)}
                        className="rounded p-1 bg-slate-200 text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="group flex items-center justify-between px-2 py-1 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => toggleCategoryCollapse(sec.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-base shrink-0 leading-none">{emoji}</span>
                        <span className="text-slate-300 font-light">|</span>
                        <span className="truncate tracking-tight font-semibold text-slate-700">
                          {sec.title}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 group-hover:hidden">
                          {sec.questions.length}
                        </span>
                        {/* Hover Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          {/* Quick Add Question to this Section */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startDraftInSection(sec.id);
                            }}
                            className="p-1 rounded hover:bg-emerald-100 hover:text-emerald-700 text-slate-400 transition"
                            title={`Add new question to ${sec.title}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          {/* Rename Section */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSectionId(sec.id);
                              setEditingSectionTitle(sec.title);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                            title="Rename Category"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {/* Delete Section if Empty */}
                          {sec.questions.length === 0 && exam.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(sec.id, sec.title);
                              }}
                              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition"
                              title="Delete Empty Category"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nested Questions Channels (Shown when expanded) */}
                  {!isCollapsed && (
                    <div className="ml-2.5 pl-2.5 border-l-2 border-slate-100 space-y-0.5 pt-0.5">
                      {/* Committed Questions */}
                      {sec.questions.map((q, idx) => {
                        const isSelected = selectedQuestion?.id === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => loadQuestionIntoForm(q, sec.id)}
                            className={`w-full text-left flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white font-semibold shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <span className={`font-mono text-xs font-bold shrink-0 ${
                              isSelected ? "text-brand-green" : "text-slate-400"
                            }`}>
                              #
                            </span>
                            <span className="font-semibold shrink-0 text-[11px]">
                              Q{idx + 1}
                            </span>
                            <span className="truncate flex-1">
                              {q.stem}
                            </span>
                          </button>
                        );
                      })}

                      {/* LIVE REAL-TIME DRAFT CHANNEL */}
                      {isCurrentSection && !selectedQuestion && (
                        <div className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold shadow-xs">
                          <span className="font-mono text-xs font-bold text-emerald-600 shrink-0">
                            #
                          </span>
                          <span className="font-bold text-emerald-700 shrink-0 text-[11px]">
                            Q{sec.questions.length + 1}
                          </span>
                          <span className="truncate flex-1 text-slate-700 font-medium">
                            {stem.trim() || "(Live draft...)"}
                          </span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active Draft" />
                        </div>
                      )}

                      {/* Empty Category Prompt */}
                      {sec.questions.length === 0 && (!isCurrentSection || selectedQuestion) && (
                        <button
                          type="button"
                          onClick={() => startDraftInSection(sec.id)}
                          className="w-full text-left flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-emerald-700 transition"
                        >
                          <Plus className="h-3 w-3" /> Add first question
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
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
          <form onSubmit={handleSaveQuestion} className="max-w-4xl mx-auto space-y-6">
            {/* Header info & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedQuestion ? `Editing Question` : `Compose New Question`}
                  </h2>
                  {!selectedQuestion && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Mode
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Category Channel:</span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 text-xs font-bold text-slate-800">
                    <span>{activeEmoji}</span>
                    <span>|</span>
                    <span>{activeSection?.title || "No category selected"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedQuestion && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Question
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNewQuestion(selectedSectionId)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Clear / New
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : selectedQuestion ? "Update Question" : "Save Question"}
                </button>
              </div>
            </div>

            {/* Notification / Toast Banner */}
            {feedback && (
              <div
                className={`flex items-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold transition shadow-xs ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Math Macro Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="block text-[11px] font-bold uppercase text-slate-400 mb-2">
                KaTeX Formula Bar (Click symbol to insert into stem)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Fraction \\frac", macro: "$\\frac{a}{b}$" },
                  { label: "Square Root \\sqrt", macro: "$\\sqrt{x}$" },
                  { label: "Superscript x²", macro: "$x^2$" },
                  { label: "Subscript x_i", macro: "$x_i$" },
                  { label: "Integral \\int", macro: "$$\\int_{0}^{\\infty} f(x) dx$$" },
                  { label: "Sum \\sum", macro: "$$\\sum_{i=1}^{n} x_i$$" },
                  { label: "Matrix [M]", macro: "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$" },
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
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Stem Text Area */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Question Stem (Supports Markdown &amp; LaTeX $inline$ or $$display$$)
              </label>
              <textarea
                rows={4}
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder="Type question stem here. E.g. Simplify $\frac{p + \sqrt{p^2-q^2}}{p - \sqrt{p^2-q^2}}$..."
                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-relaxed focus:border-brand-green focus:outline-none"
              />

              {/* Real-Time Live KaTeX Preview */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Real-Time Live Preview
                </span>
                <div className="rounded-lg bg-slate-50 p-4 min-h-[50px] border border-slate-200/60">
                  <KaTeXRenderer content={stem || "Live formula preview will appear here..."} />
                </div>
              </div>
            </div>

            {/* Diagram URL Field */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Diagram / Vector Graphic URL (Optional)
              </label>
              <input
                type="text"
                value={diagramUrl}
                onChange={(e) => setDiagramUrl(e.target.value)}
                placeholder="https://example.com/diagram.png or image path"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />
              {diagramUrl && (
                <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={diagramUrl} alt="Diagram preview" className="max-h-40 object-contain" />
                </div>
              )}
            </div>

            {/* Options Manager */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Multiple Choice Options (Select radio to set authoritative answer key)
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
                    className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Choice
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${
                      opt.isCorrect
                        ? "border-brand-green bg-emerald-50/40"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    {/* Radio Button for Key Selection */}
                    <input
                      type="radio"
                      name="correctKey"
                      checked={opt.isCorrect}
                      onChange={() =>
                        setOptions((prev) =>
                          prev.map((o, i) => ({ ...o, isCorrect: i === optIdx }))
                        )
                      }
                      className="h-4 w-4 text-brand-green focus:ring-brand-green cursor-pointer"
                      title="Set as correct answer"
                    />

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((o, i) => (i === optIdx ? { ...o, text: val } : o))
                        );
                      }}
                      placeholder={`Choice ${optIdx + 1} text or formula (e.g. $\\frac{p^2}{q^2}$)`}
                      className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-green focus:outline-none"
                    />

                    {/* Mini KaTeX Preview */}
                    {opt.text && opt.text.includes("$") && (
                      <div className="px-2 py-1 bg-white rounded border border-slate-200 text-xs">
                        <KaTeXRenderer content={opt.text} />
                      </div>
                    )}

                    {/* Remove Option */}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((prev) => prev.filter((_, i) => i !== optIdx))
                        }
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Remove choice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation / Solution Note */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Solution Explanation (Disclosed on Student Scorecard post-submission)
              </label>
              <textarea
                rows={3}
                value={solutionExplanation}
                onChange={(e) => setSolutionExplanation(e.target.value)}
                placeholder="Step-by-step mathematical reasoning or physics derivation..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-green focus:outline-none"
              />
            </div>
          </form>
        </main>
      </div>

      {/* Add Category Presets Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-green" /> Add Category Channel
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Choose a standard subject category, or type a custom channel name below:
            </p>

            {/* Presets Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SUBJECT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCreateSection(preset.title)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-bold text-slate-800 hover:border-brand-green hover:bg-emerald-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base">{preset.emoji}</span>
                    <span className="truncate">{preset.title}</span>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom Category Input */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                Or Custom Category Name:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  placeholder="e.g. Updates, Social Science, Logic"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-green focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSection(customSectionInput);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCreateSection(customSectionInput)}
                  disabled={!customSectionInput.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
