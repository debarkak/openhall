"use client";

import React, { useEffect, useState } from "react";
import { ScorecardTable } from "@/components/exam/ScorecardTable";
import { EvaluationResult } from "@/lib/types";

export default function ExamResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const sessionId = params.id;
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScorecard() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/scorecard`);
        if (res.ok) {
          const data: EvaluationResult = await res.json();
          setResult(data);
        }
      } catch (err) {
        console.error("scorecard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadScorecard();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
          <span className="text-sm font-semibold text-slate-600">
            evaluating examination results...
          </span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">result not available</h2>
          <p className="mt-1 text-sm text-slate-500">
            this examination session could not be found or has not been evaluated yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <ScorecardTable result={result} />
    </div>
  );
}
