import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CandidateAccess =
  | { ok: true; userId: string; name: string }
  | { ok: false; response: NextResponse };

export type StaffAccess =
  | { ok: true; userId: string; role: "TEACHER" | "ADMIN" }
  | { ok: false; response: NextResponse };

/**
 * Require a currently enabled teacher or admin for staff-only endpoints.
 * The role is reloaded from the database so a stale signed cookie cannot
 * keep staff access after an account is changed or removed.
 */
export async function requireStaffAccess(): Promise<NextResponse | null> {
  const access = await authorizeStaff();
  return access.ok ? null : access.response;
}

/** Require an authenticated teacher or admin and return the database role. */
export async function authorizeStaff(): Promise<StaffAccess> {
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

  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Teacher access is required." }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, role: user.role };
}

/** Teachers can manage only exams they host; admins can manage any exam. */
export async function requireExamStaffAccess(examId: string): Promise<NextResponse | null> {
  const access = await authorizeStaff();
  if (!access.ok) return access.response;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { hostId: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  }

  if (access.role !== "ADMIN" && exam.hostId !== access.userId) {
    return NextResponse.json({ error: "You do not have access to this exam." }, { status: 403 });
  }

  return null;
}

/** Keep assessment content stable after a candidate actually starts the exam. */
export async function requireExamContentAccess(examId: string): Promise<NextResponse | null> {
  const accessError = await requireExamStaffAccess(examId);
  if (accessError) return accessError;

  const activeOrFinishedSessionCount = await prisma.examSession.count({
    where: { examId, status: { not: "NOT_STARTED" } },
  });
  if (activeOrFinishedSessionCount > 0) {
    return NextResponse.json(
      { error: "Exam content is locked after a candidate starts the exam." },
      { status: 409 }
    );
  }

  return null;
}

/** Prevent deleting a test after candidate history has been recorded. */
export async function requireUnusedExamAccess(examId: string): Promise<NextResponse | null> {
  const accessError = await requireExamStaffAccess(examId);
  if (accessError) return accessError;

  const sessionCount = await prisma.examSession.count({ where: { examId } });
  if (sessionCount > 0) {
    return NextResponse.json(
      { error: "This exam has candidate records and cannot be deleted." },
      { status: 409 }
    );
  }

  return null;
}

/** Resolve an owned exam through a section before allowing section changes. */
export async function requireSectionStaffAccess(sectionId: string): Promise<NextResponse | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { examId: true },
  });

  if (!section) {
    const access = await authorizeStaff();
    return access.ok ? NextResponse.json({ error: "Section not found." }, { status: 404 }) : access.response;
  }

  return requireExamStaffAccess(section.examId);
}

export async function requireSectionContentAccess(sectionId: string): Promise<NextResponse | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { examId: true },
  });

  if (!section) {
    const access = await authorizeStaff();
    return access.ok ? NextResponse.json({ error: "Section not found." }, { status: 404 }) : access.response;
  }

  return requireExamContentAccess(section.examId);
}

/** Resolve an owned exam through a question before allowing question changes. */
export async function requireQuestionStaffAccess(questionId: string): Promise<NextResponse | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { section: { select: { examId: true } } },
  });

  if (!question) {
    const access = await authorizeStaff();
    return access.ok ? NextResponse.json({ error: "Question not found." }, { status: 404 }) : access.response;
  }

  return requireExamStaffAccess(question.section.examId);
}

export async function requireQuestionContentAccess(questionId: string): Promise<NextResponse | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { section: { select: { examId: true } } },
  });

  if (!question) {
    const access = await authorizeStaff();
    return access.ok ? NextResponse.json({ error: "Question not found." }, { status: 404 }) : access.response;
  }

  return requireExamContentAccess(question.section.examId);
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
    select: { id: true, name: true, role: true },
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

  return { ok: true, userId: user.id, name: user.name };
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
