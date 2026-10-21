import { EvaluationResult } from "./types";

export interface EvaluatableOption {
  id: string;
  isCorrect: boolean;
}

export interface EvaluatableQuestion {
  id: string;
  positiveMarks?: number | null;
  negativePenalty?: number | null;
  options: EvaluatableOption[];
}

export interface EvaluatableExam {
  title: string;
  positiveMarks: number;
  negativePenalty: number;
  sections: {
    questions: EvaluatableQuestion[];
  }[];
}

export interface StoredAttempt {
  questionId: string;
  optionId: string | null;
  status: string;
}

/**
 * Evaluates candidate responses against authoritative answer keys.
 * Deterministic psychometric calculation matching national examination standards.
 */
export function evaluateSession(
  exam: EvaluatableExam,
  attempts: StoredAttempt[],
  candidateName: string
): EvaluationResult {
  const allQuestions = exam.sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;

  const attemptMap = new Map<string, string | null>();
  for (const a of attempts) {
    if (a.optionId && a.status === "ATTEMPTED_SAVED") {
      attemptMap.set(a.questionId, a.optionId);
    }
  }

  let questionsAttempted = 0;
  let correctResponses = 0;
  let incorrectResponses = 0;
  let unattemptedQuestions = 0;
  let finalScore = 0;
  let maxMarks = 0;

  for (const q of allQuestions) {
    const pos = q.positiveMarks ?? exam.positiveMarks;
    const neg = q.negativePenalty ?? exam.negativePenalty;
    maxMarks += pos;

    const selectedOptionId = attemptMap.get(q.id);

    if (!selectedOptionId) {
      unattemptedQuestions++;
      continue;
    }

    questionsAttempted++;
    const chosenOption = q.options.find((opt) => opt.id === selectedOptionId);

    if (chosenOption && chosenOption.isCorrect) {
      correctResponses++;
      finalScore += pos;
    } else {
      incorrectResponses++;
      finalScore -= neg;
    }
  }

  return {
    totalQuestions,
    maxMarks,
    questionsAttempted,
    correctResponses,
    incorrectResponses,
    unattemptedQuestions,
    finalScore: Math.round(finalScore * 100) / 100,
    candidateName,
    examTitle: exam.title,
  };
}
