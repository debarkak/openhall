import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSession } from "@/lib/evaluation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const evalResult = evaluateSession(
      session.exam,
      session.attempts,
      session.candidate.name
    );

    return NextResponse.json(evalResult);
  } catch (error) {
    console.error("Scorecard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch scorecard" }, { status: 500 });
  }
}
