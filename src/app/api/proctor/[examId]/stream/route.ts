import { NextRequest, NextResponse } from "next/server";
import { subscribeProctor } from "@/lib/proctorBroadcast";
import { requireStaffAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const authError = await requireStaffAccess();
  if (authError) return authError;

  const examId = params.examId;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected ping
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", examId })}\n\n`));

  const unsubscribe = subscribeProctor(examId, (chunk) => {
    try {
      writer.write(encoder.encode(chunk));
    } catch {
      // Client disconnected
    }
  });

  // Keep-alive heartbeat every 20s
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: heartbeat\n\n`));
    } catch {
      clearInterval(heartbeatInterval);
      unsubscribe();
    }
  }, 20000);

  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    try {
      writer.close();
    } catch {
      // Ignored
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
