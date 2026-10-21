import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CandidateAccess =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Require a currently enabled teacher or admin for staff-only endpoints.
 * The role is reloaded from the database so a stale signed cookie cannot
 * keep staff access after an account is changed or removed.
 */
export async function requireStaffAccess(): Promise<NextResponse | null> {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in to access this resource." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true },
  });

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Teacher access is required." }, { status: 403 });
  }

  return null;
}

/** Require a signed-in user whose current database role is CANDIDATE. */
export async function authorizeCandidate(): Promise<CandidateAccess> {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in to access this resource." }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Your account is no longer available." }, { status: 401 }),
    };
  }

  if (user.role !== "CANDIDATE") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Candidate access is required." }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}

/** Require the signed-in candidate to own the requested exam session. */
export async function authorizeCandidateSession(sessionId: string): Promise<CandidateAccess> {
  const candidateAccess = await authorizeCandidate();
  if (!candidateAccess.ok) return candidateAccess;

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: { candidateId: true },
  });

  if (!session || session.candidateId !== candidateAccess.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Exam session not found." }, { status: 404 }),
    };
  }

  return candidateAccess;
}
