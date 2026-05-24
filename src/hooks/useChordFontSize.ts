import { useState, useCallback } from "react";

const STORAGE_KEY = "saliw-chord-font-size";
const MIN_SIZE = 12;
const MAX_SIZE = 48;
const DEFAULT_SIZE = 16;
const STEP = 2;

function clamp(value: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, value));
}

/**
 * Return type for the useChordFontSize hook.
 */
export type UseChordFontSizeReturn = {
  /** Current chord font size in pixels. Range: 12–48. Default: 16. */
  chordFontSize: number;
  /** Increase chord font size by 2px, clamped at 48. Persists to localStorage. */
  increaseChordFont: () => void;
  /** Decrease chord font size by 2px, clamped at 12. Persists to localStorage. */
  decreaseChordFont: () => void;
  /** Reset chord font size to 16px. Persists to localStorage. */
  resetChordFont: () => void;
};

/**
 * Manages the chord-specific font size with localStorage persistence.
 *
 * - Initializes to 16px by default (SSR-safe: localStorage is read on mount only).
 * - Persists changes under the key "saliw-chord-font-size".
 * - All offsets are clamped to [12, 48] — never returns a value outside this range.
 * - Does NOT apply the CSS variable itself; the consumer is responsible for that.
 *
 * BUG-001: Uses lazy useState initializer — never useEffect + setState.
 *
 * @returns UseChordFontSizeReturn
 */
function readStoredChordFontSize(): number {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return clamp(parsed);
    }
  } catch {
    // localStorage unavailable — use default
  }
  return DEFAULT_SIZE;
}

export function useChordFontSize(): UseChordFontSizeReturn {
  const [chordFontSize, setChordFontSize] = useState<number>(
    readStoredChordFontSize
  );

  const persist = useCallback((value: number) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(value));
      }
    } catch {
      // localStorage unavailable — non-fatal
    }
  }, []);

  const increaseChordFont = useCallback(() => {
    setChordFontSize((prev) => {
      const next = clamp(prev + STEP);
      persist(next);
      return next;
    });
  }, [persist]);

  const decreaseChordFont = useCallback(() => {
    setChordFontSize((prev) => {
      const next = clamp(prev - STEP);
      persist(next);
      return next;
    });
  }, [persist]);

  const resetChordFont = useCallback(() => {
    setChordFontSize(DEFAULT_SIZE);
    persist(DEFAULT_SIZE);
  }, [persist]);

  return {
    chordFontSize,
    increaseChordFont,
    decreaseChordFont,
    resetChordFont,
  };
}
