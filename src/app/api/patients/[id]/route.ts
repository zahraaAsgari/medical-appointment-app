import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { toLatinDigits, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function patientDTO(p: typeof patients.$inferSelect) {
  return { id: p.id, fullName: p.fullName, mobile: p.mobile, medicalNotes: p.medicalNotes };
}

async function findPatient(userId: number, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const patient = await findPatient(user.id, ctx);
  if (!patient) {
    return NextResponse.json({ error: "not_found", message: "بیمار یافت نشد." }, { status: 404 });
  }

  const rows = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.patientId, patient.id), eq(appointments.userId, user.id)))
    .orderBy(asc(appointments.appointmentDate), asc(appointments.startTime));

  const today = todayISO();
  const all = rows.map(appointmentToDTO);
  const upcoming = all.filter((a) => a.date >= today && a.status === "scheduled");
  const history = all.filter((a) => !upcoming.includes(a)).reverse();

  return NextResponse.json({ patient: patientDTO(patient), upcoming, history });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const patient = await findPatient(user.id, ctx);
  if (!patient) {
    return NextResponse.json({ error: "not_found", message: "بیمار یافت نشد." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const patch: Partial<typeof patients.$inferInsert> = { updatedAt: new Date() };

  if (body.fullName !== undefined) {
    const v = String(body.fullName).trim().slice(0, 100);
    if (!v) return NextResponse.json({ error: "validation", message: "نام بیمار الزامی است." }, { status: 400 });
    patch.fullName = v;
  }
  if (body.mobile !== undefined) {
    const v = toLatinDigits(String(body.mobile)).replace(/[\s\-]/g, "").slice(0, 20);
    if (!/^[+0-9][0-9]{7,16}$/.test(v)) {
      return NextResponse.json({ error: "validation", message: "شماره موبایل نامعتبر است." }, { status: 400 });
    }
    patch.mobile = v;
  }
  if (body.medicalNotes !== undefined) {
    patch.medicalNotes = typeof body.medicalNotes === "string" ? body.medicalNotes.trim().slice(0, 2000) || null : null;
  }

  const [updated] = await db.update(patients).set(patch).where(eq(patients.id, patient.id)).returning();

  return NextResponse.json({ patient: patientDTO(updated) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const patient = await findPatient(user.id, ctx);
  if (!patient) {
    return NextResponse.json({ error: "not_found", message: "بیمار یافت نشد." }, { status: 404 });
  }
  await db.delete(patients).where(eq(patients.id, patient.id));
  return NextResponse.json({ ok: true });
}
