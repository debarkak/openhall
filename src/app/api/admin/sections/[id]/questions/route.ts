import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSectionContentAccess } from "@/lib/authorization";
import { parseQuestionInput } from "@/lib/questionInput";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireSectionContentAccess((await params).id);
  if (authError) return authError;

  try {
    const sectionId = (await params).id;
    const body = await request.json().catch(() => null);
    const parsed = parseQuestionInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const count = await prisma.question.count({
      where: { sectionId },
    });

    const question = await prisma.question.create({
      data: {
        sectionId,
        orderIndex: count,
        stem: parsed.input.stem,
        diagramUrl: parsed.input.diagramUrl,
        solutionExplanation: parsed.input.solutionExplanation,
        options: {
          create: parsed.input.options.map((option, orderIndex) => ({
            ...option,
            orderIndex,
          })),
        },
      },
      include: { options: { orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Question creation error:", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}
