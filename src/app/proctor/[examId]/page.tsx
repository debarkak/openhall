"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Send,
  UserX,
} from "lucide-react";

interface LiveCandidate {
  sessionId: string;
  name: string;
  status: string;
  currentQuestion?: string;
  violationsCount: number;
  lastEvent?: string;
  score?: number;
}

export default function LiveProctorCockpitPage({
  params,
}: {
  params: { examId: string };
}) {
  const examId = params.examId;
  const [candidates, setCandidates] = useState<LiveCandidate[]>([
    {
      sessionId: "session_demo_1",
      name: "Debarka Kundu",
      status: "IN_PROGRESS",
      currentQuestion: "Q1",
      violationsCount: 0,
      lastEvent: "Connected to session",
    },
  ]);
  const [telemetryLogs, setTelemetryLogs] = useState<
    { time: string; message: string; type: string }[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to Server-Sent Events stream
    const eventSource = new EventSource(`/api/proctor/${examId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setTelemetryLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          message: "Proctor connected to live telemetry stream",
          type: "INFO",
        },
        ...prev,
      ]);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const time = new Date().toLocaleTimeString();

        if (data.type === "CANDIDATE_ATTEMPT") {
          setCandidates((prev) =>
            prev.map((c) =>
              c.sessionId === data.sessionId
                ? {
                    ...c,
                    currentQuestion: `Saved item`,
                    lastEvent: `Saved answer for ${data.questionId}`,
                  }
                : c
            )
          );
        } else if (data.type === "VIOLATION_EVENT") {
          setCandidates((prev) =>
            prev.map((c) =>
              c.sessionId === data.sessionId
                ? {
                    ...c,
                    violationsCount: c.violationsCount + 1,
                    lastEvent: `Integrity Alert: ${data.eventType}`,
                  }
                : c
            )
          );

          setTelemetryLogs((prev) => [
            {
              time,
              message: `[ALERT] ${data.candidateName || "Candidate"} triggered ${data.eventType}`,
              type: "VIOLATION",
            },
            ...prev,
          ]);
        } else if (data.type === "CANDIDATE_SUBMITTED") {
          setCandidates((prev) =>
            prev.map((c) =>
              c.sessionId === data.sessionId
                ? {
                    ...c,
                    status: "SUBMITTED",
                    score: data.finalScore,
                    lastEvent: `Finalized Exam (Score: ${data.finalScore}/${data.maxMarks})`,
                  }
                : c
            )
          );

          setTelemetryLogs((prev) => [
            {
              time,
              message: `[SUBMISSION] ${data.candidateName} completed examination with ${data.finalScore} marks`,
              type: "SUBMIT",
            },
            ...prev,
          ]);
        }
      } catch {
        // Ping or non-JSON chunk
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [examId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Studio
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Live Proctoring Cockpit
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                }`}
              />
              {isConnected ? "SSE Stream Active" : "Reconnecting"}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Exam Session Monitor: <strong className="text-slate-800">{examId}</strong>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <main className="mx-auto max-w-7xl w-full p-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left: Candidate Roster Table */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-green" />
              Active Candidates ({candidates.length})
            </h2>
          </div>

          <div className="mt-4 overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Activity</th>
                  <th className="py-3 px-3">Violations</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.sessionId}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {c.name}
                      <span className="block text-[11px] font-mono text-slate-400 font-normal">
                        {c.sessionId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                          c.status === "SUBMITTED"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {c.lastEvent}
                    </td>
                    <td className="py-3 px-3">
                      {c.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          {c.violationsCount} Alert{c.violationsCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Clean</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => alert(`Sent warning message to ${c.name}`)}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Warn
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Added +5 minutes to session deadline`)}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-cyan hover:bg-cyan-50 transition"
                      >
                        +5m
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Telemetry Audit Stream Log */}
        <div className="w-full lg:w-96 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col shrink-0">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Radio className="h-4 w-4 text-brand-orange" />
              Live Telemetry Feed
            </h2>
          </div>

          <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto max-h-[60vh] font-mono text-xs">
            {telemetryLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-sans">
                Awaiting telemetry events...
              </div>
            ) : (
              telemetryLogs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border ${
                    log.type === "VIOLATION"
                      ? "border-red-200 bg-red-50/60 text-red-800"
                      : log.type === "SUBMIT"
                      ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{log.type}</span>
                    <span>{log.time}</span>
                  </div>
                  <div>{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
