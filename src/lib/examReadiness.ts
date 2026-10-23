export interface ExamReadinessQuestion {
  stem: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface ExamReadinessSection {
  title: string;
  questions: ExamReadinessQuestion[];
}

export function getExamReadinessIssues(sections: ExamReadinessSection[]): string[] {
  const questions = sections.flatMap((section) =>
    section.questions.map((question) => ({ sectionTitle: section.title, question }))
  );

  if (questions.length === 0) {
    return ["add at least one question before publishing"];
  }

  const issues: string[] = [];
  questions.forEach(({ sectionTitle, question }, index) => {
    const label = `question ${index + 1}${sectionTitle ? ` in ${sectionTitle}` : ""}`;
    const filledOptions = question.options.filter((option) => option.text.trim());

    if (!question.stem.trim()) issues.push(`${label} needs a prompt`);
    if (filledOptions.length < 2) issues.push(`${label} needs at least two answer choices`);
    if (filledOptions.filter((option) => option.isCorrect).length !== 1) {
      issues.push(`${label} needs exactly one correct answer`);
    }
  });

  return issues;
}
