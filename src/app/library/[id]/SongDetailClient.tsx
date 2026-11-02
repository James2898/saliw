"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import ChordSheetClient from "@/components/SongViewer/ChordSheetClient";
import ChordDrawer from "@/components/client/ChordDrawer";
import Button from "@/components/client/button";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import type { ProcessedLine } from "@/utils/musicLogic";
import { NOTES, getSemitoneOffset, shiftChord } from "@/utils/musicLogic";
import type { SongPerformanceHistoryItem } from "@/utils/worshipLeaderHistory";

// ── Module-level constants (BUG-019: hoisted outside component) ───────────────

const VALID_KEYS_SET = new Set<string>([
  ...(NOTES as readonly string[]),
  "Ab",
  "Bb",
  "Cb",
  "Db",
  "Eb",
  "Fb",
  "Gb",
]);

function isValidKey(key: string): boolean {
  return VALID_KEYS_SET.has(key);
}

const toggleBtnBaseClass = [
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
  "text-xs font-semibold",
  "border transition-colors duration-200",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
].join(" ");

const toggleBtnActiveClass =
  "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan";

const toggleBtnInactiveClass =
  "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10";

const historyRowClass = [
  "flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl",
  "bg-brand-cream dark:bg-brand-darker",
  "border border-brand-brown/15 dark:border-brand-tan/20",
].join(" ");

const repeatBadgeClass = [
  "inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded",
  "bg-brand-brown/10 dark:bg-brand-tan/15",
  "text-brand-espresso dark:text-brand-cream",
  "border border-brand-brown/15 dark:border-brand-tan/20",
].join(" ");

const setlistLinkClass = [
  "text-xs font-medium text-brand-brown dark:text-brand-tan",
  "hover:text-brand-espresso dark:hover:text-brand-cream underline underline-offset-2",
  "transition-colors duration-200 truncate max-w-[14rem] sm:max-w-xs",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1 rounded",
].join(" ");

interface SongDetailClientProps {
  processedLines: ProcessedLine[];
  originalKey: string;
  historyItems?: SongPerformanceHistoryItem[];
}

