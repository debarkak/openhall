"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Clock, ArrowRight, Shield, Trash2, Eye, Laptop } from "lucide-react";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";
import { SessionUser } from "@/lib/auth";

interface ExamItem {
  id: string;
  title: string;
  description?: string | null;
  accessCode: string;
  durationSeconds: number;
  positiveMarks: number;
  negativePenalty: number;
  isLive: boolean;
  sections: { id: string; title: string; questions: { id: string }[] }[];
  _count: { sessions: number };
}

export default function TeacherStudioPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("90");
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "UPCOMING">("ACTIVE");
  const [newCode, setNewCode] = useState("");

  const loadExams = async () => {
    try {
      const [examsRes, authRes] = await Promise.all([
        fetch("/api/admin/exams"),
        fetch("/api/auth/me").catch(() => null),
      ]);
      if (examsRes.ok) {
        const data = await examsRes.json();
        setExams(data);
      }
      if (authRes && authRes.ok) {
        const authData = await authRes.json();
        setCurrentUser(authData.user);
      }
    } catch (err) {
      console.error("failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.toLowerCase(),
          durationSeconds: parseInt(newDuration) * 60,
          accessCode: newCode ? newCode.toLowerCase() : undefined,
          isLive: newStatus === "ACTIVE",
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setNewTitle("");
        setNewCode("");
        setNewStatus("ACTIVE");
        loadExams();
      }
    } catch (err) {
      console.error("create exam failed:", err);
    }
  };

  const toggleExamLive = async (examId: string, currentLive: boolean) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: !currentLive }),
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, isLive: !currentLive } : e))
        );
      }
    } catch (err) {
      console.error("toggle live error:", err);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`are you sure you want to permanently delete "${title}"? this will remove all sections and candidate sessions.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        setExams((prev) => prev.filter((e) => e.id !== examId));
      }
    } catch (err) {
      console.error("delete exam error:", err);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Top Header */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-90">
            <Laptop className="h-4 w-4 text-sky-200" />
            <span className="text-sm font-black tracking-tight text-white">
              open<span className="text-emerald-300">hall</span>
            </span>
          </Link>
          <span className="retro-btn bg-slate-200 px-2 py-0.5 text-[10px] text-slate-800">
            teacher studio cms
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <span className="hidden sm:inline-block text-xs font-bold text-slate-200">
              {currentUser.name.toLowerCase()}
            </span>
          )}
          <Link
            href="/lobby"
            className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-900 inline-flex items-center gap-1.5 hover:bg-slate-100"
          >
            <Eye className="h-3.5 w-3.5" />
            candidate lobby
          </Link>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="retro-btn-green px-3 py-1 text-[11px] inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            new test
          </button>
          <AuthStatusButton user={currentUser} />
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="retro-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 mb-6">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              exam studio &amp; paper management
            </h1>
            <p className="text-xs text-slate-600">
              compose multi-section papers with visual latex formulas, manage access codes, and monitor telemetry.
            </p>
          </div>
          <div className="retro-sunken px-3 py-1 font-mono text-xs font-bold text-slate-800">
            total papers: {exams.length}
          </div>
        </div>

        {/* Exam Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="retro-sunken-dark inline-block p-4 font-mono text-xs text-emerald-400">
              loading examination registry...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const totalQuestions = exam.sections.reduce(
                (acc, s) => acc + s.questions.length,
                0
              );
              return (
                <div
                  key={exam.id}
                  className="retro-panel flex flex-col justify-between p-4"
                >
                  <div>
                    {/* Top Row: Code, Status Pill, and Duration */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                      <span className="retro-sunken px-2 py-0.5 text-[11px] font-mono font-bold text-sky-800">
                        {exam.accessCode.toLowerCase()}
                      </span>

                      {/* Status Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleExamLive(exam.id, exam.isLive)}
                        className={`retro-btn px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          exam.isLive ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-600"
                        }`}
                        title="click to toggle publication status"
                      >
                        {exam.isLive ? "● live" : "○ upcoming"}
                      </button>

                      <span className="text-[11px] font-mono font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(exam.durationSeconds / 60)}m
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 leading-snug">
                      {exam.title.toLowerCase()}
                    </h2>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {exam.sections.map((s) => (
                        <span
                          key={s.id}
                          className="retro-sunken px-1.5 py-0.5 text-[10px] font-bold text-slate-700 bg-white"
                        >
                          {s.title.toLowerCase()} ({s.questions.length})
                        </span>
                      ))}
                    </div>

                    <div className="retro-sunken bg-white p-2 mt-3 flex items-center justify-between text-[11px] text-slate-700">
                      <span><strong>{totalQuestions}</strong> questions</span>
                      <span><strong>{exam._count.sessions}</strong> enrolled</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/proctor/${exam.id}`}
                        className="retro-btn-cyan px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        proctor
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                        className="retro-btn p-1 text-red-700 hover:bg-red-100"
                        title="delete exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Link
                      href={`/studio/${exam.id}`}
                      className="retro-btn-orange px-3 py-1 text-[11px] inline-flex items-center gap-1 font-bold"
                    >
                      edit questions <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Exam Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="retro-window w-full max-w-sm overflow-hidden">
            <div className="retro-titlebar">
              <span className="text-xs font-bold tracking-wide">
                create new test
              </span>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  test title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. physics midterm, math quiz 1"
                  className="retro-field w-full text-xs p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="retro-field w-full text-xs p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  initial status
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewStatus("ACTIVE")}
                    className={`p-2 text-left rounded-md border text-xs font-bold cursor-pointer ${
                      newStatus === "ACTIVE"
                        ? "border-[#14532d] bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                    }`}
                  >
                    ● live
                    <span className="block font-normal text-[10px] text-slate-600 mt-0.5">
                      open in student lobby
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatus("UPCOMING")}
                    className={`p-2 text-left rounded-md border text-xs font-bold cursor-pointer ${
                      newStatus === "UPCOMING"
                        ? "border-amber-700 bg-amber-100 text-amber-900 ring-1 ring-amber-600"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                    }`}
                  >
                    ○ upcoming
                    <span className="block font-normal text-[10px] text-slate-600 mt-0.5">
                      locked until published
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  access code (optional)
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. quiz-01"
                  className="retro-field w-full font-mono text-xs p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="retro-btn px-3.5 py-1 text-xs"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="retro-btn-green px-4 py-1 text-xs font-bold"
                >
                  create test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
