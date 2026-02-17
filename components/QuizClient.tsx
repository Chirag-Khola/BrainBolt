"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, StatTile } from "@/components/ui";

const LiveBoardPreview = dynamic(() => import("@/components/boards").then((m) => m.LiveBoardPreview), {
  ssr: false,
  loading: () => <p>Loading live board…</p>
});

type NextQuestionResponse = {
  questionId: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  sessionId: string;
  stateVersion: number;
  currentScore: number;
  currentStreak: number;
};

export default function QuizClient() {
  const userId = "demo-user";
  const [data, setData] = useState<NextQuestionResponse | null>(null);
  const [message, setMessage] = useState("Start answering to adapt difficulty.");

  const loadNext = useCallback(async () => {
    const res = await fetch(`/api/v1/quiz/next?userId=${userId}`, { cache: "no-store" });
    const json = (await res.json()) as NextQuestionResponse;
    setData(json);
  }, []);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const answer = useCallback(
    async (choice: string) => {
      if (!data) return;
      const res = await fetch("/api/v1/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionId: data.sessionId,
          questionId: data.questionId,
          answer: choice,
          stateVersion: data.stateVersion,
          answerIdempotencyKey: crypto.randomUUID()
        })
      });
      const json = (await res.json()) as { correct: boolean; scoreDelta: number; newDifficulty: number; leaderboardRankScore: number; newStreak: number };
      setMessage(
        `${json.correct ? "✅ Correct" : "❌ Wrong"} · Δ${json.scoreDelta} · next difficulty ${json.newDifficulty} · streak ${json.newStreak} · score rank #${json.leaderboardRankScore ?? "-"}`
      );
      await loadNext();
    },
    [data, loadNext]
  );

  const stats = useMemo(
    () => [
      { label: "Current Score", value: data?.currentScore ?? 0 },
      { label: "Current Streak", value: data?.currentStreak ?? 0 },
      { label: "Adaptive Difficulty", value: data?.difficulty ?? 0 }
    ],
    [data]
  );

  if (!data) return <p>Loading question…</p>;

  return (
    <div className="grid">
      <div className="grid grid-2">
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <Card>
        <h2 style={{ marginTop: 0 }}>{data.prompt}</h2>
        <div className="grid">
          {data.choices.map((choice) => (
            <Button key={choice} onClick={() => void answer(choice)}>
              {choice}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <p style={{ margin: 0 }}>{message}</p>
      </Card>
      <LiveBoardPreview userId={userId} />
    </div>
  );
}
