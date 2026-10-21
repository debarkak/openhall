import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CandidateExamManifest, ItemStatus } from "@/lib/types";
import { authorizeCandidateSession } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateAccess = await authorizeCandidateSession(params.id);
    if (!candidateAccess.ok) return candidateAccess.response;

    const sessionId = params.id;

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
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
    }

    // Set startedAt and deadline if not started
    let startedAt = session.startedAt;
    let deadline = session.deadline;

    if (!startedAt) {
      startedAt = new Date();
      deadline = new Date(startedAt.getTime() + session.exam.durationSeconds * 1000);

      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: "IN_PROGRESS",
          startedAt,
          deadline,
        },
      });
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
      startedAt: startedAt.toISOString(),
      deadline: (deadline || new Date()).toISOString(),
      sections: session.exam.sections.map((s) => ({
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
