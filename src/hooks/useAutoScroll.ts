"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "saliw_autoscroll_speed";
const MIN_SPEED = 1;
const MAX_SPEED = 5;
const DEFAULT_SPEED = 1;

/**
 * Maps a speed unit (1–5) to pixels per second.
 * Unit 1 → 5 px/s, Unit 2 → 10, Unit 3 → 15, Unit 4 → 20, Unit 5 → 25 px/s.
 */
function speedToPxPerSecond(speed: number): number {
  return speed * 5;
}

function clamp(value: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

/**
 * Read speed from localStorage inside a lazy useState initializer.
 * BUG-001 compliance: must NOT be called from a useEffect setter.
 * BUG-007 compliance: declared before any useEffect that references it.
 */
function readStoredSpeed(): number {
  if (typeof window === "undefined") return DEFAULT_SPEED;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return clamp(parsed);
    }
  } catch {
    // localStorage unavailable — use default (AC 30)
  }
  return DEFAULT_SPEED;
}

// ── Return type ────────────────────────────────────────────────────────────────

export type UseAutoScrollReturn = {
  /** True when the main auto-scroll feature is active (panel visible, scrolling or paused). */
  isActive: boolean;
  /** True when actively scrolling (not paused). Only meaningful when isActive is true. */
  isScrolling: boolean;
  /** True when manually paused by user. Only meaningful when isActive is true. */
  isPaused: boolean;
  /** True when page content fits within viewport (toggle should be disabled). */
  cannotScroll: boolean;
  /** Speed unit 1–5. Default 1. Persisted to localStorage. */
  speed: number;
  /** Activate or deactivate auto-scroll (main toolbar toggle). */
  toggle: () => void;
  /** Pause scrolling (keeps panel visible, preserves position). */
  pause: () => void;
  /** Resume scrolling from current position. */
  resume: () => void;
  /** Set scroll speed (1–5). Persists to localStorage. */
  setSpeed: (value: number) => void;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useAutoScroll — Manages teleprompter-style full-page auto-scroll.
 *
 * SSR-safe: no window/document references at module scope or hook body top-level.
 * All browser API calls live inside useEffect.
 *
 * Compiler safety:
 * - BUG-001: localStorage read uses lazy useState initializer (readStoredSpeed).
 * - BUG-002: useCallback deps reference whole objects, not property paths.
 * - BUG-007: All helpers declared BEFORE the useEffect that calls them.
 * - BUG-004: No Tailwind named utilities here (CSS only in component).
 * - AC-30: All localStorage calls are wrapped in try/catch.
 */
export function useAutoScroll(): UseAutoScrollReturn {
  // Speed persisted to localStorage via lazy initializer (BUG-001)
  const [speed, setSpeedState] = useState<number>(readStoredSpeed);

  // Main feature active/inactive (main toggle)
  const [isActive, setIsActive] = useState(false);

  // Scrolling vs. paused within an active session
  const [isScrolling, setIsScrolling] = useState(false);

  // Whether the page content is short enough to not need scrolling
  const [cannotScroll, setCannotScroll] = useState(false);

  // Ref to the current rAF id so we can cancel it
  const rafIdRef = useRef<number | null>(null);

  // Speed ref so the rAF callback reads the latest speed without stale closure
  const speedRef = useRef<number>(speed);

  // Track the last rAF timestamp for delta-based scrolling
  const lastTimestampRef = useRef<number | null>(null);

  // Sub-pixel scroll accumulator. At low speeds (e.g. speed 1 = 5 px/s) a single
  // frame produces <1 px of movement, which the browser rounds to 0 → nothing
  // visibly scrolls. We accumulate fractional pixels here and flush whole pixels
  // to window.scrollBy so slow speeds remain visibly smooth.
  const scrollAccumulatorRef = useRef<number>(0);

  // Whether we are currently auto-scrolling (ref for use inside event listeners)
  const isScrollingRef = useRef(false);

  // Whether the feature is active (ref for use inside event listeners)
  const isActiveRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isScrollingRef.current = isScrolling;
  }, [isScrolling]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // ── Persist speed to localStorage (BUG-007: declared before useEffect) ────

  const persistSpeed = useCallback((value: number) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(value));
      }
    } catch {
      // localStorage unavailable — non-fatal (AC 30)
    }
  }, []);

  // ── Cancel the active rAF loop (BUG-007: declared before useEffect) ────────

  const cancelRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastTimestampRef.current = null;
    scrollAccumulatorRef.current = 0;
  }, []);

  // ── rAF scroll loop ────────────────────────────────────────────────────────

  const startRaf = useCallback(() => {
    cancelRaf();

    function step(timestamp: number) {
      // Self-defending exit: if pause/toggle ran between rAF schedule and fire,
      // honor that and stop the loop. Belt-and-braces alongside cancelRaf.
      if (!isScrollingRef.current) {
        rafIdRef.current = null;
        return;
      }

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      const pxPerSecond = speedToPxPerSecond(speedRef.current);
      const scrollAmount = (pxPerSecond * delta) / 1000;

      const scrollTop = window.scrollY;
      const clientHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;

      // AC 15: auto-stop at bottom of page
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        cancelRaf();
        setIsScrolling(false);
        setIsActive(false);
        isScrollingRef.current = false;
        isActiveRef.current = false;
        return;
      }

      scrollAccumulatorRef.current += scrollAmount;
      const wholePixels = Math.floor(scrollAccumulatorRef.current);
      if (wholePixels > 0) {
        scrollAccumulatorRef.current -= wholePixels;
        window.scrollBy(0, wholePixels);
      }

      rafIdRef.current = requestAnimationFrame(step);
    }

    rafIdRef.current = requestAnimationFrame(step);
  }, [cancelRaf]);

  // ── setSpeed (public API) ──────────────────────────────────────────────────

  const setSpeed = useCallback(
    (value: number) => {
      const clamped = clamp(value);
      speedRef.current = clamped;
      setSpeedState(clamped);
      persistSpeed(clamped);
    },
    [persistSpeed]
  );

  // ── toggle (main toolbar toggle, AC 2 & 3) ─────────────────────────────────

  const toggle = useCallback(() => {
    if (isActiveRef.current) {
      // Deactivate — stop scrolling, hide panel, preserve position (AC 3)
      cancelRaf();
      setIsActive(false);
      setIsScrolling(false);
      isActiveRef.current = false;
      isScrollingRef.current = false;
    } else {
      // Activate — show panel and begin scrolling immediately (AC 2)
      setIsActive(true);
      setIsScrolling(true);
      isActiveRef.current = true;
      isScrollingRef.current = true;
      startRaf();
    }
  }, [cancelRaf, startRaf]);

  // ── pause (AC 8) ───────────────────────────────────────────────────────────

  const pause = useCallback(() => {
    cancelRaf();
    setIsScrolling(false);
    isScrollingRef.current = false;
  }, [cancelRaf]);

  // ── resume (AC 8, 17) ──────────────────────────────────────────────────────

  const resume = useCallback(() => {
    setIsScrolling(true);
    isScrollingRef.current = true;
    startRaf();
  }, [startRaf]);

  // ── cannotScroll detector — runs on mount and on window resize ─────────────

  useEffect(() => {
    function checkScrollable() {
      if (typeof window === "undefined") return;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      setCannotScroll(scrollHeight <= clientHeight);
    }

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, []);

  // ── Spacebar key handler (AC 18) ──────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (!isActiveRef.current) return;

      // Don't intercept spacebar when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();

      if (isScrollingRef.current) {
        // Currently scrolling → pause
        cancelRaf();
        setIsScrolling(false);
        isScrollingRef.current = false;
      } else {
        // Currently paused → resume
        setIsScrolling(true);
        isScrollingRef.current = true;
        startRaf();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelRaf, startRaf]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelRaf();
    };
  }, [cancelRaf]);

  // Derive isPaused: active but not scrolling
  const isPaused = isActive && !isScrolling;

  return {
    isActive,
    isScrolling,
    isPaused,
    cannotScroll,
    speed,
    toggle,
    pause,
    resume,
    setSpeed,
  };
}
