const endpoint = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

async function load() {
  const [scoreRes, streakRes] = await Promise.all([
    fetch(`${endpoint}/api/v1/leaderboard/score`, { cache: "no-store" }),
    fetch(`${endpoint}/api/v1/leaderboard/streak`, { cache: "no-store" })
  ]);
  return {
    score: (await scoreRes.json()) as { leaders: Array<{ userId: string; totalScore: number; user: { displayName: string } }> },
    streak: (await streakRes.json()) as { leaders: Array<{ userId: string; maxStreak: number; user: { displayName: string } }> }
  };
}

export default async function LeaderboardPage() {
  const data = await load();
  return (
    <div className="grid grid-2">
      <section>
        <h2>Total Score</h2>
        {data.score.leaders.map((u, i) => (
          <p key={u.userId}>#{i + 1} {u.user.displayName} - {u.totalScore}</p>
        ))}
      </section>
      <section>
        <h2>Max Streak</h2>
        {data.streak.leaders.map((u, i) => (
          <p key={u.userId}>#{i + 1} {u.user.displayName} - {u.maxStreak}</p>
        ))}
      </section>
    </div>
  );
}
