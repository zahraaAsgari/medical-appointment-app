import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isDemoUser } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user, isDemo: isDemoUser(user) });
}
