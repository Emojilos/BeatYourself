"use client";

import * as React from "react";
import confetti from "canvas-confetti";

interface ChallengeCompletionConfettiProps {
  challengeId: string;
}

const DURATION_MS = 2500;
const STORAGE_KEY_PREFIX = "beatyourself:confetti:";

export function ChallengeCompletionConfetti({ challengeId }: ChallengeCompletionConfettiProps) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${challengeId}`;
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(storageKey) === "1";
    } catch {
      // sessionStorage may be unavailable (private mode, SSR-like envs) — treat as not shown
    }
    if (alreadyShown) return;

    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore: best-effort; we still fire confetti once this mount
    }

    const end = Date.now() + DURATION_MS;
    const colors = ["#C96442", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) return;
      confetti({
        particleCount: 3,
        startVelocity: 30,
        spread: 60,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.3 },
        colors,
        disableForReducedMotion: true,
      });
      window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  return null;
}
