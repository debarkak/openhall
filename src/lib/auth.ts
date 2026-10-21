import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "openhall_session";
const DEVELOPMENT_SESSION_SECRET = "openhall-development-only-session-secret";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!configuredSecret || Buffer.byteLength(configuredSecret, "utf8") < 32) {
      throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
    }

    return configuredSecret;
  }

  return configuredSecret || DEVELOPMENT_SESSION_SECRET;
}

export function assertSessionSecretConfigured(): void {
  if (process.env.NODE_ENV === "production") {
    getSessionSecret();
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "CANDIDATE";
}

interface TokenPayload extends SessionUser {
  exp: number;
}

/**
 * Encrypts and hashes a plaintext password using cryptographically secure scrypt with a random salt.
 * NIST/OWASP approved password derivation.
 * Returns salt:derivedKey in hex format.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored salted scrypt hash with timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;

  const [salt, expectedKeyHex] = storedHash.split(":");
  if (!salt || !expectedKeyHex) return false;

  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedKey = Buffer.from(expectedKeyHex, "hex");

    if (derivedKey.length !== expectedKey.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Creates an HMAC-SHA256 signed session token for authenticated users.
 */
export function createSessionToken(user: SessionUser): string {
  const payload: TokenPayload = {
    ...user,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 signed session token.
 */
export function verifySessionToken(token: string): SessionUser | null {
  if (!token || !token.includes(".")) return null;

  const [payloadBase64, providedSignature] = token.split(".");
  if (!payloadBase64 || !providedSignature) return null;

  try {
    const hmac = crypto.createHmac("sha256", getSessionSecret());
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest("base64url");

    const providedBuf = Buffer.from(providedSignature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: TokenPayload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Attaches the signed session cookie to an HTTP response.
 */
export function setSessionCookie(user: SessionUser, response: NextResponse): void {
  const token = createSessionToken(user);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Reads and verifies the current session user from server cookies.
 * Safe for use in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;
    return verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}
