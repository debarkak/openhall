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
      <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-800">
        Question Palette
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === currentIndex;
          const status = attemptStatuses[idx] || "UNVISITED";
          const displayNum = startIndex + idx;

          // 2005 Glossy Gel Button Styles
          let btnClass = "retro-btn";

          if (status === "ATTEMPTED_SAVED") {
            btnClass = "retro-btn-green";
          } else if (status === "VISITED_UNANSWERED") {
            btnClass = "retro-btn-orange";
          }

          if (isActive) {
            btnClass += " ring-2 ring-blue-600 scale-[1.03] z-10 font-black";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`flex h-9 sm:h-10 items-center justify-center text-xs sm:text-sm ${btnClass}`}
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
