"use client";

import { useRef, useEffect } from "react";
import { CHORD_REGISTRY } from "@/utils/chordLibrary";
import type {
  GuitarFingering,
  PianoFingering,
  BassFingering,
} from "@/utils/chordLibrary";

// ── Module-level class constants — stable strings (BUG-019) ──────────────────

// Outer fixed wrapper — full-width sticky-bottom drawer below AutoScrollToolbar (z-50).
// The chord-drawer-panel class in globals.css restores transform transition suppressed
// by the global * rule (which only covers background-color, border-color, fill, stroke).
// Full-opacity backgrounds: cream in light mode, darker espresso in dark mode so the
// drawer is visually distinct from the chord cards inside (which use bg-brand-espresso).
const drawerFixedWrapperClass = [
  "fixed bottom-0 left-0 right-0 z-40",
  "bg-brand-cream dark:bg-brand-darker border-t border-[var(--brand-tan-alpha)]",
  "chord-drawer-panel",
].join(" ");

const headerRowClass = [
  "flex items-center justify-between gap-3 px-4 py-2",
  "border-b border-[var(--brand-tan-alpha)]",
].join(" ");

const headerTitleClass = [
  "text-sm font-semibold",
  "text-brand-espresso dark:text-brand-cream",
].join(" ");

const instrumentToggleGroupClass = "flex items-center gap-1";

const instrBtnActiveClass = [
  "px-3 py-1 rounded-lg text-xs font-semibold",
  "bg-brand-brown text-brand-cream dark:bg-brand-tan dark:text-brand-espresso",
  "border border-brand-brown dark:border-brand-tan",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
].join(" ");

