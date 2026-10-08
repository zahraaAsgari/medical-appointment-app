import { NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { appointmentSelect, appointmentToDTO } from "@/lib/dto";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const rows = await db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.userId, user.id),
        gte(appointments.appointmentDate, todayISO()),
        eq(appointments.status, "scheduled"),
      ),
    )
    .orderBy(asc(appointments.appointmentDate), asc(appointments.startTime))
    .limit(200);

  return NextResponse.json({ appointments: rows.map(appointmentToDTO) });
}
