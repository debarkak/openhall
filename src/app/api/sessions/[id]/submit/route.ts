import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSession } from "@/lib/evaluation";
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

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        candidate: { select: { name: true } },
        exam: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    options: {
                      select: {
                        id: true,
                        isCorrect: true,
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
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const isDisqualified = !!body.disqualified;

    // Evaluate responses
    const evalResult = evaluateSession(
      session.exam,
      session.attempts,
      session.candidate.name
    );

    // Update session record
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: isDisqualified ? "DISQUALIFIED" : "EVALUATED",
        submittedAt: new Date(),
        totalScore: isDisqualified ? 0 : evalResult.finalScore,
      },
    });

    // Notify proctors
    broadcastProctorEvent(session.examId, {
      type: isDisqualified ? "CANDIDATE_DISQUALIFIED" : "CANDIDATE_SUBMITTED",
      sessionId,
      candidateName: session.candidate.name,
      finalScore: isDisqualified ? 0 : evalResult.finalScore,
      maxMarks: evalResult.maxMarks,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, result: evalResult });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to evaluate and submit exam" }, { status: 500 });
  }
}
