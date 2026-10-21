import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, Download, FileText, Play, RotateCcw, Lock } from "lucide-react";
import { TakeExamButton } from "@/components/lobby/TakeExamButton";

export const dynamic = "force-dynamic";

export default async function CandidateLobbyPage() {
  // Find primary candidate
  let candidate = await prisma.user.findFirst({
    where: { role: "CANDIDATE" },
  });

  if (!candidate) {
    candidate = await prisma.user.create({
      data: {
        email: "debarkak@murena.io",
        name: "Debarka Kundu",
        role: "CANDIDATE",
      },
    });
  }

  // Fetch all real examinations from the database
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          _count: { select: { questions: true } },
        },
      },
      sessions: {
        where: { candidateId: candidate.id },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Find primary active/uncompleted exam for the top greeting CTA
  const inProgressExam = exams.find((e) => e.sessions[0]?.status === "IN_PROGRESS");
  const firstActiveExam = exams.find((e) => e.isLive && (!e.sessions[0] || e.sessions[0].status === "IN_PROGRESS"));
  const heroExam = inProgressExam || firstActiveExam || exams[0];
  const heroSession = heroExam?.sessions[0];
  const isHeroCompleted = heroSession?.status === "SUBMITTED" || heroSession?.status === "EVALUATED";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-xs">
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
            {candidate.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <span className="hidden md:inline-block text-sm font-semibold text-slate-700">
            {candidate.name}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Greeting Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-brand-green-light px-3 py-1 text-xs font-bold text-brand-green-text mb-3">
              Exam Hall Ready
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Hey! {candidate.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Your registered examinations are prepared and available in the hall. Please review guidelines and ensure a quiet environment before starting.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {heroExam && (
                <>
                  {isHeroCompleted ? (
                    <Link
                      href={`/exam/${heroSession?.id}/results`}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-orange-hover active:scale-95 transition"
                    >
                      <FileText className="h-4 w-4" />
                      Review Test Result
                    </Link>
                  ) : heroSession?.status === "IN_PROGRESS" ? (
                    <Link
                      href={`/exam/${heroSession.id}/player`}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Resume Test ({heroExam.title})
                    </Link>
                  ) : (
                    <TakeExamButton
                      examId={heroExam.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Take Test Now ({heroExam.title})
                    </TakeExamButton>
                  )}
                </>
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
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Assigned Examinations</h2>
              <p className="text-xs text-slate-500">Live &amp; scheduled mock test papers authored in OpenHall.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {exams.length} Test{exams.length === 1 ? "" : "s"} Available
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam) => {
              const session = exam.sessions[0];
              const isCompleted = session?.status === "SUBMITTED" || session?.status === "EVALUATED";
              const isInProgress = session?.status === "IN_PROGRESS";
              const totalQuestions = exam.sections.reduce(
                (acc, s) => acc + s._count.questions,
                0
              );
              const sectionNames = exam.sections.map((s) => s.title).join(", ") || "General";

              return (
                <div
                  key={exam.id}
                  className={`flex flex-col justify-between rounded-xl p-5 shadow-sm transition-all ${
                    exam.isLive
                      ? "border-2 border-brand-green/50 bg-white hover:border-brand-green"
                      : "border border-slate-200 bg-white/80 opacity-75"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          exam.isLive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {exam.isLive ? "Active Series" : "Upcoming"}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {Math.floor(exam.durationSeconds / 60)} Mins
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {totalQuestions} Question{totalQuestions === 1 ? "" : "s"} • {sectionNames}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">
                      Code: <strong className="font-mono text-slate-800">{exam.accessCode}</strong>
                    </span>

                    {exam.isLive ? (
                      <>
                        {isCompleted ? (
                          <Link
                            href={`/exam/${session.id}/results`}
                            className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orange-hover transition"
                          >
                            Review Test
                          </Link>
                        ) : isInProgress ? (
                          <Link
                            href={`/exam/${session.id}/player`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            <RotateCcw className="h-3 w-3" /> Resume
                          </Link>
                        ) : (
                          <TakeExamButton examId={exam.id} />
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <Lock className="h-3.5 w-3.5" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
