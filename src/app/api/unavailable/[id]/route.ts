import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { unavailableSlots } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "validation", message: "شناسه نامعتبر است." }, { status: 400 });
  }

  const deleted = await db
    .delete(unavailableSlots)
    .where(and(eq(unavailableSlots.id, id), eq(unavailableSlots.userId, user.id)))
    .returning({ id: unavailableSlots.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found", message: "یافت نشد." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
