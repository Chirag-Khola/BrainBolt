# BrainBolt Low-Level Design

## Module responsibilities
- `lib/quizEngine.ts`: adaptive difficulty, scoring, streak decay, idempotency, leaderboard updates.
- `app/api/v1/quiz/*`: fetch next question, submit answer, read user metrics.
- `app/api/v1/leaderboard/*`: exposes live score and streak boards.
- `lib/cache.ts`: Redis cache for user state and question pools.
- `components/*`: reusable UI primitives and quiz widgets.

## API Schemas
### GET `/v1/quiz/next`
Request: `userId`, optional `sessionId`
Response: `questionId`, `difficulty`, `prompt`, `choices`, `sessionId`, `stateVersion`, `currentScore`, `currentStreak`

### POST `/v1/quiz/answer`
Request: `userId`, `sessionId`, `questionId`, `answer`, `stateVersion`, `answerIdempotencyKey`
Response: `correct`, `newDifficulty`, `newStreak`, `scoreDelta`, `totalScore`, `stateVersion`, `leaderboardRankScore`, `leaderboardRankStreak`

### GET `/v1/quiz/metrics`
Response: `currentDifficulty`, `streak`, `maxStreak`, `totalScore`, `accuracy`, `difficultyHistogram`, `recentPerformance`

## DB schema + indexes
- `users(id PK, createdAt)`
- `questions(id PK, difficulty INDEX, prompt, choices, correctAnswerHash, tags)`
- `user_state(userId PK, currentDifficulty, streak, maxStreak, totalScore, answeredCount, correctCount, confidence, rolling, stateVersion, lastQuestionId, lastAnswerAt)`
- `answer_log(id PK, userId INDEX, questionId INDEX, idempotencyKey UNIQUE, difficulty, answer, correct, scoreDelta, streakAtAnswer, answeredAt)`
- `leaderboard_score(userId PK, totalScore INDEX DESC, updatedAt)`
- `leaderboard_streak(userId PK, maxStreak INDEX DESC, updatedAt)`

## Cache strategy
- `brainbolt:user:{userId}` TTL 1h for user state.
- `brainbolt:questions:{difficulty}` TTL 1h for per-difficulty pools.
- Invalidation:
  - user state overwritten immediately after each answer (write-through cache).
  - question pools invalidated on catalog update (or TTL expiry).
- Real-time correctness:
  - answer updates state + boards synchronously in one critical section (`withUserLock`).

## Adaptive algorithm (ping-pong stabilizer)
Uses **momentum + rolling window + hysteresis**:

```pseudo
signal = confidence + rolling_window_score
if signal >= +1.2: difficulty += 1 and confidence = 0
if signal <= -1.2: difficulty -= 1 and confidence = 0
```

Where:
- `confidence = 0.7 * confidence + (correct ? +1 : -1)`
- `rolling_window_score = avg(last 5 outcomes mapped to +1/-1)`

This damps rapid alternation and prevents endless 5↔6 oscillation.

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
- Inactivity decay: every 5 min idle decreases streak by 1.
- Idempotent answer submission via `answerIdempotencyKey` dedupe map (no double updates).
- Difficulty boundaries clamped `[1,10]`.
- `stateVersion` conflict protected against stale clients.
- Score never below `0`.
- Repeating last question avoided when alternative exists.

## Leaderboard update strategy
- On each accepted answer:
  1. update `user_state`
  2. update score board entry
  3. recompute rank when requested
- Current rank included in answer response.
