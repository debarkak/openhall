import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sectionId = params.id;
    const body = await request.json();
    const { stem, diagramUrl, solutionExplanation, positiveMarks, negativePenalty, options } = body;

    const count = await prisma.question.count({
      where: { sectionId },
    });

    const question = await prisma.question.create({
      data: {
        sectionId,
        orderIndex: count,
        stem: stem || "New question stem",
        diagramUrl,
        solutionExplanation,
        positiveMarks: positiveMarks ? parseFloat(positiveMarks) : null,
        negativePenalty: negativePenalty !== undefined ? parseFloat(negativePenalty) : null,
      },
    });

    if (Array.isArray(options)) {
      let optOrder = 0;
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.text && opt.text.trim()) {
          await prisma.option.create({
            data: {
              questionId: question.id,
              orderIndex: optOrder++,
              text: opt.text.trim(),
              imageUrl: opt.imageUrl || null,
              isCorrect: !!opt.isCorrect,
            },
          });
        }
      }
    }

    const fullQuestion = await prisma.question.findUnique({
      where: { id: question.id },
      include: { options: true },
    });

    return NextResponse.json(fullQuestion);
  } catch (error) {
    console.error("Question creation error:", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}
