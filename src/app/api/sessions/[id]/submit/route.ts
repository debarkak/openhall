import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSession } from "@/lib/evaluation";
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

    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid submission payload is required." }, { status: 400 });
    }
    const isDisqualified = body.disqualified === true;

    const result = await prisma.$transaction(async (transaction) => {
      const session = await transaction.examSession.findUnique({
        where: { id: (await params).id },
        include: {
          candidate: { select: { name: true } },
          exam: {
            include: {
              sections: {
                include: {
                  questions: {
                    include: {
                      options: { select: { id: true, isCorrect: true } },
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
        return { error: "Session not found.", statusCode: 404 };
      }

      if (session.status !== "IN_PROGRESS") {
        return { error: "Exam session has already been finalized.", statusCode: 409 };
      }

      const evaluation = evaluateSession(
        session.exam,
        session.attempts,
        session.candidate.name
      );
      const finalResult = isDisqualified
        ? { ...evaluation, finalScore: 0 }
        : evaluation;

      const updateResult = await transaction.examSession.updateMany({
        where: { id: session.id, status: "IN_PROGRESS" },
        data: {
          status: isDisqualified ? "DISQUALIFIED" : "EVALUATED",
          submittedAt: new Date(),
          totalScore: finalResult.finalScore,
        },
      });

      if (updateResult.count === 0) {
        return { error: "Exam session has already been finalized.", statusCode: 409 };
      }

      return {
        result: finalResult,
        examId: session.examId,
        candidateName: session.candidate.name,
      };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    broadcastProctorEvent(result.examId, {
      type: isDisqualified ? "CANDIDATE_DISQUALIFIED" : "CANDIDATE_SUBMITTED",
      sessionId: (await params).id,
      candidateName: result.candidateName,
      finalScore: result.result.finalScore,
      maxMarks: result.result.maxMarks,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to evaluate and submit exam" }, { status: 500 });
  }
}
