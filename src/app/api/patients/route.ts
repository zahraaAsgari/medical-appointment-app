import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { toLatinDigits, todayISO } from "@/lib/format";
import type { PatientDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOBILE_RE = /^[+0-9][0-9\- ]{7,16}$/;

function toDTO(p: typeof patients.$inferSelect, extra?: { upcomingCount?: number; lastVisit?: string | null }): PatientDTO {
  return {
    id: p.id,
    fullName: p.fullName,
    mobile: p.mobile,
    medicalNotes: p.medicalNotes,
    upcomingCount: extra?.upcomingCount,
    lastVisit: extra?.lastVisit ?? null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const [rows, apptRows] = await Promise.all([
    db.select().from(patients).where(eq(patients.userId, user.id)).orderBy(asc(patients.fullName)).limit(1000),
    db
      .select({ patientId: appointments.patientId, date: appointments.appointmentDate, status: appointments.status })
      .from(appointments)
      .where(eq(appointments.userId, user.id)),
  ]);

  const today = todayISO();
  const upcoming = new Map<number, number>();
  const lastVisit = new Map<number, string>();
  for (const a of apptRows) {
    if (a.status === "scheduled" && a.date >= today) {
      upcoming.set(a.patientId, (upcoming.get(a.patientId) ?? 0) + 1);
    }
    if (a.status === "completed" && (!lastVisit.has(a.patientId) || a.date > lastVisit.get(a.patientId)!)) {
      lastVisit.set(a.patientId, a.date);
    }
  }

  const list = rows.map((p) => toDTO(p, { upcomingCount: upcoming.get(p.id) ?? 0, lastVisit: lastVisit.get(p.id) ?? null }));
  return NextResponse.json({ patients: list });
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

  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
  const mobile = typeof body.mobile === "string" ? toLatinDigits(body.mobile).replace(/[\s\-]/g, "").slice(0, 20) : "";
  const medicalNotes = typeof body.medicalNotes === "string" ? body.medicalNotes.trim().slice(0, 2000) : "";

  if (!fullName) {
    return NextResponse.json({ error: "validation", message: "نام بیمار الزامی است." }, { status: 400 });
  }
  if (!MOBILE_RE.test(mobile)) {
    return NextResponse.json({ error: "validation", message: "شماره موبایل نامعتبر است." }, { status: 400 });
  }

  const [created] = await db
    .insert(patients)
    .values({
      userId: user.id,
      fullName,
      mobile,
      medicalNotes: medicalNotes || null,
    })
    .returning();

  return NextResponse.json({ patient: toDTO(created, { upcomingCount: 0, lastVisit: null }) }, { status: 201 });
}
