"use client";

import { useRef, useEffect, useState } from "react";
import type { ProcessedLine } from "@/utils/musicLogic";
import { NOTES, shiftChord, getSemitoneOffset } from "@/utils/musicLogic";
import { useTranspose } from "@/hooks/useTranspose";
import { useFontSize } from "@/hooks/useFontSize";
import { useAutoScroll, type UseAutoScrollReturn } from "@/hooks/useAutoScroll";
import AutoScrollToolbar from "@/components/client/AutoScrollToolbar";

// ── Module-level constants — stable class strings extracted to avoid per-render allocations ──

const ctrlBtnClass = [
  "flex items-center justify-center rounded-lg shrink-0",
  "font-mono font-bold text-sm",
  "text-brand-espresso dark:text-brand-cream",
  "bg-brand-cream dark:bg-brand-espresso",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const toggleBtnClass = [
  "px-2.5 py-1 rounded-lg shrink-0",
  "text-xs font-semibold font-sans",
  "border",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const toggleActiveClass =
  "bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan";

const toggleInactiveClass =
  "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10";

// ── Capo and CAGED picker — module-level constants (BUG-019: stable array refs) ──

/** Capo fret values 0–7. Declared at module scope to preserve React.memo stability. */
const CAPO_FRETS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** CAGED shape labels in display order. Declared at module scope for React.memo stability. */
const CAGED_SHAPES = ["C", "A", "G", "E", "D"] as const;

/** TypeScript union type derived from the CAGED_SHAPES tuple. */
type CAGEDShape = (typeof CAGED_SHAPES)[number];

/**
 * Open-position root note for each CAGED shape.
 * Declared at module scope for React.memo stability (BUG-019).
 */
const CAGED_SHAPE_ROOTS: Record<CAGEDShape, string> = {
  C: "C",
  A: "A",
  G: "G",
  E: "E",
  D: "D",
};

// Capo swatch button — selected ring (BUG-004: every brand class paired with dark:)
const capoSwatchSelectedClass =
  "border-brand-espresso dark:border-brand-tan shadow-md";

// Capo swatch button — disabled (shape out of range for current key) (BUG-004)
const capoSwatchDisabledClass = "opacity-40 cursor-not-allowed dark:opacity-40";

// Capo swatch button — unselected ring (BUG-004)
const capoSwatchUnselectedClass =
  "border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown/50 dark:hover:border-brand-tan/50";

// Base class shared by all capo and CAGED swatch buttons (BUG-004)
const swatchBtnBaseClass = [
  "relative flex items-center justify-center",
  "w-9 h-9 rounded-lg shrink-0",
  "font-mono font-bold text-sm",
  "text-brand-espresso dark:text-brand-cream",
  "bg-brand-cream dark:bg-brand-espresso",
  "border-2 transition-colors duration-200",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
].join(" ");

// Section label class for Capo / CAGED row headings (BUG-004)
const pickerLabelClass =
  "text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan shrink-0";

interface ChordSheetClientProps {
  processedLines: ProcessedLine[];
  originalKey: string;
  /** If provided, the sheet opens at this key instead of originalKey (e.g. setlist performanceKey). */
  initialKey?: string;
  /** Optional callback fired whenever the displayed (transposed) key changes. */
  onKeyChange?: (key: string) => void;
  /**
   * Optional callback fired when the user clicks a chord token in the sheet.
   * Receives the pre-transposition chord name from data-original-chord.
   * When undefined, chord clicks are a no-op (no error thrown).
   */
  onChordClick?: (chordName: string) => void;
  /**
   * Optional key injected by Follow Leader mode.
   * RF-2 guard: effect must NOT call setTargetKey when externalKey === displayKey.
   */
  externalKey?: string;
  /**
   * Optional callback for Go Live auto-persist.
   * Fired alongside onKeyChange in the same useEffect. Only when provided.
   */
  onKeyChangeLive?: (key: string) => void;
  /** Global chords visibility override from the setlist toolbar toggle. */
  externalChordsHidden?: boolean;
  /**
   * Auto-scroll instance injected by a parent that owns the toolbar
   * (e.g. SetlistViewerClient renders one toolbar for the whole page).
   * When provided, this component skips creating its own useAutoScroll
   * instance and skips rendering its own AutoScrollToolbar — preventing the
   * "N+1 instances on the setlist page" bug where each song spawned a
   * parallel rAF loop and the parent's pause() couldn't stop them.
   */
  injectedAutoScroll?: UseAutoScrollReturn;
  /**
   * Lyric font size in pixels, lifted from SetlistViewerClient.
   * When provided, the component uses this value instead of its own hook.
   * When absent (e.g. standalone song viewer), the component manages its own
   * font size via the on-sheet controls.
   */
  fontSize?: number;
  /** Increase lyric font size — provided when fontSize prop is controlled externally. */
  onIncreaseFont?: () => void;
  /** Decrease lyric font size — provided when fontSize prop is controlled externally. */
  onDecreaseFont?: () => void;
  /** Reset lyric font size — provided when fontSize prop is controlled externally. */
  onResetFont?: () => void;
  /** Chord-specific font size in pixels, injected from SetlistViewerClient. */
  chordFontSize?: number;
  /** Chord background color CSS value (hex or "transparent"). */
  chordBg?: string;
  /** Chord font color CSS value (hex). */
  chordColor?: string;
  /**
   * Optional stable prefix for section header `id` attributes.
   * When provided, each `type: "header"` span receives
   * `id="{sectionIdPrefix}-{lineIndex}"` so the SectionNavDeck can
   * target them via `document.getElementById()`.
   * When absent (standalone song viewer), no `id` is emitted.
   */
  sectionIdPrefix?: string;
}

/**
 * ChordSheetClient — Interactive chord sheet with live transposition.
 *
 * Renders the SSR-pre-processed chord sheet and provides:
 * - A key selector dropdown (all 12 chromatic keys from NOTES)
 * - −1 / +1 semitone stepper buttons
 *
 * Transposition is applied by mutating the `innerText` of `.chord-item` spans
 * via a container ref after mount (and on every semitoneOffset change).
 * This DOM-mutation approach avoids re-rendering the chord node tree, which
 * would cause React hydration mismatches since the SSR output is pre-rendered.
 *
 * No Supabase calls are made from this component.
 */
export default function ChordSheetClient({
  processedLines,
  originalKey,
  initialKey,
  onKeyChange,
  onChordClick,
  externalKey,
  onKeyChangeLive,
  externalChordsHidden,
  injectedAutoScroll,
  fontSize: fontSizeProp,
  onIncreaseFont,
  onDecreaseFont,
  onResetFont,
  chordFontSize,
  chordBg,
  chordColor,
  sectionIdPrefix,
}: ChordSheetClientProps) {
  const {
    semitoneOffset,
    displayKey,
    increment,
    decrement,
    setTargetKey,
    reset,
  } = useTranspose(originalKey, initialKey);

  // When font size is controlled externally (setlist viewer), use the injected values.
  // When used standalone (single song viewer / song editor), fall back to the internal hook.
  // Rules of Hooks: useFontSize is always called; its return value is only used when
  // no external font size prop is provided.
  const internalFontSize = useFontSize();
  const fontSize = fontSizeProp ?? internalFontSize.fontSize;
  const increaseFont = onIncreaseFont ?? internalFontSize.increase;
  const decreaseFont = onDecreaseFont ?? internalFontSize.decrease;
  const resetFont = onResetFont ?? internalFontSize.reset;

  // Always call the hook (rules of hooks), but prefer the injected instance
  // when a parent owns auto-scroll. The internal instance stays inert in that
  // case because the internal AutoScrollToolbar is not rendered (no toggle
  // button means the rAF never starts).
  const internalAutoScroll = useAutoScroll();
  const autoScroll = injectedAutoScroll ?? internalAutoScroll;

  const [chordsHidden, setChordsHidden] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // ── Capo and CAGED local state (BUG-020: literal defaults, not window guards) ──
  // capoOffset: 0 = no capo; 1–7 = capo at that fret (subtracts from semitoneOffset)
  const [capoOffset, setCapoOffset] = useState(0);
  // cagedShape: null = no shape selected; 'C'|'A'|'G'|'E'|'D' = selected shape
  const [cagedShape, setCAGEDShape] = useState<CAGEDShape | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Delegated chord-click handler — declared before useEffect (BUG-007) ───
  // Uses a named function so it can be cleanly removed on unmount.
  // Handler is a stable closure over onChordClick; the useEffect re-registers
  // whenever onChordClick changes.
  // Fires the TRANSPOSED chord name (span.innerText) rather than the original
  // chord name (data-original-chord), so the drawer always receives the chord
  // name as the performer sees it in the sheet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function handleChordClick(e: MouseEvent) {
    if (!onChordClick) return;
    const target = e.target as HTMLElement;
    const chordSpan = target.closest<HTMLElement>(
      ".chord-item[data-original-chord]"
    );
    if (chordSpan) {
      const displayedChord = chordSpan.innerText.trim();
      if (displayedChord) {
        onChordClick(displayedChord);
      }
    }
  }

  // Attach delegated click listener on the container div.
  // DOM mutation renders chord spans dynamically; inline onClick on spans
  // would not persist after transposition re-renders. Delegated listener
  // on the stable container ref handles all clicks correctly (AC-28).
  useEffect(() => {
    const container = sheetRef.current;
    if (!container) return;
    container.addEventListener("click", handleChordClick);
    return () => {
      container.removeEventListener("click", handleChordClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChordClick]);

  // Apply transposition to all .chord-item spans after mount and on offset changes.
  // Also runs when chordsHidden flips to false so re-rendered spans get the correct transposed text.
  // capoOffset is subtracted from semitoneOffset so the chord sheet shows open-position
  // fingering shapes (the performer fingers these shapes with the capo at fret N).
  // shiftChord returns the original chord string unchanged when semitones === 0,
  // and handles all 12 chromatic positions via the shared NOTES array — no try/catch needed.
  useEffect(() => {
    if (chordsHidden) return;
    const container = sheetRef.current;
    if (!container) return;

    const spans = container.querySelectorAll<HTMLSpanElement>(
      ".chord-item[data-original-chord]"
    );
    spans.forEach((span) => {
      const original = span.getAttribute("data-original-chord");
      if (original) {
        span.innerText = shiftChord(original, semitoneOffset - capoOffset);
      }
    });
  }, [semitoneOffset, capoOffset, chordsHidden]);

  // Notify parent whenever the displayed key changes (e.g. for Sync button in SetlistSongSection).
  // Also fires onKeyChangeLive for Go Live auto-persist debounce (AC-18).
  useEffect(() => {
    onKeyChange?.(displayKey);
    onKeyChangeLive?.(displayKey);
  }, [displayKey, onKeyChange, onKeyChangeLive]);

  // RF-2 guard: react to externally injected key changes from Follow Leader mode.
  // Must NOT fire on initial mount when externalKey === originalKey to avoid
  // a redundant DOM chord mutation for every song in the setlist.
  useEffect(() => {
    if (externalKey !== undefined && externalKey !== displayKey) {
      setTargetKey(externalKey);
    }
    // Intentionally omit displayKey from deps — we only want to react when externalKey changes.
    // Including displayKey would cause a feedback loop: setTargetKey → displayKey changes → effect re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalKey]);

  // Sync local chordsHidden state when the global toolbar toggle changes.
  useEffect(() => {
    if (externalChordsHidden !== undefined) {
      setChordsHidden(externalChordsHidden);
    }
  }, [externalChordsHidden]);

  // Apply font-size CSS variable to the chord-display container.
  // DOM mutation pattern — avoids React re-renders on the chord node tree.
  useEffect(() => {
    sheetRef.current?.style.setProperty("--chord-font-size", `${fontSize}px`);
  }, [fontSize]);

  // Apply chord-specific font size CSS variable to the container.
  useEffect(() => {
    if (chordFontSize !== undefined) {
      sheetRef.current?.style.setProperty(
        "--chord-item-font-size",
        `${chordFontSize}px`
      );
    }
  }, [chordFontSize]);

  // Apply chord color CSS variable to the container.
  // Injecting on the container ref (not on individual spans) so the CSS
  // variable cascades to all .chord-item spans without touching their DOM nodes.
  useEffect(() => {
    if (chordColor !== undefined) {
      sheetRef.current?.style.setProperty("--chord-color", chordColor);
    }
  }, [chordColor]);

  // Apply chord background CSS variable to the container.
  useEffect(() => {
    if (chordBg !== undefined) {
      sheetRef.current?.style.setProperty("--chord-bg", chordBg);
    }
  }, [chordBg]);

  // Build chord-display container class with conditional modifiers.
  const chordDisplayClass = ["chord-display", chordsHidden && "chords-hidden"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* ── Auto-scroll toolbar — fixed bottom-right (AC 1) ───────────────────
          Only rendered when this component owns auto-scroll. On the setlist
          page, the parent (SetlistViewerClient) renders one shared toolbar.   */}
      {!injectedAutoScroll && <AutoScrollToolbar scroll={autoScroll} />}

      <div>
        {/* ── Transposition control bar (accordion) ─────────────────────────── */}
        <div
          className={[
            "mb-6 rounded-xl overflow-hidden",
            "bg-brand-cream dark:bg-brand-espresso",
            "border border-brand-brown/20 dark:border-brand-tan/20",
          ].join(" ")}
        >
          {/* Accordion toggle row */}
          <button
            type="button"
            onClick={() => setToolbarOpen((prev) => !prev)}
            aria-expanded={toolbarOpen}
            aria-label={
              toolbarOpen ? "Hide song controls" : "Show song controls"
            }
            className={[
              "w-full flex items-center gap-2 px-4 py-2.5",
              "text-xs font-semibold uppercase tracking-widest",
              "text-brand-brown dark:text-brand-tan",
              "hover:bg-brand-brown/5 dark:hover:bg-brand-tan/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan",
              "transition-colors duration-200",
            ].join(" ")}
          >
            {/* Caret — rotates 90° when open */}
            <svg
              className={[
                "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                toolbarOpen ? "rotate-90" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Song Controls
            {/* Key hint shown while collapsed */}
            {!toolbarOpen && (
              <span className="ml-auto font-mono normal-case tracking-normal text-brand-brown/60 dark:text-brand-tan/60">
                {displayKey}
              </span>
            )}
          </button>

          {/* Collapsible controls — max-h-96 accommodates Key + Size + Hide Chords + Capo + CAGED rows (AM-1) */}
          <div
            className={[
              "overflow-hidden transition-all duration-200 chord-sheet-toolbar-panel",
              toolbarOpen ? "max-h-96" : "max-h-0",
            ].join(" ")}
            aria-label="Chord sheet controls"
          >
            <div
              className={[
                "flex items-center gap-3 flex-wrap",
                "px-4 py-3",
                "border-t border-brand-brown/20 dark:border-brand-tan/20",
              ].join(" ")}
            >
              {/* ── Key transposition ───────────────────────────────────────── */}
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan shrink-0">
                Key
              </span>

              {/* −1 semitone button */}
              <button
                type="button"
                onClick={decrement}
                aria-label="Transpose down one semitone"
                className={[ctrlBtnClass, "w-8 h-8"].join(" ")}
              >
                −1
              </button>

              {/* Key selector dropdown */}
              <select
                value={displayKey}
                onChange={(e) => setTargetKey(e.target.value)}
                aria-label="Select target key"
                className={[
                  "px-3 py-1.5 rounded-lg",
                  "font-mono font-bold text-sm",
                  "text-brand-espresso dark:text-brand-cream",
                  "bg-brand-cream dark:bg-brand-espresso",
                  "border border-brand-tan dark:border-brand-tan/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                  "transition-colors duration-200",
                  "cursor-pointer",
                ].join(" ")}
              >
                {(NOTES as string[]).map((note) => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>

              {/* +1 semitone button */}
              <button
                type="button"
                onClick={increment}
                aria-label="Transpose up one semitone"
                className={[ctrlBtnClass, "w-8 h-8"].join(" ")}
              >
                +1
              </button>

              {/* Reset key — only show when transposed */}
              {semitoneOffset !== 0 && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset to original key"
                  className={[
                    "px-2.5 py-1 rounded-lg shrink-0",
                    "text-xs font-semibold font-sans",
                    "text-brand-brown dark:text-brand-tan",
                    "hover:text-brand-espresso dark:hover:text-brand-cream",
                    "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                    "transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                  ].join(" ")}
                >
                  Reset
                </button>
              )}

              {/* Original key indicator */}
              <span className="ml-auto text-xs font-medium text-brand-brown dark:text-brand-tan shrink-0">
                Original: {originalKey}
              </span>

              {/* ── Divider ───────────────────────────────────────────────────── */}
              <span
                className="w-px h-5 bg-brand-brown/20 dark:bg-brand-tan/20 shrink-0"
                aria-hidden="true"
              />

              {/* ── Font size controls ───────────────────────────────────────── */}
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan shrink-0">
                Size
              </span>

              {/* A− decrease font */}
              <button
                type="button"
                onClick={decreaseFont}
                aria-label="Decrease font size"
                className={[ctrlBtnClass, "w-8 h-8 text-xs"].join(" ")}
              >
                A−
              </button>

              {/* Font size indicator — click to reset */}
              <button
                type="button"
                onClick={resetFont}
                aria-label={`Font size ${fontSize}px — click to reset`}
                title="Click to reset font size"
                className={[
                  "px-2 py-1 rounded-lg shrink-0",
                  "text-xs font-mono font-bold",
                  "text-brand-espresso dark:text-brand-cream",
                  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                  "transition-colors duration-200",
                ].join(" ")}
              >
                {fontSize}px
              </button>

              {/* A+ increase font */}
              <button
                type="button"
                onClick={increaseFont}
                aria-label="Increase font size"
                className={[ctrlBtnClass, "w-8 h-8 text-xs"].join(" ")}
              >
                A+
              </button>

              {/* ── Divider ───────────────────────────────────────────────────── */}
              <span
                className="w-px h-5 bg-brand-brown/20 dark:bg-brand-tan/20 shrink-0"
                aria-hidden="true"
              />

              {/* ── Stage-ready toggles ──────────────────────────────────────── */}

              {/* Hide Chords toggle */}
              <button
                type="button"
                onClick={() => setChordsHidden((prev) => !prev)}
                aria-pressed={chordsHidden}
                aria-label={chordsHidden ? "Show chords" : "Hide chords"}
                className={[
                  toggleBtnClass,
                  chordsHidden ? toggleActiveClass : toggleInactiveClass,
                ].join(" ")}
              >
                {chordsHidden ? "Show Chords" : "Hide Chords"}
              </button>

              {/* ── Divider ───────────────────────────────────────────────────── */}
              <span
                className="w-px h-5 bg-brand-brown/20 dark:bg-brand-tan/20 shrink-0"
                aria-hidden="true"
              />

              {/* ── Capo selector (frets 0–7) ────────────────────────────────── */}
              {/*
                Capo applies an inverse transpose to the chord display only.
                Fret N: chord sheet shows open-position shapes the performer
                fingers (sounding key transposed DOWN by N semitones).
                Does NOT affect performanceKey or any sync/Realtime state.
              */}
              <span className={pickerLabelClass}>Capo</span>

              <div
                className="flex items-center gap-1.5 flex-wrap"
                role="group"
                aria-label="Capo fret selector"
              >
                {CAPO_FRETS.map((fret) => {
                  const isSelected = capoOffset === fret;
                  return (
                    <button
                      key={fret}
                      type="button"
                      onClick={() => {
                        setCapoOffset(fret);
                        setCAGEDShape(null);
                      }}
                      aria-label={`Capo fret ${fret}${fret === 0 ? " (no capo)" : ""}${isSelected ? " (selected)" : ""}`}
                      aria-pressed={isSelected}
                      className={[
                        swatchBtnBaseClass,
                        isSelected
                          ? capoSwatchSelectedClass
                          : capoSwatchUnselectedClass,
                      ].join(" ")}
                    >
                      {fret}
                    </button>
                  );
                })}
              </div>

              {/* ── Divider ───────────────────────────────────────────────────── */}
              <span
                className="w-px h-5 bg-brand-brown/20 dark:bg-brand-tan/20 shrink-0"
                aria-hidden="true"
              />

              {/* ── CAGED shape picker ───────────────────────────────────────── */}
              {/*
                Functional performer aid: clicking a CAGED shape auto-sets the
                capo to the lowest fret (0–7) that makes that open shape sound
                like the current displayKey. Shapes requiring capo > 7 are
                disabled (greyed out). Pressing the active shape deselects it
                and resets capo to 0.
              */}
              <span className={pickerLabelClass}>CAGED</span>

              <div
                className="flex items-center gap-1.5 flex-wrap"
                role="group"
                aria-label="CAGED shape selector"
              >
                {CAGED_SHAPES.map((shape) => {
                  const capoFret = getSemitoneOffset(
                    CAGED_SHAPE_ROOTS[shape],
                    displayKey
                  );
                  const isDisabled = capoFret > 7;
                  const isSelected = cagedShape === shape;
                  return (
                    <button
                      key={shape}
                      type="button"
                      disabled={isDisabled}
                      onClick={
                        isDisabled
                          ? undefined
                          : () => {
                              if (isSelected) {
                                setCAGEDShape(null);
                                setCapoOffset(0);
                              } else {
                                setCAGEDShape(shape);
                                setCapoOffset(capoFret);
                              }
                            }
                      }
                      aria-label={`CAGED shape ${shape}${isDisabled ? " (not available in current key)" : ""}${isSelected ? " (selected)" : ""}`}
                      aria-pressed={isDisabled ? undefined : isSelected}
                      aria-disabled={isDisabled ? true : undefined}
                      className={[
                        swatchBtnBaseClass,
                        isDisabled
                          ? capoSwatchDisabledClass
                          : isSelected
                            ? capoSwatchSelectedClass
                            : capoSwatchUnselectedClass,
                      ].join(" ")}
                    >
                      {shape}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Chord sheet ────────────────────────────────────────────────────── */}
        <div
          ref={sheetRef}
          className={chordDisplayClass}
          aria-label="Chord sheet"
        >
          {(() => {
            return processedLines.map((line, lineIndex) => {
              if (line.type === "blank") {
                return (
                  <div key={lineIndex} className="h-4" aria-hidden="true" />
                );
              }

              if (line.type === "header") {
                return (
                  <span
                    key={lineIndex}
                    id={
                      sectionIdPrefix
                        ? `section-${sectionIdPrefix}-${lineIndex}`
                        : undefined
                    }
                    className="section-title"
                  >
                    {line.raw}
                  </span>
                );
              }

              if (line.type === "lyric") {
                return (
                  <div
                    key={lineIndex}
                    className="text-brand-espresso dark:text-brand-cream leading-snug"
                  >
                    {line.raw}
                  </div>
                );
              }

              // type === 'chord' — omit entire row when chords are hidden
              if (chordsHidden) {
                return null;
              }

              return (
                <div key={lineIndex} className="chord-row leading-snug">
                  {line.tokens.map((token, tokenIndex) => {
                    if (token.isChord && token.originalChord !== null) {
                      return (
                        <span
                          key={tokenIndex}
                          className="chord-item"
                          data-original-chord={token.originalChord}
                        >
                          {token.text}
                        </span>
                      );
                    }
                    // Non-chord token (lyric text on a chord line, or whitespace padding)
                    return (
                      <span
                        key={tokenIndex}
                        className="text-brand-espresso dark:text-brand-cream"
                      >
                        {token.text}
                      </span>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* ── Bottom spacer — prevents toolbar from obscuring chord content (AC 20) */}
        {autoScroll.isActive && (
          <div className="h-24 w-full" aria-hidden="true" />
        )}
      </div>
    </>
  );
}
