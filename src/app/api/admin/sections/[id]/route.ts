import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireStaffAccess();
  if (authError) return authError;

  try {
    const sectionId = params.id;
    const body = await request.json();
    const { title, orderIndex } = body;

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: {
        title: title ? title.trim() : undefined,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Section update error:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireStaffAccess();
  if (authError) return authError;

  try {
    const sectionId = params.id;

    // Delete questions and attempts first to respect relations
    const questions = await prisma.question.findMany({
      where: { sectionId },
      select: { id: true },
    });

    const questionIds = questions.map((q) => q.id);

    if (questionIds.length > 0) {
      await prisma.questionAttempt.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      await prisma.option.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }

    await prisma.section.delete({
      where: { id: sectionId },
    });

    return NextResponse.json({ success: true, deletedId: sectionId });
  } catch (error) {
    console.error("Section deletion error:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
