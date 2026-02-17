import { requireUser } from "@/lib/auth/session";
import { getRank, topScoreLeaderboard } from "@/lib/quizEngine";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  const leaders = await topScoreLeaderboard();
  const currentUserRank = user ? await getRank(user.id, "score") : null;
  return NextResponse.json({ leaders, currentUserRank });
}
