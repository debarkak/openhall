"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowLeft, ChevronDown, CheckCircle2, XCircle, HelpCircle, BookOpen } from "lucide-react";
import { EvaluationResult } from "@/lib/types";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";

interface ScorecardTableProps {
  result: EvaluationResult;
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({ result }) => {
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    try {
      if (result.finalScore > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch {
      // Ignored if canvas is unavailable
    }
  }, [result.finalScore]);

  const metrics = [
    { label: "total questions", value: result.totalQuestions },
    { label: "max marks", value: result.maxMarks },
    { label: "answered", value: result.questionsAttempted },
    { label: "correct", value: result.correctResponses, highlight: "text-emerald-700 font-black" },
    { label: "wrong", value: result.incorrectResponses, highlight: "text-red-700 font-black" },
    { label: "unanswered", value: result.unattemptedQuestions },
    {
      label: "final score",
      value: `${result.finalScore} / ${result.maxMarks}`,
      highlight: "text-base font-black text-emerald-800",
      isTotal: true,
    },
  ];

  const hasReviews = result.questionReviews && result.questionReviews.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Scorecard Window */}
      <div className="retro-window overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <span className="text-xs font-bold tracking-wide">
            test results — {result.examTitle.toLowerCase()}
          </span>
          <span className="retro-btn px-2 py-0.5 text-[10px] text-slate-800">
            done
          </span>
        </div>

        <div className="p-5">
          {/* Top Banner */}
          <div className="retro-sunken bg-white p-5 text-center mb-5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {result.examTitle.toLowerCase()}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              candidate: {(result.candidateName || "student candidate").toLowerCase()}
            </p>

            {/* Score Box */}
            <div className="mt-4 inline-block retro-sunken-dark px-6 py-2.5 text-center">
              <span className="block text-[9px] font-bold tracking-wider text-slate-400">
                score
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-wider">
                {result.finalScore}
                <span className="text-sm text-slate-400 font-normal"> / {result.maxMarks}</span>
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="retro-panel p-3 mb-5">
            <div className="text-[11px] font-bold tracking-wider text-slate-700 pb-1.5 mb-2 border-b border-slate-300">
              breakdown
            </div>

            <div className="retro-sunken bg-white overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <tbody>
                  {metrics.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 last:border-0 ${
                        m.isTotal ? "bg-amber-50 font-bold" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-slate-600">
                        {m.label}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold text-slate-900 ${
                          m.highlight || ""
                        }`}
                      >
                        {m.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Optional Question & Solutions Review Viewer */}
          {hasReviews && (
            <div className="retro-panel p-3 mb-5">
              <button
                type="button"
                onClick={() => setShowReview((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-800 pb-1.5 border-b border-slate-300 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-700" />
                  solutions &amp; derivations review ({result.questionReviews!.length})
                </span>
                <span className="retro-btn px-2 py-0.5 text-[10px] inline-flex items-center gap-1 font-bold">
                  {showReview ? "hide solutions" : "review solutions"}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showReview ? "rotate-180" : ""}`} />
                </span>
              </button>

              {showReview && (
                <div className="space-y-3.5 mt-3">
                  {result.questionReviews!.map((qr) => (
                    <div key={qr.id} className="retro-sunken bg-white p-3.5 text-xs">
                      {/* Question meta header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="retro-btn px-2 py-0.5 font-bold text-slate-900">
                            q{qr.questionNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            section: {qr.sectionTitle.toLowerCase()}
                          </span>
                        </div>

                        {qr.isCorrect ? (
                          <span className="retro-btn bg-emerald-100 text-emerald-950 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            correct
                          </span>
                        ) : qr.isAttempted ? (
                          <span className="retro-btn bg-red-100 text-red-950 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-700" />
                            incorrect
                          </span>
                        ) : (
                          <span className="retro-btn bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                            <HelpCircle className="h-3 w-3 text-slate-500" />
                            unattempted
                          </span>
                        )}
                      </div>

                      {/* Question stem */}
                      <div className="text-slate-900 font-semibold mb-2.5">
                        <KaTeXRenderer content={qr.stem} />
                      </div>

                      {/* Answer Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                        <div className="retro-panel p-2">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            your choice:
                          </span>
                          <div className="text-slate-800">
                            {qr.selectedOptionText ? (
                              <KaTeXRenderer content={qr.selectedOptionText} />
                            ) : (
                              <span className="italic text-slate-400">no option picked</span>
                            )}
                          </div>
                        </div>

                        <div className="retro-panel p-2 bg-emerald-50 border-emerald-300">
                          <span className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                            correct answer:
                          </span>
                          <div className="text-emerald-950 font-bold">
                            <KaTeXRenderer content={qr.correctOptionText} />
                          </div>
                        </div>
                      </div>

                      {/* Solution explanation */}
                      {qr.solutionExplanation && (
                        <div className="retro-sunken bg-slate-50 p-2.5 border-t border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-700 mb-1">
                            mathematical derivation &amp; reasoning:
                          </span>
                          <div className="text-slate-700 text-[11px] leading-relaxed">
                            <KaTeXRenderer content={qr.solutionExplanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation CTA */}
          <div className="flex justify-center">
            <Link
              href="/lobby"
              className="retro-btn-green px-6 py-2 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              back to tests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardTable;
