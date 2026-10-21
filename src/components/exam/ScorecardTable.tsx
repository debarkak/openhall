"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowLeft, CheckCircle2, Award } from "lucide-react";
import { EvaluationResult } from "@/lib/types";

interface ScorecardTableProps {
  result: EvaluationResult;
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({ result }) => {
  useEffect(() => {
    // Fire celebratory confetti on scorecard render
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if canvas is unavailable
    }
  }, []);

  const metrics = [
    { label: "Total Questions", value: result.totalQuestions },
    { label: "Maximum Marks", value: result.maxMarks },
    { label: "Questions Attempted", value: result.questionsAttempted },
    { label: "Correct Responses", value: result.correctResponses, highlight: "text-brand-green font-bold" },
    { label: "Incorrect Responses", value: result.incorrectResponses, highlight: "text-brand-orange font-bold" },
    { label: "Unattempted Questions", value: result.unattemptedQuestions },
    {
      label: "Your Score",
      value: `${result.finalScore} / ${result.maxMarks}`,
      highlight: "text-xl font-extrabold text-brand-green",
      isTotal: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      {/* Header Greeting Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-light text-brand-green">
          <Award className="h-8 w-8 text-brand-green-text" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
          Congratulations, {result.candidateName || "Candidate"}!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Your hard work &amp; dedication paid off. Here is your Result for{" "}
          <strong className="text-slate-800">{result.examTitle}</strong>.
        </p>

        {/* Big Score Display */}
        <div className="mt-6 inline-flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 px-8 py-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Final Score
          </span>
          <span className="text-3xl sm:text-4xl font-black text-brand-green">
            {result.finalScore}
            <span className="text-lg font-medium text-slate-400"> / {result.maxMarks}</span>
          </span>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Performance Breakdown
          </h2>
        </div>

        <table className="w-full text-left border-collapse">
          <tbody>
            {metrics.map((m, idx) => (
              <tr
                key={idx}
                className={`border-b border-slate-100 last:border-0 transition-colors ${
                  m.isTotal ? "bg-slate-50/50" : "hover:bg-slate-50/30"
                }`}
              >
                <td className="px-6 py-3.5 text-sm font-medium text-slate-600">
                  {m.label}
                </td>
                <td
                  className={`px-6 py-3.5 text-right text-sm font-semibold text-slate-800 ${
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

      {/* Back to Home CTA */}
      <div className="mt-8 flex justify-center">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-orange-hover active:scale-95 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back Home
        </Link>
      </div>
    </div>
  );
};

export default ScorecardTable;
