import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CandidateExamManifest, ItemStatus } from "@/lib/types";
import { authorizeCandidateSession } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const candidateAccess = await authorizeCandidateSession((await params).id);
    if (!candidateAccess.ok) return candidateAccess.response;

    const sessionId = (await params).id;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                questions: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    options: {
                      orderBy: { orderIndex: "asc" },
                      select: {
                        id: true,
                        orderIndex: true,
                        text: true,
                        imageUrl: true,
                        // isCorrect is ZERO-TRUST STRIPPED
                      },
                    },
                  },
                },
              },
            },
          },
        },
        attempts: true,
        proctorLogs: {
          where: { eventType: { in: ["FULLSCREEN_EXIT", "TAB_SWITCH"] } },
          select: { id: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
    }

    if (session.status === "NOT_STARTED" && !session.exam.isLive) {
      return NextResponse.json({ error: "This exam is no longer available." }, { status: 403 });
    }

    if (session.status === "SUBMITTED" || session.status === "EVALUATED" || session.status === "DISQUALIFIED") {
      return NextResponse.json({ error: "This exam session is no longer active." }, { status: 403 });
    }

    const candidateSections = session.exam.sections.filter((section) => section.questions.length > 0);
    if (candidateSections.length === 0) {
      return NextResponse.json({ error: "This exam does not have any questions yet." }, { status: 409 });
    }

    // The instructions page only needs exam details. Starting the timer there
    // would consume exam time before the candidate enters the player.
    let startedAt = session.startedAt;
    let deadline = session.deadline;

    const isPreview = request.nextUrl.searchParams.get("preview") === "1";
    if (session.status === "NOT_STARTED" && isPreview) {
      startedAt = new Date();
      deadline = new Date(startedAt.getTime() + session.exam.durationSeconds * 1000);
    } else if (session.status === "NOT_STARTED") {
      startedAt = new Date();
      deadline = new Date(startedAt.getTime() + session.exam.durationSeconds * 1000);

      const started = await prisma.examSession.updateMany({
        where: { id: sessionId, status: "NOT_STARTED" },
        data: {
          status: "IN_PROGRESS",
          startedAt,
          deadline,
        },
      });

      if (started.count === 0) {
        // Another player tab may have started this session in parallel.
        const currentSession = await prisma.examSession.findUnique({
          where: { id: sessionId },
          select: { status: true, startedAt: true, deadline: true },
        });

        if (currentSession?.status !== "IN_PROGRESS") {
          return NextResponse.json({ error: "Exam session could not be started." }, { status: 409 });
        }

        startedAt = currentSession.startedAt;
        deadline = currentSession.deadline;
      }
    }

    if (!startedAt || !deadline) {
      return NextResponse.json({ error: "Exam session timing data is incomplete." }, { status: 409 });
    }

    const initialAttempts: Record<string, { optionId: string | null; status: ItemStatus }> = {};
    for (const a of session.attempts) {
      initialAttempts[a.questionId] = {
        optionId: a.optionId,
        status: a.status as ItemStatus,
      };
    }

    const manifest: CandidateExamManifest = {
      sessionId: session.id,
      examId: session.examId,
      title: session.exam.title,
      instructions: session.exam.instructions,
      durationSeconds: session.exam.durationSeconds,
      positiveMarks: session.exam.positiveMarks,
      negativePenalty: session.exam.negativePenalty,
      startedAt: startedAt.toISOString(),
      deadline: (deadline || new Date()).toISOString(),
      integrityStrikes: session.proctorLogs.length,
      sections: candidateSections.map((s) => ({
        id: s.id,
        title: s.title,
        orderIndex: s.orderIndex,
        questions: s.questions.map((q) => ({
          id: q.id,
          orderIndex: q.orderIndex,
          stem: q.stem,
          diagramUrl: q.diagramUrl,
          positiveMarks: q.positiveMarks,
          negativePenalty: q.negativePenalty,
          options: q.options,
        })),
      })),
      initialAttempts,
    };

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Manifest delivery error:", error);
    return NextResponse.json(
      { error: "Failed to deliver question manifest" },
      { status: 500 }
    );
  }
}
