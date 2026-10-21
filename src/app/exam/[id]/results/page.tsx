"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ScorecardTable } from "@/components/exam/ScorecardTable";
import { EvaluationResult } from "@/lib/types";

export default function ExamResultsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScorecard() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/scorecard`);
        if (res.ok) {
          const data: EvaluationResult = await res.json();
          setResult(data);
        } else if (res.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else {
          const data = await res.json().catch(() => ({}));
          setLoadError(data.error || "this scorecard is not available.");
        }
      } catch (err) {
        console.error("scorecard fetch error:", err);
        setLoadError("could not connect to the exam server. check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    loadScorecard();
  }, [sessionId, router]);

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
        <div className="retro-window p-6 text-center">
          <div className="retro-sunken bg-white p-5">
            <h2 className="text-lg font-bold text-slate-800">result not available</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loadError || "this examination session could not be found or has not been evaluated yet."}
            </p>
            <Link href="/lobby" className="retro-btn mt-4 inline-flex px-4 py-2 text-xs font-bold">
              return to lobby
            </Link>
          </div>
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
