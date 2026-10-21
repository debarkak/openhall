import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastProctorEvent } from "@/lib/proctorBroadcast";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const { eventType, timestamp, metadata } = body;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { id: true, examId: true, candidate: { select: { name: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const log = await prisma.proctorLog.create({
      data: {
        sessionId,
        eventType,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    broadcastProctorEvent(session.examId, {
      type: "VIOLATION_EVENT",
      sessionId,
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
