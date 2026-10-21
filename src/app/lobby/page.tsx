import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Play, RotateCcw, Lock, GraduationCap, FileText, Info, ShieldAlert } from "lucide-react";
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
      {/* Top Header */}
      <header className="retro-titlebar sticky top-0 z-30 h-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-90">
            <GraduationCap className="h-4 w-4 text-sky-200" />
            <span className="text-sm font-black tracking-tight text-white">
              Open<span className="text-emerald-300">Hall</span>
            </span>
          </Link>
          <span className="retro-btn bg-slate-200 px-2 py-0.5 text-[10px] text-slate-800">
            STUDENT LOBBY
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
        {/* Welcome & Featured Test Banner */}
        <div className="retro-window p-4 sm:p-5 mb-6">
          <div className="retro-sunken bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
              <span className="retro-btn bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">
                CANDIDATE: {candidate.name}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {exams.length} Test{exams.length === 1 ? "" : "s"} Available
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Exam Lobby
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Select an exam below to begin. Once launched, tests run in fullscreen mode. Keep your focus on the test window to avoid integrity warnings.
            </p>

            {heroExam && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5">
                {isHeroCompleted ? (
                  <Link
                    href={`/exam/${heroSession?.id}/results`}
                    className="retro-btn-orange px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Result ({heroExam.title})
                  </Link>
                ) : heroSession?.status === "IN_PROGRESS" ? (
                  <Link
                    href={`/exam/${heroSession.id}/player`}
                    className="retro-btn-green px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Resume ({heroExam.title})
                  </Link>
                ) : (
                  <TakeExamButton
                    examId={heroExam.id}
                    className="retro-btn-green px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Start {heroExam.title}
                  </TakeExamButton>
                )}

                <Link
                  href="/studio"
                  className="retro-btn px-3.5 py-1.5 text-xs font-bold"
                >
                  Create New Test in Studio
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Test Series */}
        <div className="mb-6">
          <div className="retro-panel flex items-center justify-between px-4 py-2 mb-3">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
              Tests
            </h2>
            <span className="retro-sunken px-2 py-0.5 text-xs font-bold text-slate-700">
              {exams.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                  className="retro-panel flex flex-col justify-between p-3.5"
                >
                  <div>
                    {/* Header bar within card */}
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${
                          exam.isLive
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : "bg-slate-200 text-slate-600 border-slate-300"
                        }`}
                      >
                        {exam.isLive ? "LIVE" : "LOCKED"}
                      </span>
                      <span className="retro-sunken px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                        {Math.floor(exam.durationSeconds / 60)} Mins
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                      {totalQuestions} Question{totalQuestions === 1 ? "" : "s"} • {sectionNames}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-300 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-600">
                      CODE: <strong>{exam.accessCode}</strong>
                    </span>

                    {exam.isLive ? (
                      <>
                        {isCompleted ? (
                          <Link
                            href={`/exam/${session.id}/results`}
                            className="retro-btn-orange px-2.5 py-1 text-xs"
                          >
                            Result
                          </Link>
                        ) : isInProgress ? (
                          <Link
                            href={`/exam/${session.id}/player`}
                            className="retro-btn-green px-2.5 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Resume
                          </Link>
                        ) : (
                          <TakeExamButton examId={exam.id} />
                        )}
                      </>
                    ) : (
                      <span className="retro-btn px-2 py-0.5 text-[10px] text-slate-500 inline-flex items-center gap-1 opacity-70">
                        <Lock className="h-3 w-3" /> Upcoming
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Instructions / Ground Rules Box */}
        <div className="retro-window p-3.5">
          <div className="retro-titlebar mb-2.5 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-sky-200" />
              Test Guidelines &amp; Anti-Cheat Rules
            </span>
          </div>

          <div className="retro-sunken bg-white p-3 space-y-1.5 text-xs text-slate-700">
            <p>• <strong>Fullscreen Enforcement:</strong> Tests run full-screen. Pressing Esc will pause the test behind a lockout screen until you re-enter fullscreen.</p>
            <p>• <strong>No Tab Switching:</strong> Alt-Tab or switching away from the exam tab logs a violation strike. 3 strikes will submit and disqualify the exam.</p>
            <p>• <strong>Free Navigation:</strong> You can jump between sections and questions at any time using the palette on the right.</p>
            <p>• <strong>Saving:</strong> Click <strong>[Save &amp; Next]</strong> to record answers.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
