import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastProctorEvent } from "@/lib/proctorBroadcast";
import { authorizeCandidateSession } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateAccess = await authorizeCandidateSession(params.id);
    if (!candidateAccess.ok) return candidateAccess.response;

    const sessionId = params.id;
    const body = await request.json();
    const { questionId, optionId, status } = body;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        examId: true,
        status: true,
        deadline: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "SUBMITTED" || session.status === "EVALUATED") {
      return NextResponse.json({ error: "Exam session is already finalized" }, { status: 403 });
    }

    // Server-authoritative temporal deadline verification (5s network grace)
    if (session.deadline) {
      const now = new Date().getTime();
      const deadlineWithGrace = new Date(session.deadline).getTime() + 5000;
      if (now > deadlineWithGrace) {
        return NextResponse.json(
          { error: "Examination time has expired", expired: true },
          { status: 403 }
        );
      }
    }

    // Persist question attempt
    const attempt = await prisma.questionAttempt.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      update: {
        optionId: optionId ?? null,
        status: status || "ATTEMPTED_SAVED",
      },
      create: {
        sessionId,
        questionId,
        optionId: optionId ?? null,
        status: status || "ATTEMPTED_SAVED",
      },
    });

    // Notify live proctors via SSE hub
    broadcastProctorEvent(session.examId, {
      type: "CANDIDATE_ATTEMPT",
      sessionId,
      questionId,
      status: attempt.status,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, attempt });
  } catch (error) {
    console.error("Attempt persistence error:", error);
    return NextResponse.json(
      { error: "Failed to persist attempt" },
      { status: 500 }
    );
  }
}
