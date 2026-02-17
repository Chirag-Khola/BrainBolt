import { nextQuestion } from "@/lib/quizEngine";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!checkRateLimit(`next:${userId}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }
  const payload = await nextQuestion(userId);
  return NextResponse.json(payload);
}
