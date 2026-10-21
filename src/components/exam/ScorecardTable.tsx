"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowLeft, Award, CheckCircle2 } from "lucide-react";
import { EvaluationResult } from "@/lib/types";

interface ScorecardTableProps {
  result: EvaluationResult;
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({ result }) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
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
    { label: "Correct Responses", value: result.correctResponses, highlight: "text-emerald-800 font-black" },
    { label: "Incorrect Responses", value: result.incorrectResponses, highlight: "text-red-700 font-black" },
    { label: "Unattempted Questions", value: result.unattemptedQuestions },
    {
      label: "Your Score",
      value: `${result.finalScore} / ${result.maxMarks}`,
      highlight: "text-lg font-black text-emerald-800",
      isTotal: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Classic 3D Scorecard Window */}
      <div className="retro-window overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Official Examination Scorecard &amp; Audit
            </span>
          </div>
          <span className="retro-btn px-2 py-0.5 text-[10px] text-slate-800">
            EVALUATED
          </span>
        </div>

        <div className="p-5 sm:p-7">
          {/* Top Banner Plaque */}
          <div className="retro-sunken bg-white p-6 text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Candidate Performance: {result.candidateName || "Debarka Kundu"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Evaluation complete for test paper:{" "}
              <strong className="text-slate-900">{result.examTitle}</strong>
            </p>

            {/* Score LCD Box */}
            <div className="mt-5 inline-block retro-sunken-dark px-8 py-3 text-center">
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                FINAL CALCULATED SCORE
              </span>
              <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 tracking-wider">
                {result.finalScore}
                <span className="text-base text-slate-400 font-normal"> / {result.maxMarks}</span>
              </span>
            </div>
          </div>

          {/* Performance Summary Table */}
          <div className="retro-panel p-4 mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-300 pb-2 mb-3">
              Detailed Metric Breakdown
            </div>

            <div className="retro-sunken bg-white overflow-hidden">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <tbody>
                  {metrics.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 last:border-0 ${
                        m.isTotal ? "bg-amber-50 font-bold" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-700">
                        {m.label}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-bold text-slate-900 ${
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

          {/* Navigation CTA */}
          <div className="flex justify-center">
            <Link
              href="/lobby"
              className="retro-btn-orange px-8 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Candidate Lobby
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardTable;
