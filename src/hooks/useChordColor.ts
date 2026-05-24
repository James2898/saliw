import { useState, useCallback } from "react";

// ── Chord background presets ───────────────────────────────────────────────────

export type ChordBgPreset =
  | "#F5F0E8"
  | "#C9A96E"
  | "#8B6347"
  | "#3D1F0D"
  | "#E8DDD0"
  | "transparent";

export const CHORD_BG_PRESETS: Array<{
  value: ChordBgPreset;
  label: string;
}> = [
  { value: "#F5F0E8", label: "Cream" },
  { value: "#C9A96E", label: "Tan" },
  { value: "#8B6347", label: "Brown" },
  { value: "#3D1F0D", label: "Espresso" },
  { value: "#E8DDD0", label: "Warm Gray" },
  { value: "transparent", label: "No background" },
];

// ── Chord font color presets ───────────────────────────────────────────────────

export type ChordColorPreset =
  | "#FFFFFF"
  | "#1A1A1A"
  | "#C0392B"
  | "#1A5276"
  | "#145A32";

export const CHORD_COLOR_PRESETS: Array<{
  value: ChordColorPreset;
  label: string;
}> = [
  { value: "#FFFFFF", label: "White" },
  { value: "#1A1A1A", label: "Near-black" },
  { value: "#C0392B", label: "Chord red" },
  { value: "#1A5276", label: "Deep blue" },
  { value: "#145A32", label: "Deep green" },
];

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CHORD_BG: ChordBgPreset = "transparent";
const DEFAULT_CHORD_COLOR: ChordColorPreset = "#C0392B";

const STORAGE_KEY_BG = "saliw-chord-bg";
const STORAGE_KEY_COLOR = "saliw-chord-color";

// ── Return type ───────────────────────────────────────────────────────────────

export type UseChordColorReturn = {
  chordBg: ChordBgPreset;
  chordColor: ChordColorPreset;
  setChordBg: (value: ChordBgPreset) => void;
  setChordColor: (value: ChordColorPreset) => void;
};

// ── SSR-safe lazy initializers (BUG-001) ──────────────────────────────────────

function readStoredChordBg(): ChordBgPreset {
  if (typeof window === "undefined") return DEFAULT_CHORD_BG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BG);
    if (stored !== null) {
      const isValid = CHORD_BG_PRESETS.some((p) => p.value === stored);
      if (isValid) return stored as ChordBgPreset;
    }
  } catch {
    // localStorage unavailable — use default
  }
  return DEFAULT_CHORD_BG;
}

function readStoredChordColor(): ChordColorPreset {
  if (typeof window === "undefined") return DEFAULT_CHORD_COLOR;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLOR);
    if (stored !== null) {
      const isValid = CHORD_COLOR_PRESETS.some((p) => p.value === stored);
      if (isValid) return stored as ChordColorPreset;
    }
  } catch {
    // localStorage unavailable — use default
  }
  return DEFAULT_CHORD_COLOR;
}

/**
 * Manages chord background and font color presets with localStorage persistence.
 *
 * - Initializes with SSR-safe lazy useState initializers (BUG-001).
 * - Persists bg under "saliw-chord-bg", color under "saliw-chord-color".
 * - Does NOT apply CSS variables itself; the consumer injects them via ref.
 *
 * @returns UseChordColorReturn
 */
export function useChordColor(): UseChordColorReturn {
  const [chordBg, setChordBgState] = useState<ChordBgPreset>(readStoredChordBg);
  const [chordColor, setChordColorState] =
    useState<ChordColorPreset>(readStoredChordColor);

  const setChordBg = useCallback((value: ChordBgPreset) => {
    setChordBgState(value);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_BG, value);
      }
    } catch {
      // localStorage unavailable — non-fatal
    }
  }, []);

  const setChordColor = useCallback((value: ChordColorPreset) => {
    setChordColorState(value);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COLOR, value);
      }
    } catch {
      // localStorage unavailable — non-fatal
    }
  }, []);

  return { chordBg, chordColor, setChordBg, setChordColor };
}
