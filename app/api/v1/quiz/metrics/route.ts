import { requireUser } from "@/lib/auth/session";
import { getMetrics } from "@/lib/quizEngine";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json(await getMetrics(user.id));
}
