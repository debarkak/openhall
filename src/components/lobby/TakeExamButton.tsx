"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Play } from "lucide-react";

interface TakeExamButtonProps {
  examId: string;
  className?: string;
  children?: ReactNode;
}

export function TakeExamButton({
  examId,
  className = "retro-btn-green px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer",
  children,
}: TakeExamButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/exams/${examId}/enroll`, {
        method: "POST",
      });

      if (res.status === 401) {
        window.location.assign("/login?redirect=%2Flobby");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "could not start this exam. try again.");
      if (!data?.sessionId) throw new Error("the exam session could not be opened. try again.");
      router.push(`/exam/${data.sessionId}/instructions`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "network error. check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <span className="take-exam-action">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-busy={isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>starting…</span>
          </>
        ) : (
          children || (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>start exam</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )
        )}
      </button>
      {error && <span className="take-exam-error" role="alert">{error}</span>}
    </span>
  );
}
