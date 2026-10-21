"use client";

import React from "react";
import { ItemStatus } from "@/lib/types";

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  attemptStatuses: Record<number, ItemStatus>;
  onSelectQuestion: (index: number) => void;
  startIndex?: number; // For section offset (e.g., Section 1 starts at 1, Section 2 starts at 21)
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  attemptStatuses,
  onSelectQuestion,
  startIndex = 1,
}) => {
  return (
    <div className="w-full">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Question Palette
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === currentIndex;
          const status = attemptStatuses[idx] || "UNVISITED";
          const displayNum = startIndex + idx;

          let badgeStyle =
            "bg-exam-badge text-slate-700 border border-exam-border hover:bg-slate-200";

          if (status === "ATTEMPTED_SAVED") {
            badgeStyle =
              "bg-brand-green-light text-brand-green-text border border-brand-green-border font-semibold";
          } else if (status === "VISITED_UNANSWERED") {
            badgeStyle =
              "bg-exam-badge text-slate-600 border border-slate-300";
          }

          if (isActive) {
            badgeStyle =
              "bg-white text-brand-green-text border-[2.5px] border-brand-green font-bold shadow-sm ring-1 ring-brand-green/20";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`flex h-10 sm:h-11 items-center justify-center rounded-lg text-xs sm:text-sm transition-all duration-150 active:scale-95 ${badgeStyle}`}
              aria-label={`Jump to Question ${displayNum}`}
            >
              Q{displayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionPalette;
