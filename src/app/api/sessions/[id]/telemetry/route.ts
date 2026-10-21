import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastProctorEvent } from "@/lib/proctorBroadcast";
import { authorizeCandidateSession } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const candidateAccess = await authorizeCandidateSession((await params).id);
    if (!candidateAccess.ok) return candidateAccess.response;

    const sessionId = (await params).id;
    const body = await request.json();
    const { eventType, metadata } = body;
    const allowedEventTypes = new Set([
      "FULLSCREEN_EXIT",
      "TAB_SWITCH",
      "DEVTOOLS_KEY",
      "MULTIPLE_DISPLAYS",
    ]);

    if (typeof eventType !== "string" || !allowedEventTypes.has(eventType)) {
      return NextResponse.json({ error: "Invalid telemetry event type." }, { status: 400 });
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { id: true, examId: true, status: true, candidate: { select: { name: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Exam session is no longer active." }, { status: 403 });
    }

    const log = await prisma.proctorLog.create({
      data: {
        sessionId,
        eventType,
        timestamp: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    broadcastProctorEvent(session.examId, {
      type: "VIOLATION_EVENT",
      sessionId,
      logId: log.id,
      candidateName: session.candidate.name,
      eventType,
      metadata,
      timestamp: log.timestamp.toISOString(),
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error("Telemetry logging error:", error);
    return NextResponse.json({ error: "Failed to record telemetry" }, { status: 500 });
  }
}
