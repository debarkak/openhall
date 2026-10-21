import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
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

    // Auto-create default section if an exam has 0 sections
    if (exam.sections.length === 0) {
      const defaultSec = await prisma.section.create({
        data: {
          examId: exam.id,
          title: "Section 1",
          orderIndex: 0,
        },
        include: {
          questions: {
            include: { options: true },
          },
        },
      });
      exam.sections.push(defaultSec);
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Exam detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch exam detail" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, instructions, durationSeconds, positiveMarks, negativePenalty } = body;

    const updated = await prisma.exam.update({
      where: { id: params.id },
      data: {
        title,
        description,
        instructions,
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : undefined,
        positiveMarks: positiveMarks !== undefined ? parseFloat(positiveMarks) : undefined,
        negativePenalty: negativePenalty !== undefined ? parseFloat(negativePenalty) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Exam update error:", error);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}
