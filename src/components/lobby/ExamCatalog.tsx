"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Play,
  Search,
} from "lucide-react";
import { TakeExamButton } from "@/components/lobby/TakeExamButton";

interface CandidateSession {
  id: string;
  status: string;
}

export interface LobbyExam {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  isLive: boolean;
  sections: { id: string; title: string; questionCount: number }[];
  session: CandidateSession | null;
}

type Filter = "all" | "available" | "in-progress" | "finished";

function isFinished(status?: string) {
  return status === "SUBMITTED" || status === "EVALUATED" || status === "DISQUALIFIED";
}

function matchesFilter(exam: LobbyExam, filter: Filter) {
  const status = exam.session?.status;
  if (filter === "available") return exam.isLive && (!status || status === "NOT_STARTED");
  if (filter === "in-progress") return status === "IN_PROGRESS";
  if (filter === "finished") return isFinished(status);
  return true;
}

export function ExamCatalog({ exams }: { exams: LobbyExam[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    all: exams.length,
    available: exams.filter((exam) => matchesFilter(exam, "available")).length,
    "in-progress": exams.filter((exam) => matchesFilter(exam, "in-progress")).length,
    finished: exams.filter((exam) => matchesFilter(exam, "finished")).length,
  }), [exams]);

  const visibleExams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return exams.filter((exam) => {
      if (!matchesFilter(exam, filter)) return false;
      if (!normalizedQuery) return true;
      return [exam.title, exam.description || "", ...exam.sections.map((section) => section.title)]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [exams, filter, query]);

  return (
    <div className="lobby-catalog">
      <div className="lobby-catalog__toolbar">
        <div className="portal-tabs" aria-label="filter exams">
          {([
            ["all", "all"],
            ["available", "available"],
            ["in-progress", "in progress"],
            ["finished", "finished"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="portal-tab"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label} <span className="lobby-filter-count">{counts[value]}</span>
            </button>
          ))}
        </div>
        <label className="lobby-search-wrap">
          <Search aria-hidden="true" />
          <span className="sr-only">search exams</span>
          <input
            className="portal-search"
            type="search"
            placeholder="search exams or subjects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {visibleExams.length === 0 ? (
        <div className="portal-empty">
          <div className="portal-empty__icon"><Search aria-hidden="true" /></div>
          <h2>{exams.length === 0 ? "no exams in the lobby" : "no matching exams"}</h2>
          <p>{exams.length === 0
            ? "your teacher has not published an exam yet. check back when a test is available."
            : "try another search or choose a different status filter."}</p>
          {exams.length > 0 && (query || filter !== "all") && (
            <button type="button" className="retro-btn mt-4 px-3 py-2 text-xs" onClick={() => { setQuery(""); setFilter("all"); }}>
              clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="lobby-exam-grid">
          {visibleExams.map((exam) => {
            const session = exam.session;
            const done = isFinished(session?.status);
            const inProgress = session?.status === "IN_PROGRESS";
            const notStarted = session?.status === "NOT_STARTED";
            const questionCount = exam.sections.reduce((total, section) => total + section.questionCount, 0);
            const sections = exam.sections.map((section) => section.title).join(" · ");

            return (
              <article className="lobby-exam-card portal-card" key={exam.id}>
                <div className="lobby-exam-card__body">
                  <div className="lobby-exam-card__topline">
                    <span className={`portal-chip ${inProgress ? "portal-chip--warning" : exam.isLive ? "portal-chip--live" : ""}`}>
                      <span className={`lobby-status-dot ${!exam.isLive ? "is-muted" : inProgress ? "is-working" : ""}`} aria-hidden="true" />
                      {inProgress ? "in progress" : done ? "finished" : exam.isLive ? "available" : "upcoming"}
                    </span>
                    <span className="lobby-exam-duration"><Clock3 aria-hidden="true" /> {Math.floor(exam.durationSeconds / 60)} min</span>
                  </div>

                  <h3>{exam.title}</h3>
                  {exam.description && <p className="lobby-exam-description">{exam.description}</p>}

                  <div className="lobby-exam-facts">
                    <span><FileText aria-hidden="true" /> {questionCount} {questionCount === 1 ? "question" : "questions"}</span>
                    <span><BookOpen aria-hidden="true" /> {exam.sections.length} {exam.sections.length === 1 ? "subject" : "subjects"}</span>
                  </div>

                  {sections && <p className="lobby-exam-sections">{sections}</p>}
                </div>

                <div className="lobby-exam-card__footer">
                  {done && session ? (
                    <Link href={`/exam/${session.id}/results`} className="retro-btn-orange gap-1.5 px-3 py-2 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> view scorecard <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : inProgress && session ? (
                    <Link href={`/exam/${session.id}/player`} className="retro-btn-green gap-1.5 px-3 py-2 text-[11px]">
                      <Play className="h-3.5 w-3.5" /> resume exam <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : notStarted && session ? (
                    <Link href={`/exam/${session.id}/instructions`} className="retro-btn-green gap-1.5 px-3 py-2 text-[11px]">
                      <Play className="h-3.5 w-3.5" /> review instructions <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : exam.isLive ? (
                    <TakeExamButton examId={exam.id} className="retro-btn-green gap-1.5 px-3 py-2 text-[11px]">
                      <Play className="h-3.5 w-3.5" /> start exam <ArrowRight className="h-3.5 w-3.5" />
                    </TakeExamButton>
                  ) : (
                    <span className="lobby-unavailable">your teacher has not opened this exam yet</span>
                  )}
                  {session && <span className="lobby-session-status">{session.status.toLowerCase().replaceAll("_", " ")}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
