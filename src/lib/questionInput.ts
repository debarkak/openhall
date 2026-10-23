export interface QuestionInput {
  stem: string;
  diagramUrl: string | null;
  solutionExplanation: string | null;
  options: {
    text: string;
    imageUrl: string | null;
    isCorrect: boolean;
  }[];
}

export function parseQuestionInput(value: unknown):
  | { ok: true; input: QuestionInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "A question and its answer choices are required." };
  }

  const body = value as Record<string, unknown>;
  if (typeof body.stem !== "string" || !body.stem.trim()) {
    return { ok: false, error: "Add a question prompt before saving." };
  }

  if (body.stem.length > 10000) {
    return { ok: false, error: "Question prompts must be 10,000 characters or fewer." };
  }

  if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6) {
    return { ok: false, error: "Add between 2 and 6 answer choices." };
  }

  const options: QuestionInput["options"] = [];
  for (const option of body.options) {
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      return { ok: false, error: "Each answer choice needs text." };
    }

    const item = option as Record<string, unknown>;
    if (typeof item.text !== "string" || !item.text.trim()) {
      return { ok: false, error: "Remove blank answer choices or add their text." };
    }
    if (item.text.length > 2000) {
      return { ok: false, error: "Answer choices must be 2,000 characters or fewer." };
    }

    options.push({
      text: item.text.trim(),
      imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl.trim() : null,
      isCorrect: item.isCorrect === true,
    });
  }

  if (options.filter((option) => option.isCorrect).length !== 1) {
    return { ok: false, error: "Choose exactly one correct answer." };
  }

  const diagramUrl = body.diagramUrl;
  const solutionExplanation = body.solutionExplanation;
  if (diagramUrl != null && typeof diagramUrl !== "string") {
    return { ok: false, error: "The question image address is invalid." };
  }
  if (solutionExplanation != null && typeof solutionExplanation !== "string") {
    return { ok: false, error: "The solution explanation is invalid." };
  }

  return {
    ok: true,
    input: {
      stem: body.stem.trim(),
      diagramUrl: typeof diagramUrl === "string" && diagramUrl.trim() ? diagramUrl.trim() : null,
      solutionExplanation: typeof solutionExplanation === "string" && solutionExplanation.trim()
        ? solutionExplanation.trim()
        : null,
      options,
    },
  };
}
