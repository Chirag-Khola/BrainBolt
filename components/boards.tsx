"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

type ScoreEntry = { userId: string; totalScore: number; user: { displayName: string } };
type StreakEntry = { userId: string; maxStreak: number; user: { displayName: string } };

export function LiveBoardPreview({ userId }: { userId: string }) {
  const [score, setScore] = useState<ScoreEntry[]>([]);
  const [streak, setStreak] = useState<StreakEntry[]>([]);
  const [scoreRank, setScoreRank] = useState<number | null>(null);
  const [streakRank, setStreakRank] = useState<number | null>(null);

  useEffect(() => {
    const tick = async () => {
      const [scoreRes, streakRes] = await Promise.all([
        fetch("/api/v1/leaderboard/score", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/v1/leaderboard/streak", { cache: "no-store" }).then((r) => r.json())
      ]);
      setScore(scoreRes.leaders);
      setStreak(streakRes.leaders);
      setScoreRank(scoreRes.currentUserRank ?? null);
      setStreakRank(streakRes.currentUserRank ?? null);
    };
    void tick();
    const id = setInterval(() => void tick(), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-2">
      <Card>
        <h3>Live Score Leaderboard {scoreRank ? `(you: #${scoreRank})` : ""}</h3>
        {score.map((entry, idx) => (
          <p key={entry.userId} style={{ margin: "var(--space-2) 0", fontWeight: entry.userId === userId ? 700 : 500 }}>
            #{idx + 1} {entry.user.displayName} — {entry.totalScore}
          </p>
        ))}
      </Card>
      <Card>
        <h3>Live Streak Leaderboard {streakRank ? `(you: #${streakRank})` : ""}</h3>
        {streak.map((entry, idx) => (
          <p key={entry.userId} style={{ margin: "var(--space-2) 0", fontWeight: entry.userId === userId ? 700 : 500 }}>
            #{idx + 1} {entry.user.displayName} — {entry.maxStreak}
          </p>
        ))}
      </Card>
    </div>
  );
}
