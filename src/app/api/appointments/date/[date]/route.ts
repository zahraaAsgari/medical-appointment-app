import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, unavailableSlots } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getDayWorkingHour } from "@/lib/appointments";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { isValidISODate } from "@/lib/format";
import type { DaySchedule } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { date } = await ctx.params;
  if (!isValidISODate(date)) {
    return NextResponse.json({ error: "validation", message: "تاریخ نامعتبر است." }, { status: 400 });
  }

  const baseWhere = and(eq(appointments.userId, user.id), eq(appointments.appointmentDate, date));

  const [dayAppointments, dayUnavailable, wh] = await Promise.all([
    db
      .select(appointmentSelect)
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(baseWhere)
      .orderBy(asc(appointments.startTime)),
    db
      .select()
      .from(unavailableSlots)
      .where(and(eq(unavailableSlots.userId, user.id), eq(unavailableSlots.slotDate, date))),
    getDayWorkingHour(user.id, date),
  ]);

  const payload: DaySchedule = {
    date,
    workingHour: wh
      ? { dayIndex: wh.dayIndex, enabled: wh.enabled, openTime: wh.openTime, closeTime: wh.closeTime }
      : null,
    appointments: dayAppointments.map(appointmentToDTO),
    unavailable: dayUnavailable.map((u) => ({
      id: u.id,
      date: u.slotDate,
      startTime: u.startTime,
      endTime: u.endTime,
      reason: u.reason,
      reasonCategory: u.reasonCategory,
      isFullDay: u.isFullDay,
    })),
  };

  return NextResponse.json(payload);
}
