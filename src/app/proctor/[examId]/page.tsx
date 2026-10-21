"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  lastActivityAt: string;
  score?: number;
}

interface TelemetryLog {
  id: string;
  timestamp: string;
  time: string;
  message: string;
  type: string;
}

function mergeCandidates(
  current: LiveCandidate[],
  incoming: LiveCandidate[]
): LiveCandidate[] {
  const bySession = new Map(incoming.map((candidate) => [candidate.sessionId, candidate]));

  for (const candidate of current) {
    const snapshot = bySession.get(candidate.sessionId);
    if (!snapshot || candidate.lastActivityAt > snapshot.lastActivityAt) {
      bySession.set(candidate.sessionId, candidate);
    }
  }

  return Array.from(bySession.values()).sort((a, b) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt)
  );
}

function mergeTelemetryLogs(current: TelemetryLog[], incoming: TelemetryLog[]): TelemetryLog[] {
  const byId = new Map(incoming.map((log) => [log.id, log]));
  for (const log of current) {
    if (!byId.has(log.id)) byId.set(log.id, log);
  }
  return Array.from(byId.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);
}

export default function LiveProctorCockpitPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;
  const [candidates, setCandidates] = useState<LiveCandidate[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const loadSnapshot = async () => {
      try {
        const res = await fetch(`/api/admin/exams/${examId}/proctor`);
        if (res.status === 401) {
          const destination = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
          return;
        }
        if (res.status === 403) {
          window.location.assign("/lobby");
          return;
        }
        if (!res.ok) throw new Error("failed to load proctor snapshot");

        const snapshot: {
          candidates: LiveCandidate[];
          logs: { id: string; timestamp: string; candidateName: string; eventType: string }[];
        } = await res.json();
        if (disposed) return;

        setCandidates((current) => mergeCandidates(current, snapshot.candidates));
        const snapshotLogs = snapshot.logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          time: new Date(log.timestamp).toLocaleTimeString(),
          message: `[alert] ${log.candidateName.toLowerCase()} triggered ${log.eventType.toLowerCase()}`,
          type: "VIOLATION",
        }));
        setTelemetryLogs((current) => mergeTelemetryLogs(current, snapshotLogs));
        setSnapshotError(null);
      } catch {
        if (!disposed) setSnapshotError("could not load recent candidate activity");
      }
    };

    const updateCandidate = (
      sessionId: string,
      patch: Partial<LiveCandidate> & {
        candidateName?: string;
        timestamp?: string;
        violationIncrement?: number;
      }
    ) => {
      const timestamp = patch.timestamp || new Date().toISOString();
      setCandidates((current) => {
        const existing = current.find((candidate) => candidate.sessionId === sessionId);
        return mergeCandidates(current, [{
          sessionId,
          name: patch.candidateName || patch.name || existing?.name || "candidate",
          status: patch.status || existing?.status || "IN_PROGRESS",
          currentQuestion: patch.currentQuestion ?? existing?.currentQuestion,
          violationsCount: patch.violationIncrement
            ? (existing?.violationsCount || 0) + patch.violationIncrement
            : patch.violationsCount ?? existing?.violationsCount ?? 0,
          lastEvent: patch.lastEvent ?? existing?.lastEvent,
          lastActivityAt: timestamp,
          score: patch.score ?? existing?.score,
        }]);
      });
    };

    const addLog = (log: TelemetryLog) => {
      setTelemetryLogs((current) => mergeTelemetryLogs(current, [log]));
    };

    void loadSnapshot();

    // Subscribe before loading the snapshot so live events during the fetch are retained.
    const eventSource = new EventSource(`/api/proctor/${examId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
      const timestamp = new Date().toISOString();
      addLog({
        id: `connected-${timestamp}`,
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
        message: "proctor connected to live telemetry stream",
        type: "INFO",
      });
      void loadSnapshot();
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.sessionId) return;
        const timestamp = data.timestamp || new Date().toISOString();
        const time = new Date(timestamp).toLocaleTimeString();

        if (data.type === "CANDIDATE_ENROLLED") {
          updateCandidate(data.sessionId, {
            candidateName: data.candidateName,
            status: data.status || "IN_PROGRESS",
            lastEvent: "joined the exam",
            timestamp,
          });
        } else if (data.type === "CANDIDATE_ATTEMPT") {
          updateCandidate(data.sessionId, {
            candidateName: data.candidateName,
            currentQuestion: data.currentQuestion,
            lastEvent: `saved answer for ${data.currentQuestion || data.questionId}`,
            timestamp,
          });
        } else if (data.type === "VIOLATION_EVENT") {
          updateCandidate(data.sessionId, {
            candidateName: data.candidateName,
            violationIncrement: 1,
            lastEvent: `integrity alert: ${data.eventType.toLowerCase()}`,
            timestamp,
          });

          addLog({
            id: data.logId || `violation-${data.sessionId}-${timestamp}`,
            timestamp,
            time,
            message: `[alert] ${(data.candidateName || "candidate").toLowerCase()} triggered ${data.eventType.toLowerCase()}`,
            type: "VIOLATION",
          });
        } else if (data.type === "CANDIDATE_SUBMITTED") {
          updateCandidate(data.sessionId, {
            candidateName: data.candidateName,
            status: "EVALUATED",
            score: data.finalScore,
            lastEvent: `finalized exam (score: ${data.finalScore}/${data.maxMarks})`,
            timestamp,
          });

          addLog({
            id: `submission-${data.sessionId}-${timestamp}`,
            timestamp,
            time,
            message: `[submission] ${(data.candidateName || "candidate").toLowerCase()} completed examination with ${data.finalScore} marks`,
            type: "SUBMIT",
          });
        } else if (data.type === "CANDIDATE_DISQUALIFIED") {
          updateCandidate(data.sessionId, {
            candidateName: data.candidateName,
            status: "DISQUALIFIED",
            score: 0,
            lastEvent: "candidate disqualified",
            timestamp,
          });

          addLog({
            id: `disqualified-${data.sessionId}-${timestamp}`,
            timestamp,
            time,
            message: `[disqualification] ${(data.candidateName || "candidate").toLowerCase()} was disqualified`,
            type: "DISQUALIFIED",
          });
        }
      } catch {
        // Ping or non-JSON chunk
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      disposed = true;
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
              candidate sessions ({candidates.length})
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
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 px-3 text-center text-slate-500">
                      {snapshotError || "no candidate sessions for this exam yet"}
                    </td>
                  </tr>
                )}
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
                          c.status === "DISQUALIFIED"
                            ? "bg-red-100 text-red-900 border-red-400"
                            : c.status === "SUBMITTED" || c.status === "EVALUATED"
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
              telemetryLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 border ${
                    log.type === "VIOLATION"
                      ? "border-red-500 bg-red-950 text-red-300 font-bold"
                      : log.type === "DISQUALIFIED"
                      ? "border-red-600 bg-red-950 text-red-200 font-bold"
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
