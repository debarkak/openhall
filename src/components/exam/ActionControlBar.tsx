"use client";

import React from "react";

interface ActionControlBarProps {
  hasSelection: boolean;
  onDeselect: () => void;
  onSkip: () => void;
  onSaveAndNext: () => void;
  isLastQuestion?: boolean;
  disabled?: boolean;
}

export const ActionControlBar: React.FC<ActionControlBarProps> = ({
  hasSelection,
  onDeselect,
  onSkip,
  onSaveAndNext,
  isLastQuestion = false,
  disabled = false,
}) => {
  return (
    <div className="flex w-full items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
      {/* Left Action: Deselect */}
      <button
        type="button"
        onClick={onDeselect}
        disabled={disabled || !hasSelection}
        className={`rounded-md border px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
          hasSelection
            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-sm"
            : "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
        }`}
      >
        Deselect
      </button>

      {/* Right Cluster: Skip + Save & Next */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-sm transition-all"
        >
          Skip
        </button>

        <button
          type="button"
          onClick={onSaveAndNext}
          disabled={disabled}
          className="flex items-center justify-center rounded-md bg-brand-green px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition-all"
        >
          {isLastQuestion ? "Save & Finish Section" : "Save & Next"}
        </button>
      </div>
    </div>
  );
};

export default ActionControlBar;
