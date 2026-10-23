import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getExamReadinessIssues } from "@/lib/examReadiness";
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Enter the exam changes to save." }, { status: 400 });
    }

    const allowedFields = new Set([
      "title", "description", "instructions", "durationSeconds",
      "positiveMarks", "negativePenalty", "isLive",
    ]);
    if (Object.keys(body).some((key) => !allowedFields.has(key))) {
      return NextResponse.json({ error: "This exam change is not supported." }, { status: 400 });
    }

    if (Object.keys(body).some((key) => key !== "isLive")) {
      const contentError = await requireExamContentAccess((await params).id);
      if (contentError) return contentError;
    }

    const data: Prisma.ExamUpdateInput = {};
    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 120) {
        return NextResponse.json({ error: "Exam titles must be between 1 and 120 characters." }, { status: 400 });
      }
      data.title = body.title.trim();
    }
    if ("description" in body) {
      if (body.description !== null && typeof body.description !== "string") {
        return NextResponse.json({ error: "Exam description is invalid." }, { status: 400 });
      }
      data.description = typeof body.description === "string" ? body.description.trim() : null;
    }
    if ("instructions" in body) {
      if (body.instructions !== null && typeof body.instructions !== "string") {
        return NextResponse.json({ error: "Exam instructions are invalid." }, { status: 400 });
      }
      data.instructions = typeof body.instructions === "string" ? body.instructions.trim() : null;
    }
    if ("durationSeconds" in body) {
      const durationSeconds = Number(body.durationSeconds);
      if (!Number.isInteger(durationSeconds) || durationSeconds < 300 || durationSeconds > 21600) {
        return NextResponse.json(
          { error: "Exam duration must be between 5 minutes and 6 hours." },
          { status: 400 }
        );
      }
      data.durationSeconds = durationSeconds;
    }
    if ("positiveMarks" in body) {
      const positiveMarks = Number(body.positiveMarks);
      if (!Number.isFinite(positiveMarks) || positiveMarks <= 0) {
        return NextResponse.json({ error: "Correct-answer marks must be greater than zero." }, { status: 400 });
      }
      data.positiveMarks = positiveMarks;
    }
    if ("negativePenalty" in body) {
      const negativePenalty = Number(body.negativePenalty);
      if (!Number.isFinite(negativePenalty) || negativePenalty < 0) {
        return NextResponse.json({ error: "Incorrect-answer penalties cannot be negative." }, { status: 400 });
      }
      data.negativePenalty = negativePenalty;
    }
    if ("isLive" in body) {
      if (typeof body.isLive !== "boolean") {
        return NextResponse.json({ error: "Exam availability must be on or off." }, { status: 400 });
      }

      if (body.isLive) {
        const exam = await prisma.exam.findUnique({
          where: { id: (await params).id },
          include: {
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                questions: {
                  orderBy: { orderIndex: "asc" },
                  include: { options: { orderBy: { orderIndex: "asc" } } },
                },
              },
            },
          },
        });
        if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

        const issues = getExamReadinessIssues(exam.sections);
        if (issues.length > 0) {
          return NextResponse.json(
            { error: "Finish the exam before publishing it.", issues },
            { status: 409 }
          );
        }
      }
      data.isLive = body.isLive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "There are no exam changes to save." }, { status: 400 });
    }

    const updated = await prisma.exam.update({
      where: { id: (await params).id },
      data,
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
