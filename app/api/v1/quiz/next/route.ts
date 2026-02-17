import { requireUser } from "@/lib/auth/session";
import { nextQuestion } from "@/lib/quizEngine";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (!(await checkRateLimit(`next:${user.id}`, 120, 60_000))) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }
  const payload = await nextQuestion(user.id);
  return NextResponse.json(payload);
}
