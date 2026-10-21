"use client";

import React, { useMemo } from "react";

interface CircularProgressGaugeProps {
  remainingSeconds: number;
  totalDurationSeconds: number;
}

export const CircularProgressGauge: React.FC<CircularProgressGaugeProps> = ({
  remainingSeconds,
  totalDurationSeconds,
}) => {
  const { formattedTime, progressPercent, isLowTime } = useMemo(() => {
    const sec = Math.max(0, remainingSeconds);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

    const elapsed = Math.max(0, totalDurationSeconds - sec);
    const percent = Math.min(
      100,
      Math.max(0, (elapsed / (totalDurationSeconds || 5400)) * 100)
    );

    return {
      formattedTime: formatted,
      progressPercent: percent,
      isLowTime: sec > 0 && sec <= 120, // last 2 minutes warning
    };
  }, [remainingSeconds, totalDurationSeconds]);

  // SVG radius r = 15.9155 gives a circumference of exactly 100 units
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <div className="relative flex h-9 w-9 items-center justify-center">
        <svg className="h-9 w-9 -rotate-90 transform" viewBox="0 0 36 36">
          {/* Base track */}
          <path
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Progress arc filling clockwise */}
          <path
            className={`transition-all duration-1000 ease-linear ${
              isLowTime ? "text-brand-orange animate-pulse" : "text-brand-cyan"
            }`}
            stroke="currentColor"
            strokeDasharray="100, 100"
            strokeDashoffset={100 - progressPercent}
            strokeLinecap="round"
            strokeWidth="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
      </div>

      <div className="flex flex-col text-left">
        <span className="font-sans text-[10px] font-medium leading-none text-slate-500">
          Time left
        </span>
        <span
          className={`font-mono text-sm font-bold tabular-nums leading-tight ${
            isLowTime ? "text-brand-orange" : "text-slate-800"
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default CircularProgressGauge;
