import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { eq, and, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "clinic_session";
export const SESSION_TTL_HOURS = 24;

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Detects whether the current request arrived over HTTPS.
 * Behind a proxy (Vercel / nginx / preview hosts) the original protocol is
 * forwarded in `x-forwarded-proto`; direct plain-HTTP requests carry no such
 * header. Used so the cookie's `Secure` flag matches the actual transport.
 */
async function requestIsHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  if (proto === "https") return true;

  // Some managed proxies terminate public HTTPS but report their internal hop
  // as `http`. A production Next.js server is expected to be exposed via HTTPS,
  // so use a cross-site-safe Secure cookie there. `next dev` remains plain HTTP.
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: number): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);

  // Regenerate: drop previous sessions for this user (single active session).
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.insert(sessions).values({ id: token, userId, expiresAt });

  const isHttps = await requestIsHttps();

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Telegram Desktop/Web render Mini Apps in a cross-site iframe, where a
    // `lax` cookie is not sent with fetch. `SameSite=None` is required for that
    // context and mandates `Secure`, so it is only used over HTTPS. Plain HTTP
    // falls back to `lax` without `Secure` so local/dev serving still works.
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (rows.length === 0) {
    // lazily purge expired sessions
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    return null;
  }
  return rows[0].user;
}

/** Returns the authenticated user or a NextResponse-friendly 401 payload. */
export async function requireUser(): Promise<{ user: User } | { error: Response }> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: Response.json({ error: "unauthorized", message: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید." }, { status: 401 }),
    };
  }
  return { user };
}
