import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clinicProfiles } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ensureClinicProfile } from "@/lib/seed";
import { toLatinDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  await ensureClinicProfile(user.id);
  const rows = await db.select().from(clinicProfiles).where(eq(clinicProfiles.userId, user.id)).limit(1);
  return NextResponse.json({ clinic: rows[0] ?? null });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || null : null);

  const patch: Partial<typeof clinicProfiles.$inferInsert> = { updatedAt: new Date() };
  if (body.clinicName !== undefined) {
    const v = str(body.clinicName, 120);
    if (!v) return NextResponse.json({ error: "validation", message: "نام کلینیک الزامی است." }, { status: 400 });
    patch.clinicName = v;
  }
  if (body.phone !== undefined) {
    patch.phone = body.phone === null ? null : toLatinDigits(String(body.phone)).trim().slice(0, 20) || null;
  }
  if (body.address !== undefined) patch.address = str(body.address, 400);
  if (body.logoUrl !== undefined) patch.logoUrl = str(body.logoUrl, 500);
  if (body.specialty !== undefined) patch.specialty = str(body.specialty, 100);
  if (body.website !== undefined) patch.website = str(body.website, 200);
  if (body.insuranceAccepted !== undefined) patch.insuranceAccepted = str(body.insuranceAccepted, 500);

  await ensureClinicProfile(user.id);
  const [updated] = await db
    .update(clinicProfiles)
    .set(patch)
    .where(eq(clinicProfiles.userId, user.id))
    .returning();

  return NextResponse.json({ clinic: updated });
}
