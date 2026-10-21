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
      <div className="retro-window w-full max-w-sm overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-sky-200" />
            <span className="text-xs font-bold tracking-wide">
              unsaved answer
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] text-red-700"
            aria-label="close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Description */}
        <div className="p-4">
          <div className="retro-sunken bg-white p-3.5 text-xs text-slate-700 leading-relaxed mb-4">
            you picked an option on this question. do you want to save it before jumping to another question?
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="retro-btn min-w-[75px] py-1 text-xs font-bold"
            >
              don&apos;t save
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="retro-btn-green min-w-[75px] py-1 text-xs font-bold"
            >
              save &amp; jump
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveAttemptModal;
