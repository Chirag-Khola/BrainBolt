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

type User = { id: string; email: string; displayName: string };

export default function QuizClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<NextQuestionResponse | null>(null);
  const [message, setMessage] = useState("Start answering to adapt difficulty.");

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
    if (!res.ok) {
      setUser(null);
      return;
    }
    const json = (await res.json()) as { user: User };
    setUser(json.user);
  }, []);

  const loadNext = useCallback(async () => {
    const res = await fetch("/api/v1/quiz/next", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as NextQuestionResponse;
    setData(json);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (user) void loadNext();
  }, [user, loadNext]);

  const submitAuth = useCallback(async () => {
    const endpoint = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
    const payload = authMode === "login" ? { email, password } : { email, password, displayName };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      setMessage("Auth failed. Check credentials/password length.");
      return;
    }
    setMessage("Authenticated.");
    await loadMe();
  }, [authMode, displayName, email, password, loadMe]);

  const logout = useCallback(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setData(null);
    setUser(null);
  }, []);

  const answer = useCallback(
    async (choice: string) => {
      if (!data) return;
      const res = await fetch("/api/v1/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  if (!user) {
    return (
      <Card>
        <h2>{authMode === "login" ? "Login" : "Sign up"}</h2>
        <div className="grid">
          {authMode === "signup" && <input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={() => void submitAuth()}>{authMode === "login" ? "Login" : "Create account"}</Button>
          <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
            {authMode === "login" ? "Need an account? Sign up" : "Have an account? Login"}
          </button>
          <p>{message}</p>
        </div>
      </Card>
    );
  }

  if (!data) return <p>Loading question…</p>;

  return (
    <div className="grid">
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0 }}>Signed in as <strong>{user.displayName}</strong></p>
          <button onClick={() => void logout()}>Logout</button>
        </div>
      </Card>
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
      <LiveBoardPreview userId={user.id} />
    </div>
  );
}
