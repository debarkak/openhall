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
  Layers,
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

        if (!selectedQuestion && data.sections.length > 0) {
          const currentSec = data.sections.find((s) => s.id === targetSecId) || data.sections[0];
          if (currentSec && currentSec.questions.length > 0) {
            loadQuestionIntoForm(currentSec.questions[0]);
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

  const handleAddSection = async () => {
    const title = prompt("Enter new section name (e.g. Section 2, Physics, General):");
    if (!title || !title.trim()) return;

    try {
      const res = await fetch(`/api/admin/exams/${examId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (res.ok) {
        const newSec: SectionItem = await res.json();
        await loadExamDetail(newSec.id);
        setSelectedSectionId(newSec.id);
        handleNewQuestion();
        setFeedback({ type: "success", message: `Section "${newSec.title}" created successfully!` });
      } else {
        setFeedback({ type: "error", message: "Failed to create section." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error creating section." });
    }
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

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedSectionId) {
      setFeedback({ type: "error", message: "Please select a section on the left first." });
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
            : "New question composed and added to section!",
        });
        await loadExamDetail(selectedSectionId);
        if (savedData && savedData.id) {
          loadQuestionIntoForm(savedData);
        }
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
        {/* Left Sidebar: Section Tabs & Question Navigation Tree */}
        <aside className="w-full md:w-80 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sections ({exam.sections.length})
            </span>
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add Section
            </button>
          </div>

          {/* Section Selector */}
          <div className="mt-3 flex flex-col gap-1.5">
            {exam.sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSelectedSectionId(sec.id);
                  if (sec.questions.length > 0) {
                    loadQuestionIntoForm(sec.questions[0]);
                  } else {
                    handleNewQuestion();
                  }
                }}
                className={`flex items-center justify-between rounded-lg p-2.5 text-xs font-semibold transition ${
                  selectedSectionId === sec.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{sec.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  selectedSectionId === sec.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {sec.questions.length}
                </span>
              </button>
            ))}
          </div>

          {/* Question List in Active Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Questions ({activeSection?.questions.length || 0})
              </span>
              <button
                type="button"
                onClick={handleNewQuestion}
                className="flex items-center gap-1 rounded bg-brand-green/10 px-2 py-1 text-[11px] font-bold text-brand-green hover:bg-brand-green/20 transition"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>

            <div className="mt-2 space-y-1 max-h-[50vh] overflow-y-auto">
              {activeSection?.questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => loadQuestionIntoForm(q)}
                  className={`w-full text-left rounded-lg p-2 text-xs transition truncate block ${
                    selectedQuestion?.id === q.id
                      ? "bg-brand-green-light text-brand-green-text font-bold border border-brand-green-border"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className="font-mono">Q{idx + 1}:</span> {q.stem.substring(0, 35)}...
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center/Right: Visual Question Composer & Real-Time KaTeX Preview */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
          <form onSubmit={handleSaveQuestion} className="max-w-4xl mx-auto space-y-6">
            {/* Header info & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedQuestion ? `Editing Question` : `Compose New Question`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Section: <strong className="text-slate-700">{activeSection?.title}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedQuestion && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewQuestion}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Clear / New
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Question"}
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
    </div>
  );
}
