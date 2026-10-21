import { EvaluationResult, QuestionReview } from "./types";

export interface EvaluatableOption {
  id: string;
  text?: string;
  isCorrect: boolean;
}

export interface EvaluatableQuestion {
  id: string;
  stem?: string;
  solutionExplanation?: string | null;
  positiveMarks?: number | null;
  negativePenalty?: number | null;
  options: EvaluatableOption[];
}

export interface EvaluatableExam {
  title: string;
  positiveMarks: number;
  negativePenalty: number;
  sections: {
    title?: string;
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

  let globalQuestionNumber = 1;
  const questionReviews: QuestionReview[] = [];

  for (const section of exam.sections) {
    const secTitle = section.title || "general";

    for (const q of section.questions) {
      const pos = q.positiveMarks ?? exam.positiveMarks;
      const neg = q.negativePenalty ?? exam.negativePenalty;
      maxMarks += pos;

      const selectedOptionId = attemptMap.get(q.id);
      const chosenOption = selectedOptionId
        ? q.options.find((opt) => opt.id === selectedOptionId)
        : null;
      const correctOption = q.options.find((opt) => opt.isCorrect);

      const isAttempted = !!selectedOptionId;
      const isCorrect = !!chosenOption?.isCorrect;

      if (!selectedOptionId) {
        unattemptedQuestions++;
      } else {
        questionsAttempted++;
        if (isCorrect) {
          correctResponses++;
          finalScore += pos;
        } else {
          incorrectResponses++;
          finalScore -= neg;
        }
      }

      if (q.stem) {
        questionReviews.push({
          id: q.id,
          sectionTitle: secTitle,
          questionNumber: globalQuestionNumber,
          stem: q.stem,
          selectedOptionText: chosenOption?.text || null,
          correctOptionText: correctOption?.text || "(unspecified)",
          isCorrect,
          isAttempted,
          solutionExplanation: q.solutionExplanation || null,
        });
      }

      globalQuestionNumber++;
    }
  }

  const totalQuestions = globalQuestionNumber - 1;

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
    questionReviews,
  };
}
