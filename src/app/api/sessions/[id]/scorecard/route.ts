import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSession } from "@/lib/evaluation";
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
                        text: true,
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

    if (!["SUBMITTED", "EVALUATED", "DISQUALIFIED"].includes(session.status)) {
      return NextResponse.json({ error: "Results are available after the exam is submitted." }, { status: 403 });
    }

    const evaluation = evaluateSession(
      session.exam,
      session.attempts,
      session.candidate.name
    );
    const evalResult = session.status === "DISQUALIFIED"
      ? { ...evaluation, finalScore: 0 }
      : evaluation;

    return NextResponse.json(evalResult);
  } catch (error) {
    console.error("Scorecard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch scorecard" }, { status: 500 });
  }
}
