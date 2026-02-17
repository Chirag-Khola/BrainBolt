import { requireUser } from "@/lib/auth/session";
import { getRank, topStreakLeaderboard } from "@/lib/quizEngine";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  const leaders = await topStreakLeaderboard();
  const currentUserRank = user ? await getRank(user.id, "streak") : null;
  return NextResponse.json({ leaders, currentUserRank });
}
