import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { questions as seedQuestions } from "@/lib/questions";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const STREAK_MULTIPLIER_CAP = 3;
const STREAK_STEP = 0.15;
const DECAY_WINDOW_MS = 1000 * 60 * 5;
const BASE_POINTS = 10;
const ROLLING_WINDOW = 5;
const HYSTERESIS_UP = 1.2;
const HYSTERESIS_DOWN = -1.2;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const hashAnswer = (answer: string) => createHash("sha256").update(answer).digest("hex");
const streakMultiplier = (streak: number) => clamp(1 + streak * STREAK_STEP, 1, STREAK_MULTIPLIER_CAP);

let seeded = false;
export const ensureSeededQuestions = async () => {
  if (seeded) return;
  await db.question.createMany({
    data: seedQuestions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      prompt: q.prompt,
      choices: q.choices,
      correctAnswerHash: q.correctAnswerHash,
      tags: q.tags
    })),
    skipDuplicates: true
  });
  seeded = true;
};

const decayStreak = (streak: number, lastAnswerAt: Date | null) => {
  if (!lastAnswerAt) return streak;
  const idleWindows = Math.floor((Date.now() - lastAnswerAt.getTime()) / DECAY_WINDOW_MS);
  if (idleWindows <= 0) return streak;
  return Math.max(0, streak - idleWindows);
};

const updateDifficulty = (state: { currentDifficulty: number; confidence: number; rolling: boolean[] }, correct: boolean) => {
  const impulse = correct ? 1 : -1;
  let confidence = clamp(state.confidence * 0.7 + impulse, -3, 3);

  const rolling = [...state.rolling, correct].slice(-ROLLING_WINDOW);
  const rollingScore = rolling.reduce((acc, curr) => acc + (curr ? 1 : -1), 0) / rolling.length;
  const signal = confidence + rollingScore;

  let currentDifficulty = state.currentDifficulty;
  if (signal >= HYSTERESIS_UP) {
    currentDifficulty = clamp(currentDifficulty + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
    confidence = 0;
  } else if (signal <= HYSTERESIS_DOWN) {
    currentDifficulty = clamp(currentDifficulty - 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
    confidence = 0;
  }

  return { currentDifficulty, confidence, rolling };
};

const calcScoreDelta = (difficulty: number, correct: boolean, accuracy: number, streak: number) => {
  if (!correct) return -Math.round(difficulty * 1.5);
  const difficultyWeight = 1 + difficulty / 10;
  const accuracyWeight = 0.7 + accuracy;
  return Math.round(BASE_POINTS * difficultyWeight * accuracyWeight * streakMultiplier(streak));
};

export const getOrCreateUserState = async (userId: string) => {
  await ensureSeededQuestions();
  const existing = await db.userState.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.userState.create({
    data: {
      userId,
      currentDifficulty: 3,
      streak: 0,
      maxStreak: 0,
      totalScore: 0,
      answeredCount: 0,
      correctCount: 0,
      stateVersion: 1,
      confidence: 0,
      rolling: []
    }
  });
};

export const nextQuestion = async (userId: string) => {
  await ensureSeededQuestions();
  const current = await getOrCreateUserState(userId);
  const streak = decayStreak(current.streak, current.lastAnswerAt);
  if (streak !== current.streak) {
    await db.userState.update({ where: { userId }, data: { streak } });
  }

  const pool = await db.question.findMany({ where: { difficulty: current.currentDifficulty } });
  const filtered = pool.filter((q) => q.id !== current.lastQuestionId);
  const source = filtered.length > 0 ? filtered : pool;
  const question = source[Math.floor(Math.random() * source.length)];

  return {
    questionId: question.id,
    difficulty: question.difficulty,
    prompt: question.prompt,
    choices: question.choices as string[],
    currentScore: current.totalScore,
    currentStreak: streak,
    sessionId: `session-${userId}`,
    stateVersion: current.stateVersion
  };
};

export const submitAnswer = async (input: {
  userId: string;
  sessionId: string;
  questionId: string;
  answer: string;
  stateVersion: number;
  answerIdempotencyKey: string;
}) => {
  await ensureSeededQuestions();
  return db.$transaction(async (tx) => {
    const existing = await tx.answerLog.findUnique({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.answerIdempotencyKey } }
    });

    const state = await tx.userState.findUnique({ where: { userId: input.userId } });
    if (!state) return { error: "STATE_NOT_FOUND" as const };

    if (existing) {
      return {
        correct: existing.correct,
        newDifficulty: state.currentDifficulty,
        newStreak: state.streak,
        scoreDelta: 0,
        totalScore: state.totalScore,
        stateVersion: state.stateVersion,
        leaderboardRankScore: await getRankTx(tx, input.userId, "score"),
        leaderboardRankStreak: await getRankTx(tx, input.userId, "streak"),
        idempotentReplay: true
      };
    }

    if (input.stateVersion !== state.stateVersion) {
      return { error: "STATE_VERSION_CONFLICT" as const, expected: state.stateVersion };
    }

    const question = await tx.question.findUnique({ where: { id: input.questionId } });
    if (!question) return { error: "QUESTION_NOT_FOUND" as const };

    const decayedStreak = decayStreak(state.streak, state.lastAnswerAt);
    const correct = question.correctAnswerHash === hashAnswer(input.answer);
    const answeredCount = state.answeredCount + 1;
    const correctCount = state.correctCount + (correct ? 1 : 0);
    const streak = correct ? decayedStreak + 1 : 0;
    const maxStreak = Math.max(state.maxStreak, streak);
    const accuracy = correctCount / Math.max(1, answeredCount);
    const scoreDelta = calcScoreDelta(question.difficulty, correct, accuracy, streak);
    const totalScore = Math.max(0, state.totalScore + scoreDelta);

    const diffUpdate = updateDifficulty(
      {
        currentDifficulty: state.currentDifficulty,
        confidence: state.confidence,
        rolling: state.rolling
      },
      correct
    );

    const updatedState = await tx.userState.update({
      where: { userId: input.userId },
      data: {
        currentDifficulty: diffUpdate.currentDifficulty,
        confidence: diffUpdate.confidence,
        rolling: diffUpdate.rolling,
        streak,
        maxStreak,
        totalScore,
        answeredCount,
        correctCount,
        stateVersion: { increment: 1 },
        lastAnswerAt: new Date(),
        lastQuestionId: question.id
      }
    });

    await tx.answerLog.create({
      data: {
        userId: input.userId,
        questionId: question.id,
        difficulty: question.difficulty,
        answer: input.answer,
        correct,
        scoreDelta,
        streakAtAnswer: streak,
        idempotencyKey: input.answerIdempotencyKey
      }
    });

    return {
      correct,
      newDifficulty: updatedState.currentDifficulty,
      newStreak: updatedState.streak,
      scoreDelta,
      totalScore: updatedState.totalScore,
      stateVersion: updatedState.stateVersion,
      leaderboardRankScore: await getRankTx(tx, input.userId, "score"),
      leaderboardRankStreak: await getRankTx(tx, input.userId, "streak")
    };
  });
};

