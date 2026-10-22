"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleHelp, Printer, X } from "lucide-react";
import { KaTeXRenderer } from "@/components/katex/KaTeXRenderer";
import { PortalHeader } from "@/components/shell/PortalHeader";
import type { EvaluationResult, QuestionReview } from "@/lib/types";

interface ScorecardTableProps {
  result: EvaluationResult;
}

function scoreLabel(score: number, maximum: number) {
  if (maximum <= 0) return "no marks available";
  const ratio = score / maximum;
  if (ratio >= 0.9) return "excellent work";
  if (ratio >= 0.7) return "strong result";
  if (ratio >= 0.4) return "room to improve";
  return "review the solutions";
}

function ReviewCard({ review, forceOpen = false }: { review: QuestionReview; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const expanded = open || forceOpen;
  const status = !review.isAttempted ? "not answered" : review.isCorrect ? "correct" : "incorrect";

  return (
    <article className="score-review">
      <button
        className="score-review__toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`score-review__status score-review__status--${status.replace(" ", "-")}`}>
          {review.isCorrect ? <Check size={14} /> : review.isAttempted ? <X size={14} /> : <CircleHelp size={14} />}
          <span>{status}</span>
        </span>
        <span className="score-review__heading">
          <strong>question {review.questionNumber}</strong>
          <small>{review.sectionTitle.toLowerCase()}</small>
        </span>
        <span className="score-review__chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="score-review__body">
          <div className="score-review__stem"><KaTeXRenderer content={review.stem} /></div>
          <div className="score-review__answers">
            <div>
              <span className="score-review__label">your answer</span>
              <div className={review.isCorrect ? "score-answer score-answer--good" : "score-answer score-answer--plain"}>
                {review.selectedOptionText ? <KaTeXRenderer content={review.selectedOptionText} /> : <span>no answer submitted</span>}
              </div>
            </div>
            <div>
              <span className="score-review__label">correct answer</span>
              <div className="score-answer score-answer--good"><KaTeXRenderer content={review.correctOptionText} /></div>
            </div>
          </div>
          {review.solutionExplanation && (
            <div className="score-review__solution">
              <span className="score-review__label">solution</span>
              <KaTeXRenderer content={review.solutionExplanation} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ScorecardTable({ result }: ScorecardTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const reviews = result.questionReviews ?? [];
  const accuracy = result.questionsAttempted > 0
    ? Math.round((result.correctResponses / result.questionsAttempted) * 100)
    : 0;
  const scorePercent = result.maxMarks > 0
    ? Math.max(0, Math.min(100, Math.round((result.finalScore / result.maxMarks) * 100)))
    : 0;
  const visibleReviews = showAll ? reviews : reviews.slice(0, 8);

  useEffect(() => {
    const finishPrint = () => setPrintMode(false);
    window.addEventListener("afterprint", finishPrint);
    return () => window.removeEventListener("afterprint", finishPrint);
  }, []);

  const printReport = () => {
    setShowAll(true);
    setPrintMode(true);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <div className="score-page">
      <PortalHeader section="scorecard" showAuth={false}>
        <Link href="/lobby" className="retro-btn px-3 py-2 text-xs font-bold">
          <ArrowLeft size={14} className="mr-1.5" /> return to lobby
        </Link>
      </PortalHeader>

      <main className="portal-main score-main">
        <section className="score-heading">
          <div>
            <span className="portal-eyebrow">examination report</span>
            <h1 className="portal-title">{result.examTitle}</h1>
            <p className="portal-description">
              results for {result.candidateName.toLowerCase()} · {result.totalQuestions} questions
            </p>
          </div>
          <button type="button" className="retro-btn score-print" onClick={printReport}>
            <Printer size={15} /> print or save as pdf
          </button>
        </section>

        <section className="score-overview" aria-label="exam result summary">
          <div className="score-total">
            <span className="score-total__eyebrow">final score</span>
            <div className="score-total__value">
              {result.finalScore}<span> / {result.maxMarks}</span>
            </div>
            <p>{scoreLabel(result.finalScore, result.maxMarks)}</p>
            <div className="score-meter" role="img" aria-label={`${scorePercent}% of available marks`}>
              <span style={{ width: `${scorePercent}%` }} />
            </div>
            <small>{scorePercent}% of available marks</small>
          </div>

          <div className="score-stats">
            <div className="score-stat score-stat--correct">
              <span className="score-stat__icon"><Check size={15} /></span>
              <span><strong>{result.correctResponses}</strong><small>correct</small></span>
            </div>
            <div className="score-stat score-stat--incorrect">
              <span className="score-stat__icon"><X size={15} /></span>
              <span><strong>{result.incorrectResponses}</strong><small>incorrect</small></span>
            </div>
            <div className="score-stat score-stat--unanswered">
              <span className="score-stat__icon"><CircleHelp size={15} /></span>
              <span><strong>{result.unattemptedQuestions}</strong><small>unanswered</small></span>
            </div>
            <div className="score-stat score-stat--attempted">
              <span className="score-stat__icon">%</span>
              <span><strong>{accuracy}%</strong><small>accuracy · attempted</small></span>
            </div>
          </div>
        </section>

        <section className="score-review-section">
          <div className="portal-section-heading">
            <div>
              <h2>question review</h2>
              <p>check your responses and read the solutions.</p>
            </div>
            <span className="portal-chip">{reviews.length} questions</span>
          </div>

          {reviews.length === 0 ? (
            <div className="portal-empty">
              <div className="portal-empty__icon"><CircleHelp size={20} /></div>
              <h2>question details are unavailable</h2>
              <p>the score is saved, but this report does not include individual question reviews.</p>
            </div>
          ) : (
            <div className="score-review-list">
              {visibleReviews.map((review) => <ReviewCard key={review.id} review={review} forceOpen={printMode} />)}
              {reviews.length > 8 && (
                <button
                  type="button"
                  className="retro-btn score-show-more"
                  aria-expanded={showAll}
                  onClick={() => setShowAll((value) => !value)}
                >
                  {showAll ? "show fewer questions" : `show all ${reviews.length} questions`}
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
