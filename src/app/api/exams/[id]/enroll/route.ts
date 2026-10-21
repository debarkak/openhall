import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCandidate } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateAccess = await authorizeCandidate();
    if (!candidateAccess.ok) return candidateAccess.response;

    const examId = params.id;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if session already exists
    let session = await prisma.examSession.findFirst({
      where: {
        examId,
        candidateId: candidateAccess.userId,
      },
    });

    if (!session) {
      session = await prisma.examSession.create({
        data: {
          examId,
          candidateId: candidateAccess.userId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          deadline: new Date(Date.now() + exam.durationSeconds * 1000),
        },
      });
    }

    return NextResponse.json({ sessionId: session.id, status: session.status });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ error: "Failed to enroll in exam" }, { status: 500 });
  }
}