const getRankTx = async (tx: Prisma.TransactionClient | typeof db, userId: string, mode: "score" | "streak") => {
  const target = await tx.userState.findUnique({ where: { userId } });
  if (!target) return null;
  const count =
    mode === "score"
      ? await tx.userState.count({ where: { totalScore: { gt: target.totalScore } } })
      : await tx.userState.count({ where: { maxStreak: { gt: target.maxStreak } } });
  return count + 1;
};

export const getMetrics = async (userId: string) => {
  await ensureSeededQuestions();
  const state = await getOrCreateUserState(userId);
  const recentPerformance = state.rolling.map((item) => (item ? 1 : 0));
  const questions = await db.question.findMany({ select: { difficulty: true } });
  const difficultyHistogram = questions.reduce<Record<number, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  return {
    currentDifficulty: state.currentDifficulty,
    streak: state.streak,
    maxStreak: state.maxStreak,
    totalScore: state.totalScore,
    accuracy: state.correctCount / Math.max(1, state.answeredCount),
    difficultyHistogram,
    recentPerformance
  };
};

export const topScoreLeaderboard = async () =>
  db.userState.findMany({
    orderBy: [{ totalScore: "desc" }, { user: { createdAt: "asc" } }],
    take: 10,
    select: { userId: true, totalScore: true, user: { select: { displayName: true } } }
  });

export const topStreakLeaderboard = async () =>
  db.userState.findMany({
    orderBy: [{ maxStreak: "desc" }, { user: { createdAt: "asc" } }],
    take: 10,
    select: { userId: true, maxStreak: true, user: { select: { displayName: true } } }
  });

export const getRank = async (userId: string, mode: "score" | "streak") => getRankTx(db, userId, mode);
