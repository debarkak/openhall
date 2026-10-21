import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExamContentAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireExamContentAccess((await params).id);
  if (authError) return authError;

  try {
    const examId = (await params).id;
    const body = await request.json().catch(() => ({}));
    const { title } = body;

    const count = await prisma.section.count({
      where: { examId },
    });

    const section = await prisma.section.create({
      data: {
        examId,
        title: title && title.trim() ? title.trim() : `Section ${count + 1}`,
        orderIndex: count,
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Section creation error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
