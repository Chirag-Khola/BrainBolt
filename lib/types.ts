export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Question = {
  id: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  tags: string[];
};

export type UserState = {
  userId: string;
  currentDifficulty: Difficulty;
  streak: number;
  maxStreak: number;
  totalScore: number;
  answeredCount: number;
  correctCount: number;
  stateVersion: number;
  confidence: number;
  rolling: boolean[];
  lastQuestionId?: string;
  lastAnswerAt?: number;
};

export type AnswerLog = {
  id: string;
  userId: string;
  questionId: string;
  difficulty: Difficulty;
  answer: string;
  correct: boolean;
  scoreDelta: number;
  streakAtAnswer: number;
  answeredAt: number;
  idempotencyKey: string;
};

export type LeaderboardEntry = {
  userId: string;
  totalScore: number;
  streak: number;
  maxStreak: number;
  updatedAt: number;
};
