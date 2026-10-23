import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authorizeStaff } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await authorizeStaff();
  if (!access.ok) return access.response;

  try {
    const exams = await prisma.exam.findMany({
      where: access.role === "ADMIN" ? {} : { hostId: access.userId },
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            questions: {
              select: { id: true },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error("Exams fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await authorizeStaff();
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Enter an exam title to continue." }, { status: 400 });
    }

    if ("isLive" in body) {
      return NextResponse.json(
        { error: "New exams start as drafts. Add questions, then publish from the exam studio." },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) {
      return NextResponse.json(
        { error: "Enter an exam title between 1 and 120 characters." },
        { status: 400 }
      );
    }

    const durationSeconds = body.durationSeconds === undefined ? 5400 : Number(body.durationSeconds);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 300 || durationSeconds > 21600) {
      return NextResponse.json(
        { error: "Exam duration must be between 5 minutes and 6 hours." },
        { status: 400 }
      );
    }

    const accessCode = typeof body.accessCode === "string" && body.accessCode.trim()
      ? body.accessCode.trim().toUpperCase()
      : `OH-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (accessCode.length > 40) {
      return NextResponse.json({ error: "Exam codes must be 40 characters or fewer." }, { status: 400 });
    }

    const description = typeof body.description === "string" ? body.description.trim() : null;
    const instructions = typeof body.instructions === "string" && body.instructions.trim()
      ? body.instructions.trim()
      : "Read each question carefully. Your answers are saved as you move through the exam.";

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        instructions,
        durationSeconds,
        positiveMarks: 4.0,
        negativePenalty: 0.0,
        accessCode,
        hostId: access.userId,
        isLive: false,
        sections: {
          create: [
            {
              title: "Section 1",
              orderIndex: 0,
            },
          ],
        },
      },
      include: {
        sections: true,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Exam create error:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That exam code is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
