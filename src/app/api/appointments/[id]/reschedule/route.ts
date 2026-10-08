import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { findConflict } from "@/lib/appointments";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { isValidISODate, isValidTime, toHHMM, toMin, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Move an appointment to a new date/time. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const date = body.date;
  const startTime = body.startTime;

  const existing = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, user.id), ne(appointments.status, "cancelled")))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "not_found", message: "نوبت یافت نشد." }, { status: 404 });
  }
  const current = existing[0];
  const duration = body.durationMinutes !== undefined ? Number(body.durationMinutes) : current.durationMinutes;

  if (!isValidISODate(date) || !isValidTime(startTime) || !Number.isFinite(duration) || duration < 5 || duration > 480) {
    return NextResponse.json({ error: "validation", message: "مقادیر زمان‌بندی نامعتبر است." }, { status: 400 });
  }
  if (date < todayISO()) {
    return NextResponse.json({ error: "validation", message: "نمی‌توان نوبت را به گذشته منتقل کرد." }, { status: 400 });
  }

  const startMin = toMin(startTime);
  const endMin = startMin + Number(duration);
  if (endMin > 24 * 60) {
    return NextResponse.json({ error: "validation", message: "نوبت نمی‌تواند از پایان روز عبور کند." }, { status: 400 });
  }

  const conflict = await findConflict(user.id, date, startMin, endMin, id);
  if (conflict) {
    return NextResponse.json({ error: "conflict", message: conflict.message, detail: conflict.detail }, { status: 409 });
  }

  await db
    .update(appointments)
    .set({
      appointmentDate: date,
      startTime,
      endTime: toHHMM(endMin),
      durationMinutes: Number(duration),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  const [joined] = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, id))
    .limit(1);

  return NextResponse.json({ appointment: appointmentToDTO(joined) });
}
