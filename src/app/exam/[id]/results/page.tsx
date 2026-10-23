"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ScorecardTable } from "@/components/exam/ScorecardTable";
import { PortalHeader } from "@/components/shell/PortalHeader";
import { EvaluationResult } from "@/lib/types";

export default function ExamResultsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasUnsyncedAnswers, setHasUnsyncedAnswers] = useState(false);

  useEffect(() => {
    async function loadScorecard() {
      try {
        setHasUnsyncedAnswers(
          new URLSearchParams(window.location.search).get("answers") === "unsynced"
        );
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
      <div>
        <PortalHeader section="scorecard" showAuth={false} />
        <main className="score-state" aria-live="polite">
          <div className="retro-panel score-state__panel">
            <div className="score-spinner" aria-hidden="true" />
            <h1>evaluating examination results</h1>
            <p>your saved responses are being checked.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        <PortalHeader section="scorecard" showAuth={false} />
        <main className="score-state">
          <div className="retro-panel score-state__panel">
            <span className="portal-chip portal-chip--warning">report unavailable</span>
            <h1>result not available</h1>
            <p>{loadError || "this examination session could not be found or has not been evaluated yet."}</p>
            <Link href="/lobby" className="retro-btn mt-5 inline-flex px-4 py-2 text-xs font-bold">
              return to lobby
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return <ScorecardTable result={result} hasUnsyncedAnswers={hasUnsyncedAnswers} />;
}
