import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { findConflict } from "@/lib/appointments";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { isValidISODate, isValidTime, toHHMM, toMin, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES = new Set(["scheduled", "completed", "cancelled"]);

async function parseId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });

  const rows = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.id, id), eq(appointments.userId, user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found", message: "نوبت یافت نشد." }, { status: 404 });
  }
  return NextResponse.json({ appointment: appointmentToDTO(rows[0]) });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });

  const existing = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, user.id)))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "not_found", message: "نوبت یافت نشد." }, { status: 404 });
  }
  const current = existing[0];

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const patch: Partial<typeof appointments.$inferInsert> = { updatedAt: new Date() };

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "validation", message: "وضعیت نامعتبر است." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.notes !== undefined) {
    patch.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || null : null;
  }

  // Optional time change (also used by reschedule flows that keep same semantics)
  const date = body.date !== undefined ? body.date : current.appointmentDate;
  const startTime = body.startTime !== undefined ? body.startTime : current.startTime;
  const duration = body.durationMinutes !== undefined ? Number(body.durationMinutes) : current.durationMinutes;

  if (!isValidISODate(date) || !isValidTime(startTime) || !Number.isFinite(duration) || duration < 5 || duration > 480) {
    return NextResponse.json({ error: "validation", message: "مقادیر زمان‌بندی نامعتبر است." }, { status: 400 });
  }
  const startMin = toMin(startTime);
  const endMin = startMin + Number(duration);
  if (endMin > 24 * 60) {
    return NextResponse.json({ error: "validation", message: "نوبت نمی‌تواند از پایان روز عبور کند." }, { status: 400 });
  }
  if (date < todayISO()) {
    return NextResponse.json({ error: "validation", message: "نمی‌توان نوبت را به گذشته منتقل کرد." }, { status: 400 });
  }
  const conflict = await findConflict(user.id, date, startMin, endMin, id);
  if (conflict) {
    return NextResponse.json({ error: "conflict", message: conflict.message, detail: conflict.detail }, { status: 409 });
  }
  patch.appointmentDate = date;
  patch.startTime = startTime;
  patch.endTime = toHHMM(endMin);
  patch.durationMinutes = Number(duration);

  await db.update(appointments).set(patch).where(eq(appointments.id, id));

  const [joined] = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, id))
    .limit(1);
  return NextResponse.json({ appointment: appointmentToDTO(joined) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });

  const deleted = await db
    .delete(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, user.id)))
    .returning({ id: appointments.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found", message: "نوبت یافت نشد." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
