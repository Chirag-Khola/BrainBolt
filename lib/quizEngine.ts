import { questions } from "@/lib/questions";
import { cacheKeys, redis } from "@/lib/cache";
import { AnswerLog, Difficulty, LeaderboardEntry, Question, UserState } from "@/lib/types";

const MIN_DIFFICULTY: Difficulty = 1;
const MAX_DIFFICULTY: Difficulty = 10;
const STREAK_MULTIPLIER_CAP = 3;
const STREAK_STEP = 0.15;
const DECAY_WINDOW_MS = 1000 * 60 * 5;
const BASE_POINTS = 10;
const ROLLING_WINDOW = 5;
const HYSTERESIS_UP = 1.2;
const HYSTERESIS_DOWN = -1.2;

const users = new Map<string, UserState>();
const answerLogs = new Map<string, AnswerLog>();
const scoreBoard = new Map<string, LeaderboardEntry>();
const locks = new Map<string, Promise<void>>();

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const toDifficulty = (n: number): Difficulty => clamp(n, MIN_DIFFICULTY, MAX_DIFFICULTY) as Difficulty;

export const getOrCreateUserState = async (userId: string): Promise<UserState> => {
  if (users.has(userId)) return users.get(userId)!;

  if (redis) {
    const cached = await redis.get(cacheKeys.userState(userId));
    if (cached) {
      const parsed = JSON.parse(cached) as UserState;
      users.set(userId, parsed);
      return parsed;
    }
  }

  const initial: UserState = {
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
  };

  users.set(userId, initial);
  return initial;
};

export const getQuestionForDifficulty = async (difficulty: Difficulty, lastQuestionId?: string): Promise<Question> => {
  const key = cacheKeys.questionPool(difficulty);
  let pool: Question[] = [];

  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      pool = JSON.parse(cached) as Question[];
    }
  }

  if (pool.length === 0) {
    pool = questions.filter((q) => q.difficulty === difficulty);
    if (redis && pool.length > 0) {
      await redis.set(key, JSON.stringify(pool), "EX", 3600);
    }
  }

  const filtered = pool.filter((q) => q.id !== lastQuestionId);
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)];
};

const streakMultiplier = (streak: number) => clamp(1 + streak * STREAK_STEP, 1, STREAK_MULTIPLIER_CAP);

const decayStreak = (state: UserState, now: number) => {
  if (!state.lastAnswerAt) return;
  const idleWindows = Math.floor((now - state.lastAnswerAt) / DECAY_WINDOW_MS);
  if (idleWindows > 0) {
    state.streak = Math.max(0, state.streak - idleWindows);
  }
};

const updateDifficulty = (state: UserState, correct: boolean): Difficulty => {
  const impulse = correct ? 1 : -1;
  state.confidence = clamp(state.confidence * 0.7 + impulse, -3, 3);

  state.rolling.push(correct);
  if (state.rolling.length > ROLLING_WINDOW) state.rolling.shift();
  const rollingScore = state.rolling.reduce((acc, curr) => acc + (curr ? 1 : -1), 0) / state.rolling.length;
  const signal = state.confidence + rollingScore;

  if (signal >= HYSTERESIS_UP) {
    state.currentDifficulty = toDifficulty(state.currentDifficulty + 1);
    state.confidence = 0;
  } else if (signal <= HYSTERESIS_DOWN) {
    state.currentDifficulty = toDifficulty(state.currentDifficulty - 1);
    state.confidence = 0;
  }

  return state.currentDifficulty;
};

const calcScoreDelta = (difficulty: Difficulty, correct: boolean, accuracy: number, streak: number) => {
  if (!correct) return -Math.round(difficulty * 1.5);
  const difficultyWeight = 1 + difficulty / 10;
  const accuracyWeight = 0.7 + accuracy;
  return Math.round(BASE_POINTS * difficultyWeight * accuracyWeight * streakMultiplier(streak));
};

const rankBy = (entries: LeaderboardEntry[], field: "totalScore" | "streak") =>
  entries.sort((a, b) => b[field] - a[field] || a.updatedAt - b.updatedAt);

const persistState = async (state: UserState) => {
  users.set(state.userId, state);
  if (redis) {
    await redis.set(cacheKeys.userState(state.userId), JSON.stringify(state), "EX", 3600);
  }
};

