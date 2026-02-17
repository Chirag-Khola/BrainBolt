# BrainBolt - Adaptive Infinite Quiz Platform

BrainBolt is a Next.js + TypeScript quiz platform with adaptive difficulty, authenticated multi-user sessions, PostgreSQL persistence, and live leaderboards.

## One-command run (full stack)
```bash
docker compose up --build
```

Open `http://localhost:3000`.

This starts:
- Next.js app
- PostgreSQL (system of record)
- Redis (cache)

## Do I need to create a database manually?
No for Docker flow — `docker compose` provisions Postgres, and app startup runs:
- `prisma db push` (sync schema)
- seed of static questions on first request

## Local dev without Docker
1. Start Postgres + Redis locally.
2. Create `.env.local`:
```bash
DATABASE_URL="postgresql://brainbolt:brainbolt@localhost:5432/brainbolt?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```
3. Install and prep DB:
```bash
npm install
npx prisma generate
npx prisma db push
```
4. Run app:
```bash
npm run dev
```

## Auth + Multi-user
- Signup/Login/Logout endpoints with secure httpOnly session cookie.
- Every quiz state, answers, and leaderboard entry are keyed by authenticated user.
- Open multiple browsers/incognito windows with different accounts to see multi-user leaderboard movement.

## API routes
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/quiz/next`
- `POST /api/v1/quiz/answer`
- `GET /api/v1/quiz/metrics`
- `GET /api/v1/leaderboard/score`
- `GET /api/v1/leaderboard/streak`

## Assignment artifacts
- LLD doc: `docs/LLD.md`
- Demo video placeholder: `demo-video.mp4`
