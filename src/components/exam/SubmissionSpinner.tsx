"use client";

import React from "react";

interface SubmissionSpinnerProps {
  message?: string;
}

export const SubmissionSpinner: React.FC<SubmissionSpinnerProps> = ({
  message = "Submitting your examination... Please do not close this window.",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="h-16 w-16 rounded-full border-4 border-orange-100 animate-ping opacity-50" />
        {/* Core spinning orange loader */}
        <div className="absolute h-16 w-16 rounded-full border-4 border-transparent border-t-brand-orange border-r-brand-orange animate-spin" />
      </div>

      <div className="mt-6 text-center">
        <h3 className="text-lg font-bold text-slate-800">Saving Responses</h3>
        <p className="mt-1 text-sm font-medium text-slate-500 max-w-xs">{message}</p>
      </div>
    </div>
  );
};

export default SubmissionSpinner;
