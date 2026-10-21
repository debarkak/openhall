import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, Download, FileText, CheckCircle2, Play } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CandidateLobbyPage() {
  // Fetch active session and exam details
  const session = await prisma.examSession.findUnique({
    where: { id: "session_demo_1" },
    include: {
      exam: {
        include: {
          sections: {
            select: { id: true, title: true, _count: { select: { questions: true } } },
          },
        },
      },
      candidate: true,
    },
  });

  const isCompleted = session?.status === "SUBMITTED" || session?.status === "EVALUATED";
  const totalQuestions =
    session?.exam.sections.reduce((acc, s) => acc + s._count.questions, 0) || 45;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">
              Open<span className="text-brand-green">Hall</span>
            </span>
          </Link>
          <span className="hidden sm:inline-block rounded bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            Student Portal
          </span>
        </div>

        {/* Candidate Profile Initials Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow-sm ring-2 ring-slate-200">
            DK
          </div>
          <span className="hidden md:inline-block text-sm font-semibold text-slate-700">
            Debarka Kundu
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Greeting Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green-text mb-3">
              Exam Hall Ready
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Hey! Debarka
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Your registered examination is prepared and scheduled. Please review test
              guidelines and ensure a quiet environment before starting.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isCompleted ? (
                <Link
                  href="/exam/session_demo_1/results"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-orange-hover active:scale-95 transition"
                >
                  <FileText className="h-4 w-4" />
                  Review Test Result
                </Link>
              ) : (
                <Link
                  href="/exam/session_demo_1/instructions"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Take Test Now
                </Link>
              )}

              <Link
                href="/studio"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Teacher Studio
              </Link>
            </div>
          </div>
        </div>

        {/* Assigned Test Series */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Assigned Examinations</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Test 1 Card */}
            <div className="flex flex-col justify-between rounded-xl border-2 border-brand-green/40 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-green-text">
                    Active Series
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    90 Mins
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Mock Test 1 - Grade 9
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {totalQuestions} Questions • MAT, Mathematics, Natural Sciences
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Code: <strong className="font-mono text-slate-800">OH-MOCK-09</strong>
                </span>
                {isCompleted ? (
                  <Link
                    href="/exam/session_demo_1/results"
                    className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orange-hover transition"
                  >
                    Review Test
                  </Link>
                ) : (
                  <Link
                    href="/exam/session_demo_1/instructions"
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    Take Test
                  </Link>
                )}
              </div>
            </div>

            {/* Test 2 Card (Upcoming) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm opacity-75">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Upcoming
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    90 Mins
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-700">
                  Mock Test 2 - Grade 9
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  45 Questions • Ratio, Geometry &amp; Chemistry Focus
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Scheduled for Oct 25</span>
                <span className="text-xs font-semibold text-slate-400">Locked</span>
              </div>
            </div>

            {/* Test 3 Card (Upcoming) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm opacity-75">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Upcoming
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    90 Mins
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-700">
                  Mock Test 3 - Grade 9
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  45 Questions • Advanced Polynomials &amp; Mechanics
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Scheduled for Nov 01</span>
                <span className="text-xs font-semibold text-slate-400">Locked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Resources & Syllabus Downloads */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800">
            Curriculum &amp; Reference Materials
          </h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="#syllabus"
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-brand-green" />
                <span className="text-sm font-semibold text-slate-700">
                  Grade 9 Complete Syllabus
                </span>
              </div>
              <Download className="h-4 w-4 text-slate-400" />
            </a>

            <a
              href="#papers"
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand-cyan" />
                <span className="text-sm font-semibold text-slate-700">
                  Previous Year Question Papers
                </span>
              </div>
              <Download className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
