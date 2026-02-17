# BrainBolt Low-Level Design

## Module responsibilities
- `lib/quizEngine.ts`: adaptive difficulty, scoring, streak decay, idempotency, and leaderboard/rank queries.
- `lib/auth/session.ts`: cookie-based session lifecycle.
- `app/api/v1/auth/*`: signup/login/logout/me.
- `app/api/v1/quiz/*`: next question, submit answer, user metrics.
- `app/api/v1/leaderboard/*`: live score/streak leaderboards.
- `lib/db.ts`: Prisma client singleton.
- `prisma/schema.prisma`: PostgreSQL schema.

## API schemas
### POST `/v1/auth/signup`
Request: `email`, `password`, `displayName`
Response: authenticated `user`

### POST `/v1/auth/login`
Request: `email`, `password`
Response: authenticated `user`

### GET `/v1/quiz/next`
Auth required. Response: `questionId`, `difficulty`, `prompt`, `choices`, `sessionId`, `stateVersion`, `currentScore`, `currentStreak`

### POST `/v1/quiz/answer`
Auth required. Request: `sessionId`, `questionId`, `answer`, `stateVersion`, `answerIdempotencyKey`
Response: `correct`, `newDifficulty`, `newStreak`, `scoreDelta`, `totalScore`, `stateVersion`, `leaderboardRankScore`, `leaderboardRankStreak`

### GET `/v1/quiz/metrics`
Auth required. Response: `currentDifficulty`, `streak`, `maxStreak`, `totalScore`, `accuracy`, `difficultyHistogram`, `recentPerformance`

### GET `/v1/leaderboard/score`
Response: top users by `totalScore`

### GET `/v1/leaderboard/streak`
Response: top users by `maxStreak`

## PostgreSQL schema + indexes
- `User(id PK, email UNIQUE, displayName, passwordHash, createdAt)`
- `Session(id PK, userId FK, tokenHash UNIQUE, expiresAt)`
  - indexes: `(userId)`, `(expiresAt)`
- `Question(id PK, difficulty INDEX, prompt, choices(JSON), correctAnswerHash, tags[])`
- `UserState(userId PK/FK, currentDifficulty, streak, maxStreak, totalScore, answeredCount, correctCount, stateVersion, confidence, rolling[], lastQuestionId, lastAnswerAt)`
  - indexes: `totalScore DESC`, `maxStreak DESC`
- `AnswerLog(id PK, userId FK, questionId FK-logical, difficulty, answer, correct, scoreDelta, streakAtAnswer, answeredAt, idempotencyKey)`
  - unique: `(userId, idempotencyKey)`
  - indexes: `(userId, answeredAt DESC)`, `(questionId)`

## Cache strategy (Redis)
- `brainbolt:user:{userId}` TTL 1h (optional read acceleration of denormalized state).
- `brainbolt:questions:{difficulty}` TTL 1h.
- Invalidation:
  - user cache refreshed after each accepted answer.
  - question pool cache invalidated by TTL / reseed.
- Strong correctness source is PostgreSQL transaction.

## Adaptive algorithm (ping-pong stabilizer)
Momentum + rolling window + hysteresis:

```pseudo
confidence = clamp(0.7 * confidence + (correct ? +1 : -1), -3, +3)
rolling = last5(correct?) mapped to +/-1
signal = confidence + avg(rolling)
if signal >= +1.2: difficulty++ and confidence=0
if signal <= -1.2: difficulty-- and confidence=0
```

## Scoring
```pseudo
if incorrect:
  scoreDelta = -round(difficulty * 1.5)
  streak = 0
else:
  streak += 1
  multiplier = min(1 + streak * 0.15, 3)
  scoreDelta = round(10 * (1 + difficulty/10) * (0.7 + accuracy) * multiplier)
```

## Edge case handling
- Wrong answer resets streak.
- Inactivity decay: every 5 min idle lowers streak by 1.
- Idempotent submit via unique `(userId, idempotencyKey)`.
- Difficulty clamped in `[1, 10]`.
- `stateVersion` conflict blocks stale writes.
- Score floor at `0`.
- Avoid repeating previous question when alternatives exist.

## Leaderboard update strategy
- Answer submission runs inside a single PostgreSQL transaction.
- `UserState.totalScore/maxStreak` update is immediate.
- Leaderboard query sorts directly on indexed columns.
- Rank in answer response computed from count of strictly greater scores/streaks.
