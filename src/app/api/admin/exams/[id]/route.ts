import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireExamStaffAccess,
  requireExamContentAccess,
  requireUnusedExamAccess,
} from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireExamStaffAccess((await params).id);
  if (authError) return authError;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: (await params).id },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              include: {
                options: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Exam detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch exam detail" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireExamStaffAccess((await params).id);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { title, description, instructions, durationSeconds, positiveMarks, negativePenalty, isLive } = body;

    if (Object.keys(body).some((key) => key !== "isLive")) {
      const contentError = await requireExamContentAccess((await params).id);
      if (contentError) return contentError;
    }

    const updated = await prisma.exam.update({
      where: { id: (await params).id },
      data: {
        title,
        description,
        instructions,
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : undefined,
        positiveMarks: positiveMarks !== undefined ? parseFloat(positiveMarks) : undefined,
        negativePenalty: negativePenalty !== undefined ? parseFloat(negativePenalty) : undefined,
        isLive: isLive !== undefined ? !!isLive : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Exam update error:", error);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireUnusedExamAccess((await params).id);
  if (authError) return authError;

  try {
    const examId = (await params).id;

    // Delete related sessions, attempts, sections
    const sessions = await prisma.examSession.findMany({
      where: { examId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.questionAttempt.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.proctorLog.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.examSession.deleteMany({
        where: { id: { in: sessionIds } },
      });
    }

    const sections = await prisma.section.findMany({
      where: { examId },
      select: { id: true },
    });
    const sectionIds = sections.map((s) => s.id);

    if (sectionIds.length > 0) {
      const questions = await prisma.question.findMany({
        where: { sectionId: { in: sectionIds } },
        select: { id: true },
      });
      const questionIds = questions.map((q) => q.id);

      if (questionIds.length > 0) {
        await prisma.option.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      await prisma.section.deleteMany({
        where: { id: { in: sectionIds } },
      });
    }

    await prisma.exam.delete({
      where: { id: examId },
    });

    return NextResponse.json({ success: true, deletedId: examId });
  } catch (error) {
    console.error("Exam delete error:", error);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
