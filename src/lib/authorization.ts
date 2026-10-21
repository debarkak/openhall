import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
