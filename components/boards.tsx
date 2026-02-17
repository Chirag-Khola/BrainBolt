"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export function LiveBoardPreview({ userId }: { userId: string }) {
  const [score, setScore] = useState<Array<{ userId: string; totalScore: number }>>([]);
  const [streak, setStreak] = useState<Array<{ userId: string; maxStreak: number }>>([]);

  useEffect(() => {
    const tick = async () => {
      const [scoreRes, streakRes] = await Promise.all([
        fetch("/api/v1/leaderboard/score", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/v1/leaderboard/streak", { cache: "no-store" }).then((r) => r.json())
      ]);
      setScore(scoreRes.leaders);
      setStreak(streakRes.leaders);
    };
    void tick();
    const id = setInterval(() => void tick(), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-2">
      <Card>
        <h3>Live Score Leaderboard</h3>
        {score.map((entry, idx) => (
          <p key={entry.userId} style={{ margin: "var(--space-2) 0", fontWeight: entry.userId === userId ? 700 : 500 }}>
            #{idx + 1} {entry.userId} — {entry.totalScore}
          </p>
        ))}
      </Card>
      <Card>
        <h3>Live Streak Leaderboard</h3>
        {streak.map((entry, idx) => (
          <p key={entry.userId} style={{ margin: "var(--space-2) 0", fontWeight: entry.userId === userId ? 700 : 500 }}>
            #{idx + 1} {entry.userId} — {entry.maxStreak}
          </p>
        ))}
      </Card>
    </div>
  );
}