export default function SongDetailClient({
  processedLines,
  originalKey,
  historyItems = [],
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

  // Two-way transposition sync state (AC-15, AC-16, AM-2 / BUG-027)
  const [activeKey, setActiveKey] = useState<string>(() => {
    const offset = getSemitoneOffset(originalKey, originalKey);
    const origIdx = (NOTES as readonly string[]).indexOf(originalKey);
    const resolvedIdx =
      origIdx !== -1
        ? origIdx
        : (12 - getSemitoneOffset(originalKey, NOTES[0])) % 12;
    return NOTES[(resolvedIdx + offset + 12) % 12];
  });
  const [targetKey, setTargetKey] = useState<string | undefined>(undefined);

  // History section collapsed by default on initial load (AC-11)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // Screen-reader announcement for history key transpositions (AC-18)
  const [announcement, setAnnouncement] = useState("");

  const semitoneOffset = useMemo(
    () => getSemitoneOffset(originalKey, activeKey),
    [originalKey, activeKey]
  );

  // ── Handlers — declared BEFORE hooks that reference them (AM-3, BUG-007) ────

  const handleInstrumentChange = useCallback(
    (mode: "guitar" | "piano" | "bass") => {
      setInstrumentMode(mode);
      localStorage.setItem("saliw:instrumentMode", mode);
    },
    []
  );

  const handleKeyChange = useCallback((newKey: string) => {
    setActiveKey((prev) => (prev === newKey ? prev : newKey));
    setTargetKey((prev) => (prev === newKey ? prev : newKey));
  }, []);

  const handleUseHistoryKey = useCallback(
    (performanceKey: string, leaderName: string) => {
      if (!isValidKey(performanceKey)) return;
      // Canonicalize key via NOTES so activeKey matches ChordSheetClient's displayKey
      const offset = getSemitoneOffset(originalKey, performanceKey);
      const origIdx = (NOTES as readonly string[]).indexOf(originalKey);
      const resolvedIdx =
        origIdx !== -1
          ? origIdx
          : (12 - getSemitoneOffset(originalKey, NOTES[0])) % 12;
      const canonicalKey = NOTES[(resolvedIdx + offset + 12) % 12];

      setTargetKey((prev) => (prev === canonicalKey ? prev : canonicalKey));
      setActiveKey((prev) => (prev === canonicalKey ? prev : canonicalKey));
      setAnnouncement(
        `Transposed song to key ${performanceKey} (${leaderName})`
      );
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

  const handleHistoryToggle = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

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

  return (
    <>
      {/* ── Screen-reader live region for transposition announcements (AC-18) ── */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* ── Song Performance History Section (AC-10..AC-19) ─────────────────── */}
      <div className="mb-4">
        {historyItems.length > 0 ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleHistoryToggle}
                aria-expanded={isHistoryOpen}
                aria-controls="song-performance-history-panel"
                className={[
                  toggleBtnBaseClass,
                  isHistoryOpen ? toggleBtnActiveClass : toggleBtnInactiveClass,
                ].join(" ")}
              >
                {/* Clock / History icon */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {isHistoryOpen
                  ? "Hide history"
                  : `Show history (${historyItems.length})`}
              </button>
            </div>

            <div
              id="song-performance-history-panel"
              className={["mt-3", isHistoryOpen ? "block" : "hidden"].join(" ")}
              aria-hidden={!isHistoryOpen}
            >
              <div className="flex flex-col gap-2">
                {historyItems.map((item) => {
                  const keyValid = isValidKey(item.performanceKey);
                  const isCurrent =
                    keyValid &&
                    getSemitoneOffset(activeKey, item.performanceKey) === 0;
                  const isDisabled = isCurrent || !keyValid;
                  const buttonLabel = isCurrent ? "Current" : "Use key";
                  const buttonAriaLabel = isCurrent
                    ? `Currently in key ${item.performanceKey} (${item.worshipLeaderName})`
                    : keyValid
                      ? `Use key ${item.performanceKey} from ${item.worshipLeaderName}`
                      : `Key ${item.performanceKey} is unavailable for transposition`;

                  return (
                    <div
                      key={`${item.worshipLeaderId}-${item.performanceKey}`}
                      className={historyRowClass}
                    >
                      {/* Left: Worship Leader Name + Key & Repeat Badges */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-sm font-semibold text-brand-espresso dark:text-brand-cream truncate">
                          {item.worshipLeaderName}
                        </span>
                        <SongKeyBadge musicalKey={item.performanceKey} />
                        {item.count >= 2 && (
                          <span
                            className={repeatBadgeClass}
                            aria-label={`Performed ${item.count} times in key ${item.performanceKey}`}
                          >
                            ×{item.count}
                          </span>
                        )}
                      </div>

                      {/* Right: Date + Setlist Link + Use Key / Current Button */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
                        <span className="text-xs text-brand-brown dark:text-brand-tan tabular-nums">
                          {item.lastSungDate}
                        </span>
                        <Link
                          href={`/setlists/${item.lastSetlistId}`}
                          className={setlistLinkClass}
                        >
                          {item.lastSetlistName}
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isDisabled}
                          aria-disabled={isDisabled}
                          aria-label={buttonAriaLabel}
                          onClick={() =>
                            handleUseHistoryKey(
                              item.performanceKey,
                              item.worshipLeaderName
                            )
                          }
                          className="h-8 px-3 py-1.5 text-xs font-semibold rounded-lg"
                        >
                          {buttonLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-brand-espresso/50 dark:text-brand-cream/40">
            No performance history
          </p>
        )}
      </div>

      <ChordSheetClient
        processedLines={processedLines}
        originalKey={originalKey}
        targetKey={targetKey}
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
