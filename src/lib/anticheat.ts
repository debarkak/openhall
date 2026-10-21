"use client";

import { useEffect, useCallback, useRef } from "react";
import { TelemetryEvent } from "./types";

interface LockdownOptions {
  sessionId: string;
  enabled: boolean;
  onViolation?: (event: TelemetryEvent) => void;
}

export function useBrowserLockdown({
  sessionId,
  enabled,
  onViolation,
}: LockdownOptions) {
  const isEnforcingRef = useRef(enabled);
  isEnforcingRef.current = enabled;

  const logViolation = useCallback(
    async (eventType: TelemetryEvent["eventType"], metadata?: Record<string, unknown>) => {
      const event: TelemetryEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        metadata,
      };

      if (onViolation) {
        onViolation(event);
      }

      try {
        await fetch(`/api/sessions/${sessionId}/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      } catch {
        // Silently caught if network is temporarily interrupted
      }
    },
    [sessionId, onViolation]
  );

  useEffect(() => {
    if (!enabled) return;

    // 1. Fullscreen change listener
    const handleFullscreenChange = () => {
      if (!isEnforcingRef.current) return;
      if (!document.fullscreenElement) {
        logViolation("FULLSCREEN_EXIT", {
          reason: "User exited fullscreen mode",
        });
      }
    };

    // 2. Tab & Window visibility listener
    const handleVisibilityChange = () => {
      if (!isEnforcingRef.current) return;
      if (document.hidden) {
        logViolation("TAB_SWITCH", {
          state: "hidden",
        });
      }
    };

    const handleWindowBlur = () => {
      if (!isEnforcingRef.current) return;
      logViolation("TAB_SWITCH", {
        state: "blur",
      });
    };

    // 3. High-integrity Keyboard Trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnforcingRef.current) return;

      // Trap F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        logViolation("DEVTOOLS_KEY", { key: "F12" });
        return;
      }

      // Trap Ctrl+Shift+I / J / C (DevTools inspectors)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")
      ) {
        e.preventDefault();
        e.stopPropagation();
        logViolation("DEVTOOLS_KEY", { key: e.key, combo: "Ctrl+Shift+" + e.key });
        return;
      }

      // Trap Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        logViolation("DEVTOOLS_KEY", { key: "Ctrl+U" });
        return;
      }

      // Trap Copy / Paste / Cut inside question stem
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x")) {
        e.preventDefault();
      }
    };

    // 4. Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      if (!isEnforcingRef.current) return;
      e.preventDefault();
    };

    // 5. Multiple monitor heuristic
    if (typeof window !== "undefined" && "screen" in window) {
      const screenAny = window.screen as unknown as { isExtended?: boolean };
      if (screenAny.isExtended) {
        logViolation("MULTIPLE_DISPLAYS", { detected: true });
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, logViolation]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser permissions or user gesture required
    }
  };

  return { requestFullscreen, logViolation };
}