const withUserLock = async <T>(userId: string, fn: () => Promise<T>): Promise<T> => {
  const prev = locks.get(userId) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(userId, prev.then(() => current));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(userId) === current) locks.delete(userId);
  }
};

export const nextQuestion = async (userId: string) => {
  const state = await getOrCreateUserState(userId);
  decayStreak(state, Date.now());
  const question = await getQuestionForDifficulty(state.currentDifficulty, state.lastQuestionId);
  await persistState(state);
  return {
    questionId: question.id,
    difficulty: question.difficulty,
    prompt: question.prompt,
    choices: question.choices,
    currentScore: state.totalScore,
    currentStreak: state.streak,
    sessionId: `session-${userId}`,
    stateVersion: state.stateVersion
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
  return withUserLock(input.userId, async () => {
    if (answerLogs.has(input.answerIdempotencyKey)) {
      const existing = answerLogs.get(input.answerIdempotencyKey)!;
      const state = await getOrCreateUserState(input.userId);
      return {
        correct: existing.correct,
        newDifficulty: state.currentDifficulty,
        newStreak: state.streak,
        scoreDelta: 0,
        totalScore: state.totalScore,
        stateVersion: state.stateVersion,
        leaderboardRankScore: getRank(input.userId, "totalScore"),
        leaderboardRankStreak: getRank(input.userId, "streak"),
        idempotentReplay: true
      };
    }

    const state = await getOrCreateUserState(input.userId);
    if (input.stateVersion !== state.stateVersion) {
      return {
        error: "STATE_VERSION_CONFLICT",
        expected: state.stateVersion
      };
    }

    decayStreak(state, Date.now());
    const question = questions.find((q) => q.id === input.questionId);
    if (!question) return { error: "QUESTION_NOT_FOUND" };

    const correct = question.correctAnswer === input.answer;
    state.answeredCount += 1;
    if (correct) {
      state.correctCount += 1;
      state.streak += 1;
      state.maxStreak = Math.max(state.maxStreak, state.streak);
    } else {
      state.streak = 0;
    }

    const accuracy = state.correctCount / Math.max(1, state.answeredCount);
    const scoreDelta = calcScoreDelta(question.difficulty, correct, accuracy, state.streak);
    state.totalScore = Math.max(0, state.totalScore + scoreDelta);
    state.currentDifficulty = updateDifficulty(state, correct);
    state.stateVersion += 1;
    state.lastAnswerAt = Date.now();
    state.lastQuestionId = question.id;

    const log: AnswerLog = {
      id: `${input.userId}-${state.stateVersion}`,
      userId: input.userId,
      questionId: question.id,
      difficulty: question.difficulty,
      answer: input.answer,
      correct,
      scoreDelta,
      streakAtAnswer: state.streak,
      answeredAt: state.lastAnswerAt,
      idempotencyKey: input.answerIdempotencyKey
    };
    answerLogs.set(input.answerIdempotencyKey, log);

    scoreBoard.set(input.userId, {
      userId: input.userId,
      totalScore: state.totalScore,
      streak: state.streak,
      maxStreak: state.maxStreak,
      updatedAt: Date.now()
    });

    await persistState(state);

    return {
      correct,
      newDifficulty: state.currentDifficulty,
      newStreak: state.streak,
      scoreDelta,
      totalScore: state.totalScore,
      stateVersion: state.stateVersion,
      leaderboardRankScore: getRank(input.userId, "totalScore"),
      leaderboardRankStreak: getRank(input.userId, "streak")
    };
  });
};

export const getMetrics = async (userId: string) => {
  const state = await getOrCreateUserState(userId);
  const recentPerformance = state.rolling.map((item) => (item ? 1 : 0));
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

export const topScoreLeaderboard = () => rankBy(Array.from(scoreBoard.values()), "totalScore").slice(0, 10);

export const topStreakLeaderboard = () =>
  Array.from(scoreBoard.values())
    .sort((a, b) => b.maxStreak - a.maxStreak || a.updatedAt - b.updatedAt)
    .slice(0, 10)
    .map((entry) => ({ userId: entry.userId, maxStreak: entry.maxStreak, updatedAt: entry.updatedAt }));

export const getRank = (userId: string, mode: "totalScore" | "streak") => {
  const sorted = rankBy(Array.from(scoreBoard.values()), mode);
  const idx = sorted.findIndex((entry) => entry.userId === userId);
  return idx >= 0 ? idx + 1 : null;
};
