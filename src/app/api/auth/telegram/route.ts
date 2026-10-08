import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { validateTelegramInitData } from "@/lib/telegram";
import { createSession } from "@/lib/session";
import { bootstrapNewUser, seedDemoData, DEMO_TELEGRAM_ID } from "@/lib/seed";

export const dynamic = "force-dynamic";

interface TelegramUserPayload {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
}

async function upsertUser(payload: TelegramUserPayload): Promise<{ user: User; isNew: boolean }> {
  const existing = await db.select().from(users).where(eq(users.telegramId, payload.telegramId)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db
      .update(users)
      .set({
        username: payload.username ?? existing[0].username,
        firstName: payload.firstName ?? existing[0].firstName,
        lastName: payload.lastName ?? existing[0].lastName,
        photoUrl: payload.photoUrl ?? existing[0].photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing[0].id))
      .returning();
    return { user: updated, isNew: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      telegramId: payload.telegramId,
      username: payload.username ?? null,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      photoUrl: payload.photoUrl ?? null,
      phone: payload.phone ?? null,
    })
    .returning();
  await bootstrapNewUser(created.id);
  return { user: created, isNew: true };
}

export async function POST(req: NextRequest) {
  let body: { initData?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body falls through to demo handling */
  }

  const initData = typeof body.initData === "string" ? body.initData : "";
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  // Secure by default: demo auth requires an explicit opt-in. Any unset,
  // mistyped or differently-cased value keeps the anonymous login path closed.
  const allowDemo = (process.env.ALLOW_DEMO_AUTH ?? "").trim().toLowerCase() === "true";
  const maxAge = Number(process.env.TELEGRAM_AUTH_MAX_AGE ?? "300");

  let payload: TelegramUserPayload | null = null;
  let isDemo = false;

  if (initData && botToken) {
    const parsed = validateTelegramInitData(initData, botToken, maxAge);
    if (!parsed) {
      return NextResponse.json({ error: "invalid_init_data", message: "اعتبارسنجی تلگرام ناموفق بود." }, { status: 401 });
    }
    payload = {
      telegramId: parsed.user.id,
      username: parsed.user.username ?? null,
      firstName: parsed.user.first_name ?? null,
      lastName: parsed.user.last_name ?? null,
      photoUrl: parsed.user.photo_url ?? null,
    };
  } else if (allowDemo) {
    // Preview / local development: no real Telegram context available.
    isDemo = true;
    payload = {
      telegramId: DEMO_TELEGRAM_ID,
      username: "demo_clinic",
      firstName: "آرش",
      lastName: "کیانی",
    };
  } else {
    return NextResponse.json({ error: "missing_init_data", message: "داده‌های تلگرام یافت نشد." }, { status: 400 });
  }

  const { user, isNew } = await upsertUser(payload);

  if (isDemo && !isNew) {
    await seedDemoData(user.id);
  } else if (isDemo) {
    await seedDemoData(user.id);
  }

  await createSession(user.id);

  return NextResponse.json({ user, isDemo });
}
