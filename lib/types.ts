export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type QuizQuestion = {
  id: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  tags: string[];
};
