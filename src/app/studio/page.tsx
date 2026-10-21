"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Laptop, Clock, Users, ArrowRight, Shield, Play } from "lucide-react";

interface ExamItem {
  id: string;
  title: string;
  accessCode: string;
  durationSeconds: number;
  positiveMarks: number;
  negativePenalty: number;
  sections: { id: string; title: string; questions: { id: string }[] }[];
  _count: { sessions: number };
}

export default function TeacherStudioPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("90");
  const [newCode, setNewCode] = useState("");

  const loadExams = async () => {
    try {
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
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
          title: newTitle,
          durationSeconds: parseInt(newDuration) * 60,
          accessCode: newCode || undefined,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setNewTitle("");
        setNewCode("");
        loadExams();
      }
    } catch (err) {
      console.error("Create exam failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-8 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-black tracking-tight text-slate-900">
            Open<span className="text-brand-green">Hall</span>
          </Link>
          <span className="rounded bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-brand-orange">
            Teacher CMS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/lobby"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Switch to Candidate
          </Link>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-green px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover transition"
          >
            <Plus className="h-4 w-4" />
            Create Exam
          </button>
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Exam Studio &amp; Question Composer
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage multi-section test papers, edit LaTeX formulas, and monitor live candidate testing.
            </p>
          </div>
        </div>

        {/* Exam Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading examinations...</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const totalQuestions = exam.sections.reduce(
                (acc, s) => acc + s.questions.length,
                0
              );
              return (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-bold text-brand-cyan bg-cyan-50 px-2 py-0.5 rounded">
                        {exam.accessCode}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {Math.floor(exam.durationSeconds / 60)} Mins
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {exam.sections.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                        >
                          {s.title} ({s.questions.length})
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        <strong>{totalQuestions}</strong> Total Questions
                      </span>
                      <span>
                        <strong>{exam._count.sessions}</strong> Candidates Enrolled
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/proctor/${exam.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange hover:underline"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Live Proctor
                    </Link>

                    <Link
                      href={`/studio/${exam.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                    >
                      Edit Questions <ArrowRight className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Create New Examination</h3>
            <form onSubmit={handleCreateExam} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Examination Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mock Test 2 - Grade 9"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Access Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-green focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-green px-5 py-2 text-sm font-bold text-white hover:bg-brand-green-hover shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
