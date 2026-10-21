import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCandidate } from "@/lib/authorization";
import { broadcastProctorEvent } from "@/lib/proctorBroadcast";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const candidateAccess = await authorizeCandidate();
    if (!candidateAccess.ok) return candidateAccess.response;

    const examId = (await params).id;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Resume existing sessions even if the exam was unpublished after they started.
    let session = await prisma.examSession.findFirst({
      where: {
        examId,
        candidateId: candidateAccess.userId,
      },
    });

    if (!session) {
      if (!exam.isLive) {
        return NextResponse.json({ error: "This exam is not accepting new candidates." }, { status: 403 });
      }

      session = await prisma.examSession.create({
        data: {
          examId,
          candidateId: candidateAccess.userId,
          status: "NOT_STARTED",
        },
      });

      broadcastProctorEvent(examId, {
        type: "CANDIDATE_ENROLLED",
        sessionId: session.id,
        candidateName: candidateAccess.name,
        status: session.status,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ sessionId: session.id, status: session.status });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ error: "Failed to enroll in exam" }, { status: 500 });
  }
}
