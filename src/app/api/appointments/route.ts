import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { findConflict } from "@/lib/appointments";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { isValidISODate, isValidTime, toHHMM, toMin, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const patientId = Number(searchParams.get("patientId") ?? 0);

  const conds: SQL[] = [eq(appointments.userId, user.id)];
  if (status) conds.push(eq(appointments.status, status));
  if (isValidISODate(from)) conds.push(gte(appointments.appointmentDate, from));
  if (isValidISODate(to)) conds.push(lte(appointments.appointmentDate, to));
  if (patientId) conds.push(eq(appointments.patientId, patientId));

  const rows = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conds))
    .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime))
    .limit(500);

  return NextResponse.json({ appointments: rows.map(appointmentToDTO) });
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

  const patientId = Number(body.patientId);
  const date = body.date;
  const startTime = body.startTime;
  const duration = Number(body.durationMinutes);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ error: "validation", message: "بیمار انتخاب نشده است." }, { status: 400 });
  }
  if (!isValidISODate(date)) {
    return NextResponse.json({ error: "validation", message: "تاریخ نامعتبر است." }, { status: 400 });
  }
  if (!isValidTime(startTime)) {
    return NextResponse.json({ error: "validation", message: "ساعت شروع نامعتبر است." }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    return NextResponse.json({ error: "validation", message: "مدت زمان نوبت باید بین ۵ تا ۴۸۰ دقیقه باشد." }, { status: 400 });
  }

  const patient = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.userId, user.id)))
    .limit(1);
  if (patient.length === 0) {
    return NextResponse.json({ error: "validation", message: "بیمار یافت نشد." }, { status: 400 });
  }

  const startMin = toMin(startTime);
  const endMin = startMin + duration;
  if (endMin > 24 * 60) {
    return NextResponse.json({ error: "validation", message: "نوبت نمی‌تواند از پایان روز عبور کند." }, { status: 400 });
  }
  if (date < todayISO()) {
    return NextResponse.json({ error: "validation", message: "نمی‌توان برای گذشته نوبت ثبت کرد." }, { status: 400 });
  }

  const conflict = await findConflict(user.id, date, startMin, endMin);
  if (conflict) {
    return NextResponse.json({ error: "conflict", message: conflict.message, detail: conflict.detail }, { status: 409 });
  }

  const [created] = await db
    .insert(appointments)
    .values({
      userId: user.id,
      patientId,
      appointmentDate: date,
      startTime,
      endTime: toHHMM(endMin),
      durationMinutes: duration,
      status: "scheduled",
      notes: notes || null,
    })
    .returning({ id: appointments.id });

  const [joined] = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, created.id))
    .limit(1);

  return NextResponse.json({ appointment: appointmentToDTO(joined) }, { status: 201 });
}
