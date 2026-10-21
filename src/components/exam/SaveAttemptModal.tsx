"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

interface SaveAttemptModalProps {
  isOpen: boolean;
  onCancel: () => void; // Discard choice & jump
  onConfirm: () => void; // Save choice & jump
  onClose: () => void; // Stay on current question
}

export const SaveAttemptModal: React.FC<SaveAttemptModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      {/* Classic 3D Modal Window */}
      <div className="retro-window w-full max-w-md overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-sky-200" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Save Attempt Confirmation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Description */}
        <div className="p-4 sm:p-5">
          <div className="retro-sunken bg-white p-4 text-xs sm:text-sm text-slate-800 leading-relaxed mb-4">
            Do you want to save this question&apos;s selected option? Use{" "}
            <strong className="text-emerald-800">[Save & Next]</strong> at
            the bottom bar to record answers without triggering this guardrail prompt.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="retro-btn min-w-[80px] py-1.5 text-xs font-bold"
            >
              Discard (No)
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="retro-btn-green min-w-[80px] py-1.5 text-xs font-bold"
            >
              Save (Yes)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveAttemptModal;
