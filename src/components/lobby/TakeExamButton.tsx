"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

interface TakeExamButtonProps {
  examId: string;
  className?: string;
  children?: React.ReactNode;
}

export function TakeExamButton({
  examId,
  className = "retro-btn-green px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer",
  children,
}: TakeExamButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/exams/${examId}/enroll`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/exam/${data.sessionId}/instructions`);
      } else {
        alert("failed to start exam session. please try again.");
        setIsLoading(false);
      }
    } catch {
      alert("network error starting exam.");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>starting...</span>
        </>
      ) : (
        children || (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>take test</span>
          </>
        )
      )}
    </button>
  );
}
