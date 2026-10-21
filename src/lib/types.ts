export type ItemStatus =
  | "UNVISITED"
  | "VISITED_UNANSWERED"
  | "ATTEMPTED_SAVED";

export interface CandidateOption {
  id: string;
  orderIndex: number;
  text: string;
  imageUrl?: string | null;
}

export interface CandidateQuestion {
  id: string;
  orderIndex: number;
  stem: string;
  diagramUrl?: string | null;
  positiveMarks?: number | null;
  negativePenalty?: number | null;
  options: CandidateOption[];
}

export interface CandidateSection {
  id: string;
  title: string;
  orderIndex: number;
  questions: CandidateQuestion[];
}

export interface CandidateExamManifest {
  sessionId: string;
  examId: string;
  title: string;
  instructions?: string | null;
  durationSeconds: number;
  startedAt: string;
  deadline: string; // Absolute ISO timestamp from server
  sections: CandidateSection[];
  initialAttempts: Record<string, { optionId: string | null; status: ItemStatus }>;
}

export interface AttemptSubmissionPayload {
  sessionId: string;
  questionId: string;
  optionId: string | null;
  status: ItemStatus;
  timestamp: string;
}

export interface TelemetryEvent {
  eventType: "FULLSCREEN_EXIT" | "TAB_SWITCH" | "DEVTOOLS_KEY" | "MULTIPLE_DISPLAYS";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  totalQuestions: number;
  maxMarks: number;
  questionsAttempted: number;
  correctResponses: number;
  incorrectResponses: number;
  unattemptedQuestions: number;
  finalScore: number;
  candidateName: string;
  examTitle: string;
}