const instrBtnInactiveClass = [
  "px-3 py-1 rounded-lg text-xs font-semibold",
  "text-brand-brown dark:text-brand-tan",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const closeBtnClass = [
  "px-2 py-1 rounded text-xs",
  "text-brand-brown dark:text-brand-tan",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const scrollContainerClass =
  "flex flex-row overflow-x-auto scroll-smooth gap-4 py-4 px-6";

const emptyStateClass = [
  "py-6 px-4 text-sm italic",
  "text-brand-brown/60 dark:text-brand-tan/60",
].join(" ");

const cardBaseClass = [
  "flex-shrink-0 rounded-xl p-3",
  "bg-brand-cream dark:bg-brand-espresso",
  "border",
  "flex flex-col items-center gap-2",
  "min-w-[110px]",
].join(" ");

const cardFocusedExtraClass =
  "border-2 border-[var(--brand-tan)] animate-pulse";

const cardUnfocusedExtraClass =
  "border-brand-brown/20 dark:border-brand-tan/20";

const cardLabelClass = [
  "text-xs font-bold font-mono",
  "text-brand-espresso dark:text-brand-cream",
].join(" ");

const placeholderTextClass = [
  "text-xs text-center italic py-4",
  "text-brand-brown/60 dark:text-brand-tan/60",
].join(" ");

// Small pill/tab shown at the very bottom when drawer is closed.
// Tapping it re-opens the drawer.
// Full-opacity backgrounds: cream in light mode, darker espresso in dark mode (BUG-004: dark: paired).
const closedPillClass = [
  "fixed bottom-0 left-1/2 -translate-x-1/2 z-40",
  "px-4 py-1 rounded-t-lg",
  "text-xs font-semibold",
  "bg-brand-cream dark:bg-brand-darker border border-b-0 border-[var(--brand-tan-alpha)]",
  "text-brand-brown dark:text-brand-tan",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

// ── Guitar SVG constants ─────────────────────────────────────────────────────

/** X positions for 6 vertical string lines (low E → high e). */
const STRING_X = [10, 26, 42, 58, 74, 90] as const;

/** Y positions for 5 fret lines (nut through fret 5). */
const FRET_Y = [20, 40, 60, 80, 100] as const;

/** Y center of each fret slot (between two fret lines). */
const FRET_CENTER_Y = [30, 50, 70, 90] as const;

/** X positions for 4 vertical bass string lines (E A D G, low to high). */
const BASS_STRING_X = [14, 34, 54, 74] as const;

// ── Piano SVG constants ──────────────────────────────────────────────────────

/**
 * Black key x positions (left edge) in the 14-white-key layout.
 * White key width = 10, black key width = 7.
 * Pattern per octave (C D E F G A B):
 *   C# after C: x = 0 + 10 - 3.5 = 6.5 → 6
 *   D# after D: x = 10 + 10 - 3.5 = 16.5 → 16
 *   (no black after E)
 *   F# after F: x = 30 + 10 - 3.5 = 36.5 → 36
 *   G# after G: x = 40 + 10 - 3.5 = 46.5 → 46
 *   A# after A: x = 50 + 10 - 3.5 = 56.5 → 56
 * Octave 2 starts at white key index 7 → x = 70:
 *   C# oct2: 70 + 6.5 = 76
 *   D# oct2: 80 + 6.5 = 86
 *   F# oct2: 100 + 6.5 = 106
 *   G# oct2: 110 + 6.5 = 116
 *   A# oct2: 120 + 6.5 = 126
 */
const BLACK_KEY_X = [6, 16, 36, 46, 56, 76, 86, 106, 116, 126] as const;

// ── Sub-components ───────────────────────────────────────────────────────────

function GuitarSVG({
  fingering,
  capoOffsetProp,
}: {
  fingering: GuitarFingering;
  capoOffsetProp: number;
}) {
  const effectiveCapo =
    capoOffsetProp > 0 ? capoOffsetProp : fingering.capoOffset;

  return (
    <svg
      viewBox="0 0 100 120"
      width={100}
      height={120}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Fret lines */}
      {FRET_Y.map((y, i) => (
        <line
          key={`fret-${i}`}
          x1={STRING_X[0]}
          y1={y}
          x2={STRING_X[5]}
          y2={y}
          stroke="var(--brand-brown)"
          strokeWidth={i === 0 ? 3 : 1}
        />
      ))}

      {/* String lines */}
      {STRING_X.map((x, i) => (
        <line
          key={`string-${i}`}
          x1={x}
          y1={FRET_Y[0]}
          x2={x}
          y2={FRET_Y[4]}
          stroke="var(--brand-brown)"
          strokeWidth={1}
        />
      ))}

      {/* Per-string indicators above nut */}
      {STRING_X.map((x, i) => {
        const fret = fingering.strings[i];
        if (fret === -1) {
          return (
            <text
              key={`mute-${i}`}
              x={x}
              y={14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--brand-brown)"
              fontWeight="bold"
            >
              ×
            </text>
          );
        }
        if (fret === 0) {
          return (
            <circle
              key={`open-${i}`}
              cx={x}
              cy={12}
              r={4}
              fill="none"
              stroke="var(--brand-brown)"
              strokeWidth={1.5}
            />
          );
        }
        return null;
      })}

      {/* Finger circles — fretted notes */}
      {STRING_X.map((x, i) => {
        const fret = fingering.strings[i];
        if (fret > 0 && fret <= 4) {
          return (
            <circle
              key={`finger-${i}`}
              cx={x}
              cy={FRET_CENTER_Y[fret - 1]}
              r={7}
              fill="var(--brand-tan)"
            />
          );
        }
        return null;
      })}

      {/* Capo / fret position indicator */}
      {effectiveCapo > 0 && (
        <text
          x={97}
          y={30}
          textAnchor="start"
          fontSize={8}
          fill="var(--brand-brown)"
          fontWeight="bold"
        >
          {effectiveCapo}fr
        </text>
      )}
    </svg>
  );
}

function PianoSVG({ fingering }: { fingering: PianoFingering }) {
  return (
    <svg
      viewBox="0 0 140 60"
      width={140}
      height={60}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* White keys */}
      {Array.from({ length: 14 }, (_, i) => (
        <rect
          key={`white-${i}`}
          x={i * 10}
          y={5}
          width={10}
          height={50}
          fill="var(--brand-cream)"
          stroke="var(--brand-brown)"
          strokeWidth={0.75}
        />
      ))}

      {/* Active white key circles */}
      {fingering.whiteKeyIndices.map((idx) => (
        <circle
          key={`wactive-${idx}`}
          cx={idx * 10 + 5}
          cy={45}
          r={3}
          fill="var(--brand-tan)"
        />
      ))}

      {/* Black keys */}
      {BLACK_KEY_X.map((x, i) => (
        <rect
          key={`black-${i}`}
          x={x}
          y={5}
          width={7}
          height={30}
          fill="var(--brand-espresso)"
        />
      ))}

      {/* Active black key circles */}
      {fingering.blackKeyIndices.map((idx) => (
        <circle
          key={`bactive-${idx}`}
          cx={BLACK_KEY_X[idx] + 3.5}
          cy={25}
          r={2.5}
          fill="var(--brand-tan)"
        />
      ))}
    </svg>
  );
}

function BassSVG({ fingering }: { fingering: BassFingering }) {
  return (
    <svg
      viewBox="0 0 88 120"
      width={88}
      height={120}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Fret lines */}
      {FRET_Y.map((y, i) => (
        <line
          key={`bfret-${i}`}
          x1={BASS_STRING_X[0]}
          y1={y}
          x2={BASS_STRING_X[3]}
          y2={y}
          stroke="var(--brand-brown)"
          strokeWidth={i === 0 ? 3 : 1}
        />
      ))}

      {/* String lines */}
      {BASS_STRING_X.map((x, i) => (
        <line
          key={`bstring-${i}`}
          x1={x}
          y1={FRET_Y[0]}
          x2={x}
          y2={FRET_Y[4]}
          stroke="var(--brand-brown)"
          strokeWidth={1}
        />
      ))}

      {/* Per-string indicators above nut */}
      {BASS_STRING_X.map((x, i) => {
        const fret = fingering.strings[i];
        if (fret === -1) {
          return (
            <text
              key={`bmute-${i}`}
              x={x}
              y={14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--brand-brown)"
              fontWeight="bold"
            >
              ×
            </text>
          );
        }
        if (fret === 0) {
          return (
            <circle
              key={`bopen-${i}`}
              cx={x}
              cy={12}
              r={4}
              fill="none"
              stroke="var(--brand-brown)"
              strokeWidth={1.5}
            />
          );
        }
        return null;
      })}

      {/* Finger circles — fretted notes */}
      {BASS_STRING_X.map((x, i) => {
        const fret = fingering.strings[i];
        if (fret > 0 && fret <= 4) {
          return (
            <circle
              key={`bfinger-${i}`}
              cx={x}
              cy={FRET_CENTER_Y[fret - 1]}
              r={7}
              fill="var(--brand-tan)"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

// ── Scroll helper — declared before the useEffect that references it (BUG-007) ─

function computeScrollTarget(
  container: HTMLDivElement,
  cardEl: HTMLElement
): number {
  return cardEl.offsetLeft - container.clientWidth / 2 + cardEl.clientWidth / 2;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ChordDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  focusedChord: string | null;
  instrumentMode: "guitar" | "piano" | "bass";
  onInstrumentChange: (mode: "guitar" | "piano" | "bass") => void;
  uniqueChords: string[];
  capoOffset?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChordDrawer({
  isOpen,
  onToggle,
  focusedChord,
  instrumentMode,
  onInstrumentChange,
  uniqueChords,
  capoOffset = 0,
}: ChordDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll focused card into center of scroll container.
  // computeScrollTarget declared above (BUG-007).
  useEffect(() => {
    if (!isOpen || focusedChord === null) return;
    const container = containerRef.current;
    if (!container) return;
    const cardEl = container.querySelector<HTMLElement>(
      `[data-chord="${CSS.escape(focusedChord)}"]`
    );
    if (!cardEl) return;
    const targetScrollLeft = computeScrollTarget(container, cardEl);
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [focusedChord, isOpen]);

  // Closed state: small pill/tab at the very bottom edge so the user can re-open.
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={closedPillClass}
        aria-label="Open chord helper"
      >
        Chords ↑
      </button>
    );
  }

  // Open state: full fixed bottom drawer with header + scroll row.
  return (
    <div className={drawerFixedWrapperClass}>
      {/* Header row */}
      <div className={headerRowClass}>
        <span className={headerTitleClass}>
          {focusedChord ? `Chord: ${focusedChord}` : "Chord Helper"}
        </span>

        {/* Instrument toggle */}
        <div
          className={instrumentToggleGroupClass}
          role="group"
          aria-label="Instrument mode"
        >
          <button
            type="button"
            onClick={() => onInstrumentChange("guitar")}
            aria-pressed={instrumentMode === "guitar"}
            className={
              instrumentMode === "guitar"
                ? instrBtnActiveClass
                : instrBtnInactiveClass
            }
          >
            Guitar
          </button>
          <button
            type="button"
            onClick={() => onInstrumentChange("piano")}
            aria-pressed={instrumentMode === "piano"}
            className={
              instrumentMode === "piano"
                ? instrBtnActiveClass
                : instrBtnInactiveClass
            }
          >
            Piano
          </button>
          <button
            type="button"
            onClick={() => onInstrumentChange("bass")}
            aria-pressed={instrumentMode === "bass"}
            className={
              instrumentMode === "bass"
                ? instrBtnActiveClass
                : instrBtnInactiveClass
            }
          >
            Bass
          </button>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Close chord helper"
          className={closeBtnClass}
        >
          ↓
        </button>
      </div>

      {/* Scroll container */}
      {uniqueChords.length === 0 ? (
        <p className={emptyStateClass}>No chords found in this setlist</p>
      ) : (
        <div ref={containerRef} className={scrollContainerClass}>
          {uniqueChords.map((chordName) => {
            const entry = CHORD_REGISTRY[chordName];
            const isFocused = focusedChord === chordName;
            const cardClass = [
              cardBaseClass,
              isFocused ? cardFocusedExtraClass : cardUnfocusedExtraClass,
            ].join(" ");

            return (
              <div key={chordName} data-chord={chordName} className={cardClass}>
                <span className={cardLabelClass}>{chordName}</span>
                {entry ? (
                  (() => {
                    if (instrumentMode === "guitar") {
                      return (
                        <GuitarSVG
                          fingering={entry.guitar}
                          capoOffsetProp={capoOffset}
                        />
                      );
                    } else if (instrumentMode === "piano") {
                      return <PianoSVG fingering={entry.piano} />;
                    } else {
                      return <BassSVG fingering={entry.bass} />;
                    }
                  })()
                ) : (
                  <p className={placeholderTextClass}>No diagram available</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
