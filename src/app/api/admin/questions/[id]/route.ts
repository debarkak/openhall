import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;
    const body = await request.json();
    const { stem, diagramUrl, solutionExplanation, positiveMarks, negativePenalty, options } = body;

    // Update question metadata
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        stem: stem || "Question stem",
        diagramUrl: diagramUrl || null,
        solutionExplanation: solutionExplanation || null,
        positiveMarks: positiveMarks !== undefined ? parseFloat(positiveMarks) : undefined,
        negativePenalty: negativePenalty !== undefined ? parseFloat(negativePenalty) : undefined,
      },
    });

    // Update options if provided
    if (Array.isArray(options)) {
      // Cleanly replace options
      await prisma.option.deleteMany({
        where: { questionId },
      });

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.text && opt.text.trim()) {
          await prisma.option.create({
            data: {
              questionId,
              orderIndex: i,
              text: opt.text.trim(),
              imageUrl: opt.imageUrl || null,
              isCorrect: !!opt.isCorrect,
            },
          });
        }
      }
    }

    const updated = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;

    // Delete related attempts and options first
    await prisma.questionAttempt.deleteMany({
      where: { questionId },
    });
    await prisma.option.deleteMany({
      where: { questionId },
    });
    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ success: true, deletedId: questionId });
  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
