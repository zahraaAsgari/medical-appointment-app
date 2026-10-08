import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { toLatinDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ user: auth.user });
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

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (body.firstName !== undefined) patch.firstName = str(body.firstName, 60);
  if (body.lastName !== undefined) patch.lastName = str(body.lastName, 60);
  if (body.title !== undefined) patch.title = str(body.title, 30);
  if (body.specialty !== undefined) patch.specialty = str(body.specialty, 80);
  if (body.licenseNumber !== undefined) {
    patch.licenseNumber = body.licenseNumber === null ? null : toLatinDigits(String(body.licenseNumber)).trim().slice(0, 30) || null;
  }
  if (body.phone !== undefined) {
    patch.phone = body.phone === null ? null : toLatinDigits(String(body.phone)).trim().slice(0, 20) || null;
  }
  if (body.photoUrl !== undefined) patch.photoUrl = str(body.photoUrl, 500);

  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return NextResponse.json({ user: updated });
}
