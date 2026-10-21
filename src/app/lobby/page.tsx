import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookOpen, Download, FileText, Play, RotateCcw, Lock, GraduationCap, Shield } from "lucide-react";
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

  // Find primary active/uncompleted exam for top greeting CTA
  const inProgressExam = exams.find((e) => e.sessions[0]?.status === "IN_PROGRESS");
  const firstActiveExam = exams.find((e) => e.isLive && (!e.sessions[0] || e.sessions[0].status === "IN_PROGRESS"));
  const heroExam = inProgressExam || firstActiveExam || exams[0];
  const heroSession = heroExam?.sessions[0];
  const isHeroCompleted = heroSession?.status === "SUBMITTED" || heroSession?.status === "EVALUATED";

  return (
    <div className="min-h-screen pb-12">
      {/* Top Classic Desktop Header */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-90">
            <GraduationCap className="h-4 w-4 text-sky-200" />
            <span className="text-sm font-black tracking-tight text-white">
              Open<span className="text-emerald-300">Hall</span>
            </span>
          </Link>
          <span className="retro-btn bg-slate-200 px-2 py-0.5 text-[10px] text-slate-800">
            CANDIDATE DESK
          </span>
        </div>

        {/* Candidate Profile Info */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-xs font-bold text-slate-200">
            {candidate.name}
          </span>
          <div className="retro-btn flex h-7 w-7 items-center justify-center text-xs font-black text-slate-800">
            {candidate.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <Link
            href="/studio"
            className="retro-btn px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
          >
            Studio &rarr;
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Greeting Banner Window */}
        <div className="retro-window p-4 sm:p-6 mb-8">
          <div className="retro-sunken bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="retro-btn bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[11px] font-black">
                  TEST HALL READY
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Zero-Trust Client Active
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-600">
                SYSTEM ID: CANDIDATE-{candidate.id.slice(-6).toUpperCase()}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back, {candidate.name.split(" ")[0]}!
            </h1>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed max-w-2xl">
              All official mock tests and scheduled exam papers are synced below. Once you click &quot;Take Test&quot;, your browser will enter locked full-screen mode.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {heroExam && (
                <>
                  {isHeroCompleted ? (
                    <Link
                      href={`/exam/${heroSession?.id}/results`}
                      className="retro-btn-orange px-5 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Review Test Result ({heroExam.title})
                    </Link>
                  ) : heroSession?.status === "IN_PROGRESS" ? (
                    <Link
                      href={`/exam/${heroSession.id}/player`}
                      className="retro-btn-green px-5 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Resume Test ({heroExam.title})
                    </Link>
                  ) : (
                    <TakeExamButton
                      examId={heroExam.id}
                      className="retro-btn-green px-5 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Take Test Now ({heroExam.title})
                    </TakeExamButton>
                  )}
                </>
              )}

              <Link
                href="/studio"
                className="retro-btn px-4 py-2 text-xs sm:text-sm"
              >
                Teacher Studio
              </Link>
            </div>
          </div>
        </div>

        {/* Assigned Test Series */}
        <div className="mb-8">
          <div className="retro-panel flex items-center justify-between px-4 py-2.5 mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                Assigned Examination Papers
              </h2>
              <p className="text-[11px] text-slate-600">
                Official test series authored in the OpenHall teacher studio.
              </p>
            </div>
            <span className="retro-sunken px-2.5 py-1 text-xs font-bold text-slate-800">
              {exams.length} Test{exams.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="retro-panel flex flex-col justify-between p-4"
                >
                  <div>
                    {/* Header bar within card */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                          exam.isLive
                            ? "bg-emerald-200 text-emerald-900 border-emerald-400"
                            : "bg-slate-200 text-slate-600 border-slate-400"
                        }`}
                      >
                        {exam.isLive ? "LIVE NOW" : "UPCOMING"}
                      </span>
                      <span className="retro-sunken px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-700">
                        {Math.floor(exam.durationSeconds / 60)} MINS
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {totalQuestions} Question{totalQuestions === 1 ? "" : "s"} • {sectionNames}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-300 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 font-mono">
                      CODE: {exam.accessCode}
                    </span>

                    {exam.isLive ? (
                      <>
                        {isCompleted ? (
                          <Link
                            href={`/exam/${session.id}/results`}
                            className="retro-btn-orange px-3 py-1 text-xs"
                          >
                            Result
                          </Link>
                        ) : isInProgress ? (
                          <Link
                            href={`/exam/${session.id}/player`}
                            className="retro-btn-green px-3 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Resume
                          </Link>
                        ) : (
                          <TakeExamButton examId={exam.id} />
                        )}
                      </>
                    ) : (
                      <span className="retro-btn px-2.5 py-1 text-[11px] text-slate-500 inline-flex items-center gap-1 opacity-70">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Resources & Syllabus Downloads */}
        <div className="retro-window p-4">
          <div className="retro-titlebar mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">
              Examination Documents &amp; Instructions
            </span>
            <BookOpen className="h-3.5 w-3.5 text-sky-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="#syllabus"
              className="retro-panel flex items-center justify-between p-3 hover:bg-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-emerald-800" />
                <span className="text-xs font-bold text-slate-800">
                  Official Syllabus &amp; Blueprint
                </span>
              </div>
              <Download className="h-3.5 w-3.5 text-slate-600" />
            </a>

            <a
              href="#papers"
              className="retro-panel flex items-center justify-between p-3 hover:bg-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-sky-800" />
                <span className="text-xs font-bold text-slate-800">
                  Sample Pattern &amp; Question Papers
                </span>
              </div>
              <Download className="h-3.5 w-3.5 text-slate-600" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
