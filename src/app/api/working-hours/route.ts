import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workingHours } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ensureWorkingHours } from "@/lib/seed";
import { isValidTime, toMin } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  await ensureWorkingHours(user.id);
  const rows = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.userId, user.id))
    .orderBy(asc(workingHours.dayIndex));
  return NextResponse.json({
    workingHours: rows.map((r) => ({ dayIndex: r.dayIndex, enabled: r.enabled, openTime: r.openTime, closeTime: r.closeTime })),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 7) {
    return NextResponse.json({ error: "validation", message: "ساختار داده نامعتبر است." }, { status: 400 });
  }

  const normalized: { dayIndex: number; enabled: boolean; openTime: string; closeTime: string }[] = [];
  const seen = new Set<number>();
  for (const raw of items as Record<string, unknown>[]) {
    const dayIndex = Number(raw.dayIndex);
    const enabled = raw.enabled === true;
    const openTime = raw.openTime;
    const closeTime = raw.closeTime;
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6 || seen.has(dayIndex)) {
      return NextResponse.json({ error: "validation", message: "روز هفته نامعتبر است." }, { status: 400 });
    }
    if (!isValidTime(openTime) || !isValidTime(closeTime)) {
      return NextResponse.json({ error: "validation", message: "ساعت کاری نامعتبر است." }, { status: 400 });
    }
    if (enabled && toMin(openTime) >= toMin(closeTime)) {
      return NextResponse.json({ error: "validation", message: "ساعت بازگشایی باید قبل از تعطیلی باشد." }, { status: 400 });
    }
    seen.add(dayIndex);
    normalized.push({ dayIndex, enabled, openTime, closeTime });
  }

  await ensureWorkingHours(user.id);
  for (const item of normalized) {
    await db
      .update(workingHours)
      .set({ enabled: item.enabled, openTime: item.openTime, closeTime: item.closeTime, updatedAt: new Date() })
      .where(and(eq(workingHours.userId, user.id), eq(workingHours.dayIndex, item.dayIndex)));
  }

  const rows = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.userId, user.id))
    .orderBy(asc(workingHours.dayIndex));

  return NextResponse.json({
    workingHours: rows.map((r) => ({ dayIndex: r.dayIndex, enabled: r.enabled, openTime: r.openTime, closeTime: r.closeTime })),
  });
}
