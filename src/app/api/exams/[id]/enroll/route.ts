import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if authenticated session user exists
    const sessionUser = await getCurrentUser();
    let candidate = null;

    if (sessionUser) {
      candidate = await prisma.user.findUnique({
        where: { id: sessionUser.id },
      });
    }

    if (!candidate) {
      candidate = await prisma.user.findFirst({
        where: { role: "CANDIDATE" },
      });
    }

    if (!candidate) {
      candidate = await prisma.user.create({
        data: {
          email: "student@openhall.edu",
          name: "student candidate",
          role: "CANDIDATE",
        },
      });
    }

    // Check if session already exists
    let session = await prisma.examSession.findFirst({
      where: {
        examId,
        candidateId: candidate.id,
      },
    });

    if (!session) {
      session = await prisma.examSession.create({
        data: {
          examId,
          candidateId: candidate.id,
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
