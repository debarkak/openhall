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
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
        Question Palette
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === currentIndex;
          const status = attemptStatuses[idx] || "UNVISITED";
          const displayNum = startIndex + idx;

          // Classic 3D Beveled Styles
          let btnStyle =
            "bg-[#e2e8f0] text-slate-800 border-2 border-t-white border-l-white border-r-[#475569] border-b-[#475569] shadow-[1px_1px_0px_#1e293b] font-bold hover:bg-slate-100";

          if (status === "ATTEMPTED_SAVED") {
            btnStyle =
              "bg-[#15803d] text-white border-2 border-t-[#86efac] border-l-[#86efac] border-r-[#14532d] border-b-[#14532d] shadow-[1px_1px_0px_#052e16] font-bold hover:bg-[#166534]";
          } else if (status === "VISITED_UNANSWERED") {
            btnStyle =
              "bg-[#ea580c] text-white border-2 border-t-[#fdba74] border-l-[#fdba74] border-r-[#9a3412] border-b-[#9a3412] shadow-[1px_1px_0px_#431407] font-bold hover:bg-[#c2410c]";
          }

          if (isActive) {
            btnStyle =
              "bg-amber-100 text-slate-900 border-2 border-t-[#1e293b] border-l-[#1e293b] border-r-white border-b-white font-black shadow-inner ring-2 ring-blue-600";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`flex h-9 sm:h-10 items-center justify-center rounded-none text-xs sm:text-sm select-none active:translate-x-[1px] active:translate-y-[1px] transition-none ${btnStyle}`}
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
