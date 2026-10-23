import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionContentAccess } from "@/lib/authorization";
import { parseQuestionInput } from "@/lib/questionInput";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireQuestionContentAccess((await params).id);
  if (authError) return authError;

  try {
    const questionId = (await params).id;
    const body = await request.json().catch(() => null);
    const parsed = parseQuestionInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.question.update({
        where: { id: questionId },
        data: {
          stem: parsed.input.stem,
          diagramUrl: parsed.input.diagramUrl,
          solutionExplanation: parsed.input.solutionExplanation,
        },
      });
      await transaction.option.deleteMany({ where: { questionId } });
      for (const [orderIndex, option] of parsed.input.options.entries()) {
        await transaction.option.create({
          data: { questionId, orderIndex, ...option },
        });
      }
      return transaction.question.findUnique({
        where: { id: questionId },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireQuestionContentAccess((await params).id);
  if (authError) return authError;

  try {
    const questionId = (await params).id;

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
