import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExamStaffAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireExamStaffAccess((await params).id);
  if (authError) return authError;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: (await params).id },
      select: { id: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const sessions = await prisma.examSession.findMany({
      where: { examId: exam.id },
      orderBy: { createdAt: "asc" },
      include: {
        candidate: { select: { name: true } },
        attempts: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            updatedAt: true,
            question: { select: { orderIndex: true } },
          },
        },
        proctorLogs: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { eventType: true, timestamp: true },
        },
        _count: { select: { proctorLogs: true } },
      },
    });

    const sessionIds = sessions.map((session) => session.id);
    const logs = sessionIds.length > 0
      ? await prisma.proctorLog.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { timestamp: "desc" },
          take: 50,
          include: {
            session: {
              select: { candidate: { select: { name: true } } },
            },
          },
        })
      : [];

    const candidates = sessions.map((session) => {
      const latestAttempt = session.attempts[0];
      const latestViolation = session.proctorLogs[0];
      const lastActivityAt = [
        session.createdAt,
        session.updatedAt,
        latestAttempt?.updatedAt,
        latestViolation?.timestamp,
      ].reduce<Date>((latest, date) => date && date > latest ? date : latest, session.createdAt);

      let lastEvent = "session started";
      if (latestViolation && (!latestAttempt || latestViolation.timestamp >= latestAttempt.updatedAt)) {
        lastEvent = `integrity alert: ${latestViolation.eventType.toLowerCase()}`;
      } else if (latestAttempt) {
        lastEvent = `saved answer for q${latestAttempt.question.orderIndex + 1}`;
      }

      return {
        sessionId: session.id,
        name: session.candidate.name,
        status: session.status,
        currentQuestion: latestAttempt
          ? `q${latestAttempt.question.orderIndex + 1}`
          : undefined,
        violationsCount: session._count.proctorLogs,
        lastEvent,
        lastActivityAt: lastActivityAt.toISOString(),
        score: session.totalScore ?? undefined,
      };
    });

    return NextResponse.json({
      candidates,
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        candidateName: log.session.candidate.name,
        eventType: log.eventType,
      })),
    });
  } catch (error) {
    console.error("Proctor snapshot fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch proctor snapshot" }, { status: 500 });
  }
}
