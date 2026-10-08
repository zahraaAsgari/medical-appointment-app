import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, unavailableSlots, workingHours, type WorkingHour } from "@/db/schema";
import { dayIndexOf, toMin } from "@/lib/format";

export async function getDayWorkingHour(userId: number, isoDate: string): Promise<WorkingHour | null> {
  const idx = dayIndexOf(isoDate);
  const rows = await db
    .select()
    .from(workingHours)
    .where(and(eq(workingHours.userId, userId), eq(workingHours.dayIndex, idx)))
    .limit(1);
  return rows[0] ?? null;
}

export interface Conflict {
  kind: "outside_hours" | "appointment" | "unavailable";
  message: string;
  detail?: string;
}

/**
 * Returns a conflict when [startMin, endMin) on `isoDate` is outside working
 * hours, overlaps an active appointment, or overlaps an unavailable slot.
 */
export async function findConflict(
  userId: number,
  isoDate: string,
  startMin: number,
  endMin: number,
  ignoreAppointmentId?: number,
): Promise<Conflict | null> {
  const wh = await getDayWorkingHour(userId, isoDate);
  if (wh && !wh.enabled) {
    return { kind: "outside_hours", message: "مطب در این روز تعطیل است." };
  }
  if (wh && wh.enabled) {
    if (startMin < toMin(wh.openTime) || endMin > toMin(wh.closeTime)) {
      return {
        kind: "outside_hours",
        message: "زمان انتخابی خارج از ساعات کاری است.",
        detail: `ساعت کاری این روز: ${wh.openTime} تا ${wh.closeTime}`,
      };
    }
  }

  const dayAppointments = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.appointmentDate, isoDate), ne(appointments.status, "cancelled")));

  for (const a of dayAppointments) {
    if (ignoreAppointmentId && a.id === ignoreAppointmentId) continue;
    const s = toMin(a.startTime);
    const e = toMin(a.endTime);
    if (startMin < e && endMin > s) {
      return {
        kind: "appointment",
        message: "این بازه با نوبت دیگری تداخل دارد.",
        detail: `${a.startTime} تا ${a.endTime}`,
      };
    }
  }

  const dayUnavailable = await db
    .select()
    .from(unavailableSlots)
    .where(and(eq(unavailableSlots.userId, userId), eq(unavailableSlots.slotDate, isoDate)));

  for (const u of dayUnavailable) {
    if (u.isFullDay) {
      return { kind: "unavailable", message: "کل این روز مسدود شده است.", detail: u.reason };
    }
    const s = toMin(u.startTime);
    const e = toMin(u.endTime);
    if (startMin < e && endMin > s) {
      return {
        kind: "unavailable",
        message: "این بازه به‌عنوان عدم حضور پزشک ثبت شده است.",
        detail: `${u.startTime} تا ${u.endTime} — ${u.reason}`,
      };
    }
  }

  return null;
}
