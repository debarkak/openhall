"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowLeft } from "lucide-react";
import { EvaluationResult } from "@/lib/types";

interface ScorecardTableProps {
  result: EvaluationResult;
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({ result }) => {
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

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
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
              candidate: {(result.candidateName || "debarka kundu").toLowerCase()}
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
