"use client";

import React from "react";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header with Title and Close X */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold uppercase tracking-wide text-slate-800">
              SAVE ATTEMPT
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Description */}
        <div className="py-4 text-sm leading-relaxed text-slate-600">
          Save this question&apos;s attempt? Use{" "}
          <strong className="text-brand-green font-semibold">[Save and Next]</strong> at
          the bottom to avoid this popup from appearing again.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-24 rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-24 rounded-lg bg-brand-green py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-green-hover active:scale-95 transition"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveAttemptModal;
