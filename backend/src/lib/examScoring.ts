import { TestQuestionType } from '@prisma/client';

export type ExamQuestionForScoring = {
  id: string;
  sortOrder: number;
  type: TestQuestionType;
  questionText: string;
  options?: unknown;
  correctAnswer: string | null;
};

export type QuestionBreakdown = {
  questionId: string;
  sortOrder: number;
  type: string;
  questionText: string;
  givenAnswer: string;
  correctAnswer: string;
  points: number;
  maxPoints: number;
  status: 'correct' | 'partial' | 'wrong' | 'unanswered';
};

export type ExamGradeResult = {
  rawScore: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  passMarksRequired: number;
  correctCount: number;
  partialCount: number;
  wrongCount: number;
  unansweredCount: number;
  breakdown: QuestionBreakdown[];
};

const TYPE_DB_TO_UI: Record<TestQuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
};

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function scoreAnswer(
  type: TestQuestionType,
  correct: string | null,
  given: string,
): { points: number; maxPoints: number; status: QuestionBreakdown['status'] } {
  const maxPoints = 1;
  if (!given.trim()) return { points: 0, maxPoints, status: 'unanswered' };
  if (!correct?.trim()) return { points: 0, maxPoints, status: 'wrong' };

  const c = normalizeAnswer(correct);
  const g = normalizeAnswer(given);

  if (type === TestQuestionType.SHORT_ANSWER) {
    if (g === c) return { points: 1, maxPoints, status: 'correct' };
    if (c.includes(g) || g.includes(c)) return { points: 0.5, maxPoints, status: 'partial' };
    return { points: 0, maxPoints, status: 'wrong' };
  }

  return g === c
    ? { points: 1, maxPoints, status: 'correct' }
    : { points: 0, maxPoints, status: 'wrong' };
}

export function gradeExam(
  questions: ExamQuestionForScoring[],
  answers: Record<string, string>,
  passMarksPercent: number,
): ExamGradeResult {
  let rawScore = 0;
  let correctCount = 0;
  let partialCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const breakdown: QuestionBreakdown[] = questions.map((q) => {
    const given = answers[q.id] || '';
    const { points, maxPoints, status } = scoreAnswer(q.type, q.correctAnswer, given);
    rawScore += points;
    if (status === 'correct') correctCount += 1;
    else if (status === 'partial') partialCount += 1;
    else if (status === 'unanswered') unansweredCount += 1;
    else wrongCount += 1;

    return {
      questionId: q.id,
      sortOrder: q.sortOrder,
      type: TYPE_DB_TO_UI[q.type],
      questionText: q.questionText,
      givenAnswer: given,
      correctAnswer: q.correctAnswer || '',
      points,
      maxPoints,
      status,
    };
  });

  const maxScore = questions.length;
  const percent = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const passed = percent >= passMarksPercent;

  return {
    rawScore,
    maxScore,
    percent,
    passed,
    passMarksRequired: passMarksPercent,
    correctCount,
    partialCount,
    wrongCount,
    unansweredCount,
    breakdown,
  };
}
