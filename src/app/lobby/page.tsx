import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { ExamCatalog, type LobbyExam } from "@/components/lobby/ExamCatalog";
import { TakeExamButton } from "@/components/lobby/TakeExamButton";
import { PortalHeader } from "@/components/shell/PortalHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CandidateLobbyPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login?redirect=%2Flobby");

  const candidate = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, role: true },
  });
  if (!candidate) redirect("/login?redirect=%2Flobby");
  if (candidate.role !== "CANDIDATE") {
    redirect(candidate.role === "TEACHER" || candidate.role === "ADMIN" ? "/studio" : "/login");
  }

  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      durationSeconds: true,
      isLive: true,
      sections: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          _count: { select: { questions: true } },
        },
      },
      sessions: {
        where: { candidateId: candidate.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  const lobbyExams: LobbyExam[] = exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationSeconds: exam.durationSeconds,
    isLive: exam.isLive,
    sections: exam.sections.map((section) => ({
      id: section.id,
      title: section.title,
      questionCount: section._count.questions,
    })),
    session: exam.sessions[0] || null,
  }));

  const inProgressExam = lobbyExams.find((exam) => exam.session?.status === "IN_PROGRESS");
  const readyExam = lobbyExams.find((exam) => exam.session?.status === "NOT_STARTED") ||
    lobbyExams.find((exam) => exam.isLive && !exam.session);
  const featuredExam = inProgressExam || readyExam;
  const availableCount = lobbyExams.filter((exam) =>
    exam.isLive && (!exam.session || exam.session.status === "NOT_STARTED")
  ).length;
  const inProgressCount = lobbyExams.filter((exam) => exam.session?.status === "IN_PROGRESS").length;
  const finishedCount = lobbyExams.filter((exam) =>
    exam.session?.status === "SUBMITTED" || exam.session?.status === "EVALUATED" || exam.session?.status === "DISQUALIFIED"
  ).length;
  const totalQuestions = lobbyExams.reduce((total, exam) =>
    total + exam.sections.reduce((sectionTotal, section) => sectionTotal + section.questionCount, 0), 0
  );

  return (
    <div className="min-h-screen">
      <PortalHeader section="candidate lobby" user={sessionUser} />

      <main className="portal-main">
        <section className="portal-hero lobby-hero">
          <div>
            <p className="portal-eyebrow"><GraduationCap className="h-3.5 w-3.5" /> candidate workspace</p>
            <h1 className="portal-title">your exam desk</h1>
            <p className="portal-description">
              welcome, {candidate.name.toLowerCase()}. pick up an active attempt or choose an exam from the list.
            </p>
          </div>
          <div className="lobby-welcome-mark" aria-hidden="true"><GraduationCap /></div>
        </section>

        <section className="lobby-stats" aria-label="your exam activity">
          <div className="portal-stat"><div className="portal-stat__label">available now</div><div className="portal-stat__value lobby-stat-ready">{availableCount}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">in progress</div><div className="portal-stat__value lobby-stat-active">{inProgressCount}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">finished</div><div className="portal-stat__value">{finishedCount}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">questions in lobby</div><div className="portal-stat__value">{totalQuestions}</div></div>
        </section>

        {featuredExam && (
          <section className="lobby-featured" aria-labelledby="featured-exam-title">
            <div className="lobby-featured__copy">
              <p className="portal-eyebrow">
                {inProgressExam ? "pick up where you left off" : "ready when you are"}
              </p>
              <h2 id="featured-exam-title">{featuredExam.title.toLowerCase()}</h2>
              <p>
                {featuredExam.sections.reduce((total, section) => total + section.questionCount, 0)} questions
                <span aria-hidden="true"> · </span>
                {Math.floor(featuredExam.durationSeconds / 60)} minutes
              </p>
            </div>
            {featuredExam.session?.status === "IN_PROGRESS" ? (
              <Link href={`/exam/${featuredExam.session.id}/player`} className="retro-btn-green gap-2 px-4 py-2.5 text-xs">
                resume exam <Clock3 className="h-4 w-4" />
              </Link>
            ) : featuredExam.session?.status === "NOT_STARTED" ? (
              <Link href={`/exam/${featuredExam.session.id}/instructions`} className="retro-btn-green gap-2 px-4 py-2.5 text-xs">
                review instructions <FileText className="h-4 w-4" />
              </Link>
            ) : (
              <TakeExamButton examId={featuredExam.id} className="retro-btn-green gap-2 px-4 py-2.5 text-xs">
                start exam <Clock3 className="h-4 w-4" />
              </TakeExamButton>
            )}
          </section>
        )}

        <section className="portal-surface lobby-list" aria-labelledby="exam-list-title">
          <div className="portal-section-heading">
            <div>
              <h2 id="exam-list-title">exam list</h2>
              <p>your latest attempt is shown for each paper.</p>
            </div>
            <span className="portal-chip">{lobbyExams.length} {lobbyExams.length === 1 ? "paper" : "papers"}</span>
          </div>
          <ExamCatalog exams={lobbyExams} />
        </section>

        <details className="lobby-guidelines">
          <summary><ShieldCheck aria-hidden="true" /> before you start <span>show exam guidance</span></summary>
          <div className="lobby-guidelines__body">
            <p><b>fullscreen:</b> the exam may ask your browser to enter fullscreen. allow it before beginning.</p>
            <p><b>focus:</b> leaving the exam tab or exiting fullscreen can be recorded as an integrity event.</p>
            <p><b>save:</b> use the player controls to save an answer before moving on.</p>
            <p><b>connection:</b> keep a stable network connection while your answers are being saved.</p>
          </div>
        </details>
      </main>

    </div>
  );
}
