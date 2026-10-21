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
    <div className="flex w-full items-center justify-between gap-3 border-t-2 border-t-slate-400 bg-[#e2e8f0] px-4 py-2.5 sm:px-6">
      {/* Left Action: Deselect */}
      <button
        type="button"
        onClick={onDeselect}
        disabled={disabled || !hasSelection}
        className="retro-btn px-4 py-2 text-xs sm:text-sm font-bold tracking-tight disabled:opacity-50"
      >
        Deselect
      </button>

      {/* Right Cluster: Skip + Save & Next */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="retro-btn px-4 py-2 text-xs sm:text-sm font-bold tracking-tight hover:bg-slate-100"
        >
          Skip &rarr;
        </button>

        <button
          type="button"
          onClick={onSaveAndNext}
          disabled={disabled}
          className="retro-btn-green px-5 py-2 text-xs sm:text-sm font-bold tracking-tight"
        >
          {isLastQuestion ? "Save & Finish Section" : "Save & Next"}
        </button>
      </div>
    </div>
  );
};

export default ActionControlBar;
