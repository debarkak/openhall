"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  HelpCircle,
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
    { orderIndex: 0, text: "Option A", isCorrect: true },
    { orderIndex: 1, text: "Option B", isCorrect: false },
    { orderIndex: 2, text: "Option C", isCorrect: false },
    { orderIndex: 3, text: "Option D", isCorrect: false },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const loadExamDetail = async () => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      if (res.ok) {
        const data: ExamDetail = await res.json();
        setExam(data);
        if (data.sections.length > 0 && !selectedSectionId) {
          setSelectedSectionId(data.sections[0].id);
          if (data.sections[0].questions.length > 0) {
            loadQuestionIntoForm(data.sections[0].questions[0]);
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
    setOptions([
      { orderIndex: 0, text: "", isCorrect: true },
      { orderIndex: 1, text: "", isCorrect: false },
      { orderIndex: 2, text: "", isCorrect: false },
      { orderIndex: 3, text: "", isCorrect: false },
    ]);
  };

  // Math Macro Insertion Helper
  const insertMacro = (macro: string) => {
    setStem((prev) => prev + macro);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !stem) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/sections/${selectedSectionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stem,
          diagramUrl: diagramUrl || null,
          solutionExplanation: solutionExplanation || null,
          options,
        }),
      });

      if (res.ok) {
        await loadExamDetail();
        alert("Question saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save question:", err);
    } finally {
      setIsSaving(false);
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

  const activeSection = exam.sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Studio Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
              Sections
            </span>
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
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  selectedSectionId === sec.id
                    ? "bg-brand-cyan-tab text-slate-900 border border-brand-cyan-border shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{sec.title}</span>
                <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
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
                className="flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline"
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
            {/* Header info */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedQuestion ? `Editing Question` : `Compose New Question`}
              </h2>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Question"}
              </button>
            </div>

            {/* Math Macro Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="block text-[11px] font-bold uppercase text-slate-400 mb-2">
                KaTeX Formula Bar (Click to insert)
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
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
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
                required
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder="Type question stem here. E.g. Simplify $\frac{p + \sqrt{p^2-q^2}}{p - \sqrt{p^2-q^2}}$..."
                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-relaxed focus:border-brand-green focus:outline-none"
              />

              {/* Real-Time Live KaTeX Preview */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
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
                type="url"
                value={diagramUrl}
                onChange={(e) => setDiagramUrl(e.target.value)}
                placeholder="https://example.com/diagram.png (PNG, SVG, WebP)"
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
                  Multiple Choice Options (Select radio to designate Authoritative Answer Key)
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
                    className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Choice
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50"
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
                      required
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
                    {opt.text.includes("$") && (
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
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Solution Explanation Editor */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Solution Explanation (Shown to students during post-exam review)
              </label>
              <textarea
                rows={3}
                value={solutionExplanation}
                onChange={(e) => setSolutionExplanation(e.target.value)}
                placeholder="Explain the derivation or reasoning for candidate remediation..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-green focus:outline-none"
              />
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
