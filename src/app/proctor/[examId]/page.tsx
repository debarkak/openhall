"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Radio,
  Shield,
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
      name: "candidate 01",
      status: "IN_PROGRESS",
      currentQuestion: "q1",
      violationsCount: 0,
      lastEvent: "connected to session",
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
          message: "proctor connected to live telemetry stream",
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
                    currentQuestion: `saved item`,
                    lastEvent: `saved answer for ${data.questionId}`,
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
                    lastEvent: `integrity alert: ${data.eventType.toLowerCase()}`,
                  }
                : c
            )
          );

          setTelemetryLogs((prev) => [
            {
              time,
              message: `[alert] ${(data.candidateName || "candidate").toLowerCase()} triggered ${data.eventType.toLowerCase()}`,
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
                    lastEvent: `finalized exam (score: ${data.finalScore}/${data.maxMarks})`,
                  }
                : c
            )
          );

          setTelemetryLogs((prev) => [
            {
              time,
              message: `[submission] ${(data.candidateName || "candidate").toLowerCase()} completed examination with ${data.finalScore} marks`,
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
    <div className="min-h-screen flex flex-col pb-8">
      {/* Top Header Bar */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-900 inline-flex items-center gap-1 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3 w-3" />
            studio
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-200" />
            <h1 className="text-xs sm:text-sm font-black text-white tracking-tight">
              live proctor cockpit
            </h1>
            <span
              className={`retro-btn px-2 py-0.5 text-[10px] font-bold ${
                isConnected ? "bg-emerald-100 text-emerald-950" : "bg-red-100 text-red-950"
              }`}
            >
              {isConnected ? "● live stream active" : "○ disconnected"}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-200 font-mono">
          exam id: <strong className="text-white">{examId}</strong>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <main className="mx-auto max-w-7xl w-full p-4 flex-1 flex flex-col lg:flex-row gap-4">
        {/* Left: Candidate Roster Table */}
        <div className="retro-window flex-1 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-slate-300">
            <h2 className="text-xs font-black tracking-wider text-slate-800 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-800" />
              active candidate sessions ({candidates.length})
            </h2>
          </div>

          <div className="retro-sunken bg-white overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-200 border-b-2 border-slate-300 text-slate-700 font-bold text-[10px]">
                  <th className="py-2.5 px-3">candidate</th>
                  <th className="py-2.5 px-3">status</th>
                  <th className="py-2.5 px-3">activity</th>
                  <th className="py-2.5 px-3">violations</th>
                  <th className="py-2.5 px-3 text-right">actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.sessionId}
                    className="border-b border-slate-200 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {c.name.toLowerCase()}
                      <span className="block text-[10px] font-mono text-slate-500 font-normal">
                        {c.sessionId}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold ${
                          c.status === "SUBMITTED"
                            ? "bg-slate-100 text-slate-700 border-slate-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-400"
                        }`}
                      >
                        {c.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 max-w-xs truncate">
                      {c.lastEvent?.toLowerCase()}
                    </td>
                    <td className="py-2 px-3">
                      {c.violationsCount > 0 ? (
                        <span className="retro-btn bg-red-100 text-red-950 px-1.5 py-0.5 text-[10px] font-black inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-700" />
                          {c.violationsCount} alert{c.violationsCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-semibold">clean</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => alert(`sent warning message to ${c.name}`)}
                        className="retro-btn px-2 py-0.5 text-[11px]"
                      >
                        warn
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`added +5 minutes to session deadline`)}
                        className="retro-btn-cyan px-2 py-0.5 text-[11px]"
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
        <div className="retro-window w-full lg:w-96 p-4 flex flex-col shrink-0">
          <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-slate-300">
            <h2 className="text-xs font-black tracking-wider text-slate-800 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-amber-700" />
              live telemetry stream
            </h2>
          </div>

          <div className="retro-sunken-dark flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh] font-mono text-xs">
            {telemetryLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-sans">
                awaiting telemetry events...
              </div>
            ) : (
              telemetryLogs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 border ${
                    log.type === "VIOLATION"
                      ? "border-red-500 bg-red-950 text-red-300 font-bold"
                      : log.type === "SUBMIT"
                      ? "border-emerald-500 bg-emerald-950 text-emerald-300 font-bold"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{log.type.toLowerCase()}</span>
                    <span>{log.time}</span>
                  </div>
                  <div className="leading-tight">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
