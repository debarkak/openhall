"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TelemetryEvent } from "./types";

interface LockdownOptions {
  sessionId: string;
  enabled: boolean;
  maxStrikes?: number;
  onDisqualified?: () => void;
  onViolation?: (event: TelemetryEvent) => void;
}

export function useBrowserLockdown({
  sessionId,
  enabled,
  maxStrikes = 3,
  onDisqualified,
  onViolation,
}: LockdownOptions) {
  const [isFullscreenLocked, setIsFullscreenLocked] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [activeViolationModal, setActiveViolationModal] = useState<{
    eventType: string;
    strike: number;
    message: string;
  } | null>(null);
  const [blockedKeyToast, setBlockedKeyToast] = useState<string | null>(null);

  const isEnforcingRef = useRef(enabled);
  isEnforcingRef.current = enabled;
  const lastBlurTimestampRef = useRef<number>(0);

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

  const handleStrike = useCallback(
    (eventType: string, message: string) => {
      setStrikes((prev) => {
        const next = prev + 1;
        if (next >= maxStrikes) {
          setIsDisqualified(true);
          if (onDisqualified) {
            onDisqualified();
          }
          // Transmit final disqualification
          fetch(`/api/sessions/${sessionId}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disqualified: true }),
          }).catch(() => {});
        } else {
          setActiveViolationModal({
            eventType,
            strike: next,
            message,
          });
        }
        return next;
      });
    },
    [maxStrikes, onDisqualified, sessionId]
  );

  useEffect(() => {
    if (!enabled) return;

    // Check initial fullscreen on start
    if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        setIsFullscreenLocked(true);
      }
    }

    // 1. Fullscreen change listener
    const handleFullscreenChange = () => {
      if (!isEnforcingRef.current) return;
      if (!document.fullscreenElement) {
        setIsFullscreenLocked(true);
        logViolation("FULLSCREEN_EXIT", { reason: "Fullscreen exited by user" });
        handleStrike(
          "FULLSCREEN_EXIT",
          "You exited Fullscreen mode. OpenHall requires Fullscreen mode to be maintained for the entire exam duration."
        );
      } else {
        setIsFullscreenLocked(false);
      }
    };

    // 2. Tab & Window visibility listener with 1-second debounce
    const handleVisibilityChange = () => {
      if (!isEnforcingRef.current) return;
      const now = Date.now();
      if (document.hidden) {
        if (now - lastBlurTimestampRef.current > 1000) {
          lastBlurTimestampRef.current = now;
          logViolation("TAB_SWITCH", { state: "hidden" });
          handleStrike(
            "TAB_SWITCH",
            "Tab switch or background navigation detected. You must keep the examination tab active."
          );
        }
      }
    };

    const handleWindowBlur = () => {
      if (!isEnforcingRef.current) return;
      const now = Date.now();
      if (now - lastBlurTimestampRef.current > 1000) {
        lastBlurTimestampRef.current = now;
        logViolation("TAB_SWITCH", { state: "blur" });
        handleStrike(
          "WINDOW_BLUR",
          "Application switch detected. Navigating away from this window is recorded as an integrity event."
        );
      }
    };

    // 3. Keyboard Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnforcingRef.current) return;

      // Trap F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        setBlockedKeyToast("Developer Tools shortcut [F12] is strictly disabled.");
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
        setBlockedKeyToast("Inspector shortcut [Ctrl+Shift+" + e.key.toUpperCase() + "] is disabled.");
        logViolation("DEVTOOLS_KEY", { key: e.key, combo: "Ctrl+Shift+" + e.key });
        return;
      }

      // Trap Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedKeyToast("Page Source shortcut [Ctrl+U] is disabled.");
        logViolation("DEVTOOLS_KEY", { key: "Ctrl+U" });
        return;
      }

      // Trap Copy / Paste / Cut inside exam viewport
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x")) {
        e.preventDefault();
        setBlockedKeyToast("Clipboard operations are disabled during the test.");
      }
    };

    // 4. Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      if (!isEnforcingRef.current) return;
      e.preventDefault();
      setBlockedKeyToast("Right-click context menu is locked during the exam.");
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
  }, [enabled, handleStrike, logViolation]);

  // Auto-dismiss blocked key toast after 3 seconds
  useEffect(() => {
    if (blockedKeyToast) {
      const timer = setTimeout(() => setBlockedKeyToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [blockedKeyToast]);

  const reEnterFullscreen = async () => {
    try {
      if (document.documentElement && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenLocked(false);
    } catch {
      // User gesture might be needed
    }
  };

  const dismissViolationModal = () => {
    setActiveViolationModal(null);
    if (!document.fullscreenElement) {
      setIsFullscreenLocked(true);
    }
  };

  return {
    isFullscreenLocked,
    strikes,
    maxStrikes,
    isDisqualified,
    activeViolationModal,
    blockedKeyToast,
    reEnterFullscreen,
    dismissViolationModal,
    dismissToast: () => setBlockedKeyToast(null),
    logViolation,
  };
}
