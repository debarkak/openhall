"use client";

import React from "react";
import { Shield } from "lucide-react";

interface SubmissionSpinnerProps {
  message?: string;
}

export const SubmissionSpinner: React.FC<SubmissionSpinnerProps> = ({
  message = "Submitting examination session to server. Please wait...",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="retro-window w-full max-w-sm overflow-hidden">
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-200" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Audit &amp; Finalizing
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="retro-sunken bg-white p-4 text-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Submitting Answers
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{message}</p>

            {/* Classic 3D Progress Bar */}
            <div className="retro-sunken mt-4 h-4 w-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700 animate-pulse w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionSpinner;
