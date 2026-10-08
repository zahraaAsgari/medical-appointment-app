import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { unavailableSlots } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { isValidISODate, isValidTime, toMin } from "@/lib/format";

export const dynamic = "force-dynamic";

function toDTO(u: typeof unavailableSlots.$inferSelect) {
  return {
    id: u.id,
    date: u.slotDate,
    startTime: u.startTime,
    endTime: u.endTime,
    reason: u.reason,
    reasonCategory: u.reasonCategory,
    isFullDay: u.isFullDay,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const conds: SQL[] = [eq(unavailableSlots.userId, user.id)];
  if (isValidISODate(from)) conds.push(gte(unavailableSlots.slotDate, from));
  if (isValidISODate(to)) conds.push(lte(unavailableSlots.slotDate, to));

  const rows = await db
    .select()
    .from(unavailableSlots)
    .where(and(...conds))
    .orderBy(asc(unavailableSlots.slotDate), asc(unavailableSlots.startTime))
    .limit(300);

  return NextResponse.json({ unavailable: rows.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const date = body.date;
  const isFullDay = body.isFullDay === true;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  const reasonCategory = typeof body.reasonCategory === "string" ? body.reasonCategory.trim().slice(0, 30) : "";
  let startTime = body.startTime;
  let endTime = body.endTime;

  if (!isValidISODate(date)) {
    return NextResponse.json({ error: "validation", message: "تاریخ نامعتبر است." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "validation", message: "دلیل عدم حضور الزامی است." }, { status: 400 });
  }
  if (isFullDay) {
    startTime = "00:00";
    endTime = "23:59";
  } else {
    if (!isValidTime(startTime) || !isValidTime(endTime) || toMin(startTime) >= toMin(endTime)) {
      return NextResponse.json({ error: "validation", message: "بازه زمانی نامعتبر است." }, { status: 400 });
    }
  }

  const [created] = await db
    .insert(unavailableSlots)
    .values({
      userId: user.id,
      slotDate: date,
      startTime: startTime as string,
      endTime: endTime as string,
      reason,
      reasonCategory: reasonCategory || null,
      isFullDay,
    })
    .returning();

  return NextResponse.json({ unavailable: toDTO(created) }, { status: 201 });
}
