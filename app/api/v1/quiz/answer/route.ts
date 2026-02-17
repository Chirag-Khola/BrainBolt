import { submitAnswer } from "@/lib/quizEngine";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.string().min(1),
  stateVersion: z.number(),
  answerIdempotencyKey: z.string().min(1)
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!checkRateLimit(`answer:${parsed.data.userId}`, 180, 60_000)) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }
  const response = await submitAnswer(parsed.data);
  if ("error" in response) return NextResponse.json(response, { status: 409 });
  return NextResponse.json(response);
}
