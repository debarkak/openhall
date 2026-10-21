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
  BookOpen,
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
  { title: "Mental Ability Test (MAT)", category: "Aptitude", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { title: "Mathematics", category: "Math", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { title: "Physics", category: "Science", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { title: "Chemistry", category: "Science", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { title: "Biology", category: "Science", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { title: "Natural Sciences", category: "Science", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { title: "English & Verbal Ability", category: "Languages", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { title: "General Knowledge (GK)", category: "General", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

function getCategoryBadge(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("mental") || lower.includes("mat") || lower.includes("reasoning") || lower.includes("aptitude") || lower.includes("logic")) {
    return { label: "MAT", color: "bg-purple-100 text-purple-800 border-purple-300" };
  }
  if (lower.includes("math") || lower.includes("calculus") || lower.includes("algebra") || lower.includes("geometry")) {
    return { label: "MATH", color: "bg-cyan-100 text-cyan-800 border-cyan-300" };
  }
  if (lower.includes("physic") || lower.includes("mechanic")) {
    return { label: "PHYSICS", color: "bg-blue-100 text-blue-800 border-blue-300" };
  }
  if (lower.includes("chem") || lower.includes("organic")) {
    return { label: "CHEMISTRY", color: "bg-amber-100 text-amber-800 border-amber-300" };
  }
  if (lower.includes("bio") || lower.includes("botany") || lower.includes("zoology")) {
    return { label: "BIOLOGY", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  }
  if (lower.includes("science")) {
    return { label: "SCIENCES", color: "bg-teal-100 text-teal-800 border-teal-300" };
  }
  if (lower.includes("english") || lower.includes("verbal")) {
    return { label: "ENGLISH", color: "bg-indigo-100 text-indigo-800 border-indigo-300" };
  }
  return { label: "GENERAL", color: "bg-slate-100 text-slate-800 border-slate-300" };
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

        if (data.sections.length > 0) {
          const currentSec = data.sections.find((s) => s.id === targetSecId) || data.sections[0];
          if (!selectedQuestion && currentSec && currentSec.questions.length > 0) {
            // Keep on draft unless explicitly editing
          }
        }
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

  const loadQuestionIntoForm = (q: QuestionItem) => {
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

  const handleNewQuestion = () => {
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
        setSelectedSectionId(newSec.id);
        handleNewQuestion();
        setFeedback({ type: "success", message: `Category "${newSec.title}" created successfully!` });
      } else {
        setFeedback({ type: "error", message: "Failed to create section." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error creating section." });
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
        setFeedback({ type: "success", message: "Section category renamed." });
      } else {
        setFeedback({ type: "error", message: "Failed to rename section." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error updating section." });
    }
  };

  const handleDeleteSection = async (secId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" and all its questions?`)) return;

    try {
      const res = await fetch(`/api/admin/sections/${secId}`, { method: "DELETE" });
      if (res.ok) {
        await loadExamDetail();
        handleNewQuestion();
        setFeedback({ type: "success", message: `Deleted section "${title}".` });
      } else {
        setFeedback({ type: "error", message: "Failed to delete section." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error deleting section." });
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedSectionId) {
      setFeedback({ type: "error", message: "Please select a section category on the left first." });
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
        const savedData: QuestionItem = await res.json();
        setFeedback({
          type: "success",
          message: selectedQuestion
            ? "Question updated successfully!"
            : "Question saved! Ready to compose the next question below.",
        });
        await loadExamDetail(selectedSectionId);
        
        // Immediately ready the next question draft for continuous writing
        handleNewQuestion();
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
        handleNewQuestion();
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
  const activeBadge = activeSection ? getCategoryBadge(activeSection.title) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Studio Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
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
        {/* Left Sidebar: Section Categories & Question Navigation Tree */}
        <aside className="w-full md:w-80 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto flex flex-col">
          {/* Section Categories Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Subject Categories ({exam.sections.length})
            </span>
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>

          {/* Section Categories List */}
          <div className="mt-3 flex flex-col gap-2">
            {exam.sections.map((sec) => {
              const badge = getCategoryBadge(sec.title);
              const isSelected = selectedSectionId === sec.id;
              const isEditing = editingSectionId === sec.id;

              return (
                <div
                  key={sec.id}
                  className={`group relative rounded-xl border p-2.5 transition ${
                    isSelected
                      ? "border-slate-800 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:outline-none"
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
                        title="Save name"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSectionId(null)}
                        className="rounded p-1 bg-slate-200 text-slate-600 hover:bg-slate-300"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        handleNewQuestion();
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isSelected ? "bg-white/20 text-white border-white/30" : badge.color
                        }`}>
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {sec.questions.length} items
                          </span>
                          {/* Rename Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSectionId(sec.id);
                              setEditingSectionTitle(sec.title);
                            }}
                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                              isSelected ? "hover:bg-white/20 text-white" : "hover:bg-slate-100 text-slate-400"
                            }`}
                            title="Rename Section"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {/* Delete Trigger if empty */}
                          {sec.questions.length === 0 && exam.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(sec.id, sec.title);
                              }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete empty section"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="mt-1 text-xs font-bold truncate">
                        {sec.title}
                      </h4>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Question List in Active Section */}
          <div className="mt-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Questions ({activeSection?.questions.length || 0})
              </span>
              <button
                type="button"
                onClick={handleNewQuestion}
                className="flex items-center gap-1 rounded bg-brand-green/10 px-2 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 transition cursor-pointer"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>

            <div className="mt-2 space-y-1.5 max-h-[48vh] overflow-y-auto pr-1">
              {/* Existing Committed Questions */}
              {activeSection?.questions.map((q, idx) => {
                const isSelected = selectedQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => loadQuestionIntoForm(q)}
                    className={`w-full text-left rounded-lg p-2.5 text-xs transition block cursor-pointer ${
                      isSelected
                        ? "bg-brand-green-light text-brand-green-text font-bold border border-brand-green-border shadow-xs"
                        : "text-slate-700 hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">Q{idx + 1}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {q.options.length} choices
                      </span>
                    </div>
                    <p className="mt-1 truncate text-slate-600">
                      {q.stem}
                    </p>
                  </button>
                );
              })}

              {/* LIVE REAL-TIME DRAFT INDICATOR */}
              {!selectedQuestion && (
                <div className="w-full text-left rounded-lg p-2.5 text-xs transition border-2 border-dashed border-brand-green bg-emerald-50/60 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand-green-text">
                      Q{(activeSection?.questions.length || 0) + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Live Draft
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium text-slate-800">
                    {stem.trim() || "(Type question stem below...)"}
                  </p>
                  {options.some((o) => o.text.trim()) && (
                    <span className="mt-1 block text-[10px] text-emerald-700 font-medium">
                      {options.filter((o) => o.text.trim()).length} choices configured
                    </span>
                  )}
                </div>
              )}
            </div>
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
                  <span className="text-xs text-slate-500">Target Category:</span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    activeBadge ? activeBadge.color : "bg-slate-100 text-slate-700"
                  }`}>
                    {activeSection?.title || "No category"}
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
                  onClick={handleNewQuestion}
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

      {/* Add Section Preset Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-green" /> Add Subject Category
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
              Select a standard examination category preset, or type your own custom subject name below:
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
                  <span className="truncate">{preset.title}</span>
                  <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom Section Title Input */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                Or Custom Subject Name:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  placeholder="e.g. Social Studies, Section 3"
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
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
