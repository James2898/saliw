"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFontSizeReturn } from "@/hooks/useFontSize";
import type { UseChordFontSizeReturn } from "@/hooks/useChordFontSize";
import type {
  UseChordColorReturn,
  ChordBgPreset,
  ChordColorPreset,
} from "@/hooks/useChordColor";
import { CHORD_BG_PRESETS, CHORD_COLOR_PRESETS } from "@/hooks/useChordColor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SetlistSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref for the gear button — focus returns here on modal close. */
  gearButtonRef: React.RefObject<HTMLButtonElement | null>;
  /** Lyric font size controls (lifted from ChordSheetClient). */
  fontSizeControls: UseFontSizeReturn;
  /** Chord-specific font size controls. */
  chordFontSizeControls: UseChordFontSizeReturn;
  /** Chord color/background controls. */
  chordColorControls: UseChordColorReturn;
}

type TabId = "font" | "chords";

// ── Module-level CSS class constants ──────────────────────────────────────────

const backdropClass =
  "fixed inset-0 z-[80] bg-[var(--brand-espresso)]/40 backdrop-blur-sm";

const panelClass = [
  "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "w-[min(90vw,28rem)]",
  "max-h-[80vh]",
  "bg-[var(--brand-background)]",
  "border border-[var(--brand-tan)]/30",
  "rounded-2xl shadow-lg",
  "flex flex-col",
  "overflow-hidden",
].join(" ");

const headerClass = [
  "flex items-center justify-between",
  "px-6 py-4",
  "border-b border-[var(--brand-tan)]/20",
  "shrink-0",
].join(" ");

const titleClass = [
  "font-sans font-bold text-base",
  "text-[var(--brand-espresso)]",
  "dark:text-[var(--brand-cream)]",
].join(" ");

const closeButtonClass = [
  "flex items-center justify-center w-7 h-7 rounded-lg",
  "text-[var(--brand-brown)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const tabListClass = [
  "flex gap-1 px-6 pt-3 pb-0",
  "border-b border-[var(--brand-tan)]/20",
  "shrink-0",
].join(" ");

