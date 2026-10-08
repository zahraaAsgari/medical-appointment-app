import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Cancel an appointment (frees its time slot). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });
  }

  let reason: string | null = null;
  try {
    const body = (await req.json()) as { reason?: string };
    reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : null;
  } catch {
    /* empty body is fine */
  }

  const rows = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, user.id)))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found", message: "نوبت یافت نشد." }, { status: 404 });
  }
  const appt = rows[0];
  if (appt.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled", message: "این نوبت قبلاً لغو شده است." }, { status: 409 });
  }

  const noteSuffix = reason ? `\nدلیل لغو: ${reason}` : "";
  await db
    .update(appointments)
    .set({
      status: "cancelled",
      notes: ((appt.notes ?? "") + noteSuffix).trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  return NextResponse.json({ ok: true });
}
