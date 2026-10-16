"use client";

import { useState, useMemo, useCallback } from "react";
import ChordSheetClient from "@/components/SongViewer/ChordSheetClient";
import ChordDrawer from "@/components/client/ChordDrawer";
import type { ProcessedLine } from "@/utils/musicLogic";
import { getSemitoneOffset, shiftChord } from "@/utils/musicLogic";

interface SongDetailClientProps {
  processedLines: ProcessedLine[];
  originalKey: string;
}

export default function SongDetailClient({
  processedLines,
  originalKey,
}: SongDetailClientProps) {
  // Global chord drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [focusedChord, setFocusedChord] = useState<string | null>(null);
  const [instrumentMode, setInstrumentMode] = useState<
    "guitar" | "piano" | "bass"
  >(() => {
    if (typeof window === "undefined") return "guitar";
    const stored = localStorage.getItem("saliw:instrumentMode");
    if (stored === "guitar" || stored === "piano" || stored === "bass")
      return stored;
    return "guitar";
  });

  const [semitoneOffset, setSemitoneOffset] = useState<number>(0);

  const handleInstrumentChange = useCallback(
    (mode: "guitar" | "piano" | "bass") => {
      setInstrumentMode(mode);
      localStorage.setItem("saliw:instrumentMode", mode);
    },
    []
  );

  // Derive unique transposed chord names
  const uniqueChords = useMemo(() => {
    const seen = new Set<string>();
    for (const line of processedLines) {
      if (line.type === "chord") {
        for (const token of line.tokens) {
          if (token.isChord && token.originalChord) {
            const transposed =
              semitoneOffset === 0
                ? token.originalChord
                : shiftChord(token.originalChord, semitoneOffset);
            seen.add(transposed);
          }
        }
      }
    }
    return Array.from(seen);
  }, [processedLines, semitoneOffset]);

  const handleKeyChange = useCallback(
    (newKey: string) => {
      setSemitoneOffset(getSemitoneOffset(originalKey, newKey));
    },
    [originalKey]
  );

  const handleChordClick = useCallback((chordName: string) => {
    setFocusedChord(chordName);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerToggle = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  return (
    <>
      <ChordSheetClient
        processedLines={processedLines}
        originalKey={originalKey}
        onKeyChange={handleKeyChange}
        onChordClick={handleChordClick}
      />
      <ChordDrawer
        isOpen={isDrawerOpen}
        onToggle={handleDrawerToggle}
        focusedChord={focusedChord}
        instrumentMode={instrumentMode}
        onInstrumentChange={handleInstrumentChange}
        uniqueChords={uniqueChords}
      />
    </>
  );
}
