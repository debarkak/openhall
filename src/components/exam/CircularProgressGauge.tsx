"use client";

import React, { useMemo } from "react";
import { Clock } from "lucide-react";

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

  return (
    <div className="flex items-center gap-2">
      {/* Retro 3D Sunken LCD Timer Display */}
      <div className="retro-sunken-dark px-3 py-1 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-cyan-400" />
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-wider text-slate-400 leading-none">
            time left
          </span>
          <span
            className={`font-mono text-sm sm:text-base font-black tracking-widest leading-none mt-0.5 ${
              isLowTime ? "text-red-400 animate-pulse" : "text-emerald-400"
            }`}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Classic 3D Progress Bar */}
      <div className="hidden md:flex flex-col w-20">
        <div className="text-[9px] font-bold text-slate-600 mb-0.5">
          progress: {Math.round(progressPercent)}%
        </div>
        <div className="retro-sunken h-2.5 w-full bg-slate-300 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CircularProgressGauge;
