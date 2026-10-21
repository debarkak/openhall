import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireStaffAccess();
  if (authError) return authError;

  try {
    const exams = await prisma.exam.findMany({
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
  const authError = await requireStaffAccess();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { title, description, instructions, durationSeconds, positiveMarks, negativePenalty, accessCode } = body;

    const host = await prisma.user.findFirst({
      where: { role: "TEACHER" },
    });

    if (!host) {
      return NextResponse.json({ error: "No teacher account found" }, { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        title: title || "New Examination",
        description,
        instructions: instructions || "Standard exam instructions apply.",
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : 5400,
        positiveMarks: positiveMarks ? parseFloat(positiveMarks) : 4.0,
        negativePenalty: negativePenalty ? parseFloat(negativePenalty) : 0.0,
        accessCode: accessCode || `OH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        hostId: host.id,
        isLive: true,
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

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Exam create error:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
