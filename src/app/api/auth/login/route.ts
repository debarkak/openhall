import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "invalid email or password. please check your credentials." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "invalid email or password. please check your credentials." },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role as SessionUser["role"]) || "CANDIDATE",
    };

    const redirectUrl = sessionUser.role === "TEACHER" || sessionUser.role === "ADMIN"
      ? "/studio"
      : "/lobby";

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      redirectUrl,
    });

    setSessionCookie(sessionUser, response);
    return response;
  } catch (error) {
    console.error("Login authentication error:", error);
    return NextResponse.json(
      { error: "server error during authentication." },
      { status: 500 }
    );
  }
}
