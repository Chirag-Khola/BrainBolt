# BrainBolt - Adaptive Infinite Quiz Platform

A Next.js + TypeScript single-page quiz app with adaptive difficulty, streak multipliers, idempotent answer submission, and live leaderboards.

## One-command run (full stack)
```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Tech stack
- Next.js 14 (App Router)
- TypeScript
- Redis (cache)
- In-memory stores for demo persistence

## Features delivered
- One-question-at-a-time infinite quiz flow
- Adaptive algorithm with anti ping-pong stabilizers:
  - confidence momentum
  - rolling performance window
  - hysteresis thresholds
- Streak multiplier with cap
- Score model using difficulty + accuracy + streak
- Streak reset on wrong answer
- Streak decay after inactivity
- Idempotent answer handling using `answerIdempotencyKey`
- Live leaderboards for total score and streak
- SSR route: `/leaderboard`
- CSR route: `/` for interaction-heavy quiz
- Dynamic import of non-critical leaderboard preview

## API routes
- `GET /api/v1/quiz/next?userId=...`
- `POST /api/v1/quiz/answer`
- `GET /api/v1/quiz/metrics?userId=...`
- `GET /api/v1/leaderboard/score`
- `GET /api/v1/leaderboard/streak`

## Assignment artifacts
- LLD doc: `docs/LLD.md`
- Demo video placeholder: `demo-video.mp4`