const tabActiveClass = [
  "px-4 py-2 rounded-t-lg text-sm font-semibold",
  "text-[var(--brand-espresso)] dark:text-[var(--brand-cream)]",
  "border border-b-0 border-[var(--brand-tan)]/30",
  "bg-[var(--brand-background)]",
  "-mb-px",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const tabInactiveClass = [
  "px-4 py-2 rounded-t-lg text-sm font-semibold",
  "text-[var(--brand-brown)]",
  "hover:text-[var(--brand-espresso)] dark:hover:text-[var(--brand-cream)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const bodyClass = "flex-1 overflow-y-auto px-6 py-5 min-h-0";

const ctrlBtnClass = [
  "flex items-center justify-center rounded-lg shrink-0 w-8 h-8",
  "font-mono font-bold text-sm",
  "text-brand-espresso dark:text-brand-cream",
  "bg-brand-cream dark:bg-brand-espresso",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-3";

// ── SetlistSettingsModal ──────────────────────────────────────────────────────

/**
 * SetlistSettingsModal — Two-tab settings panel for the setlist viewer.
 *
 * Font tab: lyric font size + chord font size controls.
 * Chords tab: chord background color and font color preset swatches.
 *
 * All settings are live-preview (no Save button). Preferences persist in localStorage.
 *
 * AC-23: role="dialog", aria-modal="true", aria-labelledby.
 * AC-24: Focus trap (Tab/Shift+Tab).
 * AC-25: Focus moves to close button on open (BUG-007: handlers declared above useEffect).
 * AC-4: Dismisses on Escape, backdrop click, or close button.
 * BUG-001: All localStorage reads use lazy useState initializer (handled in consumer hooks).
 * BUG-007: All callbacks declared before useEffects that reference them.
 */
export default function SetlistSettingsModal({
  isOpen,
  onClose,
  gearButtonRef,
  fontSizeControls,
  chordFontSizeControls,
  chordColorControls,
}: SetlistSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("font");

  // ── Refs ───────────────────────────────────────────────────────────────────

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Helpers — declared BEFORE useEffects (BUG-007) ────────────────────────

  /** Close modal and return focus to the gear button. */
  const handleClose = useCallback(() => {
    onClose();
    gearButtonRef.current?.focus();
  }, [onClose, gearButtonRef]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Move focus to close button when modal opens (AC-25).
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Escape key dismiss + Tab focus trap (AC-4, AC-24).
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusableSelectors = [
          "button:not([disabled])",
          '[role="tab"]',
        ].join(", ");
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // ── Derived ────────────────────────────────────────────────────────────────

  const { fontSize, increase, decrease, reset } = fontSizeControls;
  const {
    chordFontSize,
    increaseChordFont,
    decreaseChordFont,
    resetChordFont,
  } = chordFontSizeControls;
  const { chordBg, chordColor, setChordBg, setChordColor } = chordColorControls;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (AC-4b) */}
      <div className={backdropClass} aria-hidden="true" onClick={handleClose} />

      {/* Dialog panel (AC-23) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className={panelClass}
      >
        {/* Header */}
        <div className={headerClass}>
          <h2 id="settings-modal-title" className={titleClass}>
            Display Settings
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close display settings"
            className={closeButtonClass}
          >
            {/* X icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Tab strip (AC-23: ARIA role="tablist"/tab/tabpanel) */}
        <div role="tablist" aria-label="Settings tabs" className={tabListClass}>
          <button
            role="tab"
            type="button"
            id="settings-tab-font"
            aria-selected={activeTab === "font"}
            aria-controls="settings-panel-font"
            onClick={() => setActiveTab("font")}
            className={activeTab === "font" ? tabActiveClass : tabInactiveClass}
          >
            Font
          </button>
          <button
            role="tab"
            type="button"
            id="settings-tab-chords"
            aria-selected={activeTab === "chords"}
            aria-controls="settings-panel-chords"
            onClick={() => setActiveTab("chords")}
            className={
              activeTab === "chords" ? tabActiveClass : tabInactiveClass
            }
          >
            Chords
          </button>
        </div>

        {/* Tab panels */}
        <div className={bodyClass}>
          {/* Font tab */}
          <div
            role="tabpanel"
            id="settings-panel-font"
            aria-labelledby="settings-tab-font"
            hidden={activeTab !== "font"}
          >
            {/* Lyric font size */}
            <div className="mb-6">
              <p className={sectionLabelClass}>Lyric Size</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrease}
                  aria-label="Decrease lyric font size"
                  disabled={fontSize <= 12}
                  className={ctrlBtnClass}
                >
                  A−
                </button>
                <button
                  type="button"
                  onClick={reset}
                  aria-label={`Lyric font size ${fontSize}px — click to reset`}
                  title="Click to reset lyric font size"
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
                <button
                  type="button"
                  onClick={increase}
                  aria-label="Increase lyric font size"
                  disabled={fontSize >= 48}
                  className={ctrlBtnClass}
                >
                  A+
                </button>
                <span className="text-xs text-brand-brown/60 dark:text-brand-tan/60 ml-1">
                  12–48px
                </span>
              </div>
            </div>

            {/* Chord font size */}
            <div>
              <p className={sectionLabelClass}>Chord Size</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decreaseChordFont}
                  aria-label="Decrease chord font size"
                  disabled={chordFontSize <= 12}
                  className={ctrlBtnClass}
                >
                  A−
                </button>
                <button
                  type="button"
                  onClick={resetChordFont}
                  aria-label={`Chord font size ${chordFontSize}px — click to reset`}
                  title="Click to reset chord font size"
                  className={[
                    "px-2 py-1 rounded-lg shrink-0",
                    "text-xs font-mono font-bold",
                    "text-brand-espresso dark:text-brand-cream",
                    "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                    "transition-colors duration-200",
                  ].join(" ")}
                >
                  {chordFontSize}px
                </button>
                <button
                  type="button"
                  onClick={increaseChordFont}
                  aria-label="Increase chord font size"
                  disabled={chordFontSize >= 48}
                  className={ctrlBtnClass}
                >
                  A+
                </button>
                <span className="text-xs text-brand-brown/60 dark:text-brand-tan/60 ml-1">
                  12–48px
                </span>
              </div>
            </div>
          </div>

          {/* Chords tab */}
          <div
            role="tabpanel"
            id="settings-panel-chords"
            aria-labelledby="settings-tab-chords"
            hidden={activeTab !== "chords"}
          >
            {/* Chord background presets (AC-12) */}
            <div className="mb-6">
              <p className={sectionLabelClass}>Chord Background</p>
              <div className="flex flex-wrap gap-2">
                {CHORD_BG_PRESETS.map((preset) => {
                  const isSelected = chordBg === preset.value;
                  const isTransparent = preset.value === "transparent";
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setChordBg(preset.value as ChordBgPreset)}
                      aria-label={`Chord background: ${preset.label}${isSelected ? " (selected)" : ""}`}
                      aria-pressed={isSelected}
                      title={preset.label}
                      className={[
                        "relative flex items-center justify-center",
                        "w-9 h-9 rounded-lg shrink-0",
                        "border-2 transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
                        isSelected
                          ? "border-brand-espresso dark:border-brand-tan shadow-md"
                          : "border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown/50 dark:hover:border-brand-tan/50",
                      ].join(" ")}
                      style={
                        isTransparent
                          ? undefined
                          : { backgroundColor: preset.value }
                      }
                    >
                      {/* Transparent swatch — checkerboard pattern via CSS */}
                      {isTransparent && (
                        <span
                          className="w-full h-full rounded-md overflow-hidden"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "8px 8px",
                            backgroundPosition:
                              "0 0, 0 4px, 4px -4px, -4px 0px",
                          }}
                          aria-hidden="true"
                        />
                      )}
                      {/* Selected checkmark */}
                      {isSelected && (
                        <svg
                          className={[
                            "absolute w-4 h-4",
                            isTransparent
                              ? "text-brand-espresso dark:text-brand-espresso"
                              : preset.value === "#3D1F0D" ||
                                  preset.value === "#8B6347"
                                ? "text-white"
                                : "text-brand-espresso dark:text-brand-espresso",
                          ].join(" ")}
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l4 4 6-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-brand-brown/60 dark:text-brand-tan/60">
                {CHORD_BG_PRESETS.find((p) => p.value === chordBg)?.label ??
                  "No background"}
              </p>
            </div>

            {/* Chord font color presets (AC-13) */}
            <div>
              <p className={sectionLabelClass}>Chord Color</p>
              <div className="flex flex-wrap gap-2">
                {CHORD_COLOR_PRESETS.map((preset) => {
                  const isSelected = chordColor === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setChordColor(preset.value as ChordColorPreset)
                      }
                      aria-label={`Chord color: ${preset.label}${isSelected ? " (selected)" : ""}`}
                      aria-pressed={isSelected}
                      title={preset.label}
                      className={[
                        "relative flex items-center justify-center",
                        "w-9 h-9 rounded-lg shrink-0",
                        "border-2 transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
                        isSelected
                          ? "border-brand-espresso dark:border-brand-tan shadow-md"
                          : "border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown/50 dark:hover:border-brand-tan/50",
                      ].join(" ")}
                      style={{ backgroundColor: preset.value }}
                    >
                      {/* Selected checkmark — invert color for visibility on dark/light swatches */}
                      {isSelected && (
                        <svg
                          className={[
                            "absolute w-4 h-4",
                            preset.value === "#FFFFFF" ||
                            preset.value === "#C0392B"
                              ? "text-brand-espresso dark:text-brand-espresso"
                              : "text-white",
                          ].join(" ")}
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l4 4 6-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-brand-brown/60 dark:text-brand-tan/60">
                {CHORD_COLOR_PRESETS.find((p) => p.value === chordColor)
                  ?.label ?? "Custom"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
