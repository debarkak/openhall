import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastProctorEvent } from "@/lib/proctorBroadcast";
import { authorizeCandidateSession } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const candidateAccess = await authorizeCandidateSession((await params).id);
    if (!candidateAccess.ok) return candidateAccess.response;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid answer payload is required." }, { status: 400 });
    }

    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const optionId = typeof body.optionId === "string" ? body.optionId : null;
    const status = body.status;

    if (!questionId) {
      return NextResponse.json({ error: "A question id is required." }, { status: 400 });
    }

    if (status !== "VISITED_UNANSWERED" && status !== "ATTEMPTED_SAVED") {
      return NextResponse.json({ error: "Invalid answer status." }, { status: 400 });
    }

    if (status === "ATTEMPTED_SAVED" && !optionId) {
      return NextResponse.json({ error: "Select an answer before saving it." }, { status: 400 });
    }

    if (status === "VISITED_UNANSWERED" && body.optionId != null) {
      return NextResponse.json({ error: "An unanswered item cannot include a selected option." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const session = await transaction.examSession.findUnique({
        where: { id: (await params).id },
        select: {
          id: true,
          examId: true,
          status: true,
          deadline: true,
          candidate: { select: { name: true } },
        },
      });

      if (!session) return { error: "Session not found.", statusCode: 404 };
      if (session.status !== "IN_PROGRESS") {
        return { error: "Exam session is not active.", statusCode: 403 };
      }

      if (!session.deadline) {
        return { error: "Exam session has no active deadline.", statusCode: 409 };
      }

      const deadlineWithGrace = session.deadline.getTime() + 5000;
      if (Date.now() > deadlineWithGrace) {
        return {
          error: "Examination time has expired.",
          statusCode: 403,
          expired: true,
        };
      }

      const question = await transaction.question.findFirst({
        where: {
          id: questionId,
          section: { is: { examId: session.examId } },
        },
        select: { id: true, orderIndex: true },
      });

      if (!question) {
        return { error: "Question does not belong to this exam.", statusCode: 400 };
      }

      if (optionId) {
        const option = await transaction.option.findFirst({
          where: { id: optionId, questionId },
          select: { id: true },
        });

        if (!option) {
          return { error: "Selected option does not belong to this question.", statusCode: 400 };
        }
      }

      const attempt = await transaction.questionAttempt.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId,
          },
        },
        update: { optionId, status },
        create: {
          sessionId: session.id,
          questionId,
          optionId,
          status,
        },
      });

      return {
        attempt,
        examId: session.examId,
        candidateName: session.candidate.name,
        currentQuestion: `q${question.orderIndex + 1}`,
      };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, ...(result.expired ? { expired: true } : {}) },
        { status: result.statusCode }
      );
    }

    broadcastProctorEvent(result.examId, {
      type: "CANDIDATE_ATTEMPT",
      sessionId: (await params).id,
      candidateName: result.candidateName,
      questionId,
      currentQuestion: result.currentQuestion,
      status: result.attempt.status,
      timestamp: result.attempt.updatedAt.toISOString(),
    });

    return NextResponse.json({ success: true, attempt: result.attempt });
  } catch (error) {
    console.error("Attempt persistence error:", error);
    return NextResponse.json({ error: "Failed to persist attempt" }, { status: 500 });
  }
}
