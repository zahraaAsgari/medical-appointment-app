import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  clinicProfiles,
  patients,
  unavailableSlots,
  users,
  workingHours,
  type User,
} from "@/db/schema";
import { addDaysISO, todayISO } from "@/lib/format";

export const DEMO_TELEGRAM_ID = 900000001;

export function isDemoUser(user: User): boolean {
  return user.telegramId === DEMO_TELEGRAM_ID;
}

/** Seven Persian-week rows (Sat–Fri). Fri disabled by default. */
export async function ensureWorkingHours(userId: number): Promise<void> {
  const existing = await db.select({ id: workingHours.id }).from(workingHours).where(eq(workingHours.userId, userId)).limit(1);
  if (existing.length > 0) return;
  const rows = Array.from({ length: 7 }, (_, i) => ({
    userId,
    dayIndex: i,
    enabled: i !== 6, // Friday off
    openTime: "09:00",
    closeTime: "17:00",
  }));
  await db.insert(workingHours).values(rows);
}

export async function ensureClinicProfile(userId: number): Promise<void> {
  const existing = await db.select({ id: clinicProfiles.id }).from(clinicProfiles).where(eq(clinicProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return;
  await db.insert(clinicProfiles).values({ userId, clinicName: "کلینیک من" });
}

/** Fresh installation defaults for any new receptionist/doctor account. */
export async function bootstrapNewUser(userId: number): Promise<void> {
  await ensureWorkingHours(userId);
  await ensureClinicProfile(userId);
}

const DEMO_PATIENTS = [
  { fullName: "مریم احمدی", mobile: "09121112233", medicalNotes: "حساسیت به پنی‌سیلین." },
  { fullName: "علی رضایی", mobile: "09123334455", medicalNotes: "دیابت نوع ۲." },
  { fullName: "سارا محمدی", mobile: "09351234567", medicalNotes: null },
  { fullName: "حسن کریمی", mobile: "09198887766", medicalNotes: null },
] as const;

async function seedTodayFixtures(userId: number, ids: number[]): Promise<void> {
  const today = todayISO();
  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.appointmentDate, today), ne(appointments.status, "cancelled")))
    .limit(1);
  if (existing.length > 0) return;
  const [p1, p2, p3] = ids;
  await db.insert(appointments).values([
    { userId, patientId: p1, appointmentDate: today, startTime: "10:00", endTime: "10:30", durationMinutes: 30, status: "completed", notes: "ویزیت دوره‌ای فشار خون" },
    { userId, patientId: p2, appointmentDate: today, startTime: "11:30", endTime: "12:00", durationMinutes: 30, status: "scheduled" },
    { userId, patientId: p3, appointmentDate: today, startTime: "14:00", endTime: "14:45", durationMinutes: 45, status: "scheduled" },
  ]);
}

/** Rich demo dataset so the app is explorable outside of Telegram. */
export async function seedDemoData(userId: number): Promise<void> {
  await bootstrapNewUser(userId);

  const existingPatients = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, userId));
  let ids = existingPatients.map((p) => p.id);

  if (ids.length === 0) {
    const inserted = await db
      .insert(patients)
      .values(DEMO_PATIENTS.map((p) => ({ ...p, userId })))
      .returning({ id: patients.id });
    ids = inserted.map((p) => p.id);

    const today = todayISO();
    const tomorrow = addDaysISO(today, 1);
    const in3 = addDaysISO(today, 3);
    const [p1, , , p4] = ids;

    await db.insert(appointments).values([
      { userId, patientId: p4, appointmentDate: today, startTime: "16:00", endTime: "16:30", durationMinutes: 30, status: "cancelled", notes: "بیمار تماس گرفت و لغو کرد" },
      { userId, patientId: p1, appointmentDate: tomorrow, startTime: "15:00", endTime: "16:00", durationMinutes: 60, status: "scheduled", notes: "پیگیری درمان" },
    ]);

    await db.insert(unavailableSlots).values({
      userId,
      slotDate: in3,
      startTime: "09:00",
      endTime: "12:00",
      reason: "کنگره سالانه پزشکان",
      reasonCategory: "conference",
      isFullDay: false,
    });

    await db
      .update(clinicProfiles)
      .set({ clinicName: "کلینیک تخصصی سلامت", phone: "02188776655", address: "تهران، خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲۴، طبقه ۳" })
      .where(eq(clinicProfiles.userId, userId));

    await db
      .update(users)
      .set({ title: "دکتر", specialty: "متخصص داخلی", licenseNumber: "۸۹۴۵۶" })
      .where(eq(users.id, userId));
  }

  await seedTodayFixtures(userId, ids);
}
