export type StudyPlanStep = {
  title: string;
  minutes: number;
  detail: string;
};

export type StudyPlanProblem = {
  question: string;
  answer: string;
  explanation: string;
};

export type StudyPlanQuizItem = {
  question: string;
  answer: string;
};

export type StudyPlanFlashcard = {
  front: string;
  back: string;
};

export type StudyPlan = {
  title: string;
  overview: string;
  steps: StudyPlanStep[];
  practiceProblems: StudyPlanProblem[];
  quiz: StudyPlanQuizItem[];
  flashcards: StudyPlanFlashcard[];
  coachTip: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isText(value: unknown, maxLength = 1200): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

export function parseStudyPlan(value: unknown): StudyPlan | null {
  if (!isRecord(value) || !isText(value.title, 120) || !value.title.trim() ||
      !isText(value.overview) || !value.overview.trim() || !isText(value.coachTip) || !value.coachTip.trim() ||
      !Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 5 ||
      !Array.isArray(value.practiceProblems) || value.practiceProblems.length > 8 ||
      !Array.isArray(value.quiz) || value.quiz.length > 8 ||
      !Array.isArray(value.flashcards) || value.flashcards.length > 12) return null;

  const steps: StudyPlanStep[] = [];
  for (const step of value.steps) {
    if (!isRecord(step) || !isText(step.title, 100) || !step.title.trim() ||
        typeof step.minutes !== "number" || !Number.isInteger(step.minutes) || step.minutes < 1 || step.minutes > 120 ||
        !isText(step.detail) || !step.detail.trim()) return null;
    steps.push({ title: step.title.trim(), minutes: step.minutes, detail: step.detail.trim() });
  }

  const practiceProblems: StudyPlanProblem[] = [];
  for (const problem of value.practiceProblems) {
    if (!isRecord(problem) || !isText(problem.question) || !problem.question.trim() ||
        !isText(problem.answer) || !isText(problem.explanation)) return null;
    practiceProblems.push({ question: problem.question.trim(), answer: problem.answer.trim(), explanation: problem.explanation.trim() });
  }

  const quiz: StudyPlanQuizItem[] = [];
  for (const item of value.quiz) {
    if (!isRecord(item) || !isText(item.question) || !item.question.trim() || !isText(item.answer) || !item.answer.trim()) return null;
    quiz.push({ question: item.question.trim(), answer: item.answer.trim() });
  }

  const flashcards: StudyPlanFlashcard[] = [];
  for (const card of value.flashcards) {
    if (!isRecord(card) || !isText(card.front, 500) || !card.front.trim() || !isText(card.back, 800) || !card.back.trim()) return null;
    flashcards.push({ front: card.front.trim(), back: card.back.trim() });
  }

  return {
    title: value.title.trim(),
    overview: value.overview.trim(),
    steps,
    practiceProblems,
    quiz,
    flashcards,
    coachTip: value.coachTip.trim(),
  };
}
