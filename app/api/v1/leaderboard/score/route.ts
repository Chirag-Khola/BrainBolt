import { topScoreLeaderboard } from "@/lib/quizEngine";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ leaders: topScoreLeaderboard() });
}
