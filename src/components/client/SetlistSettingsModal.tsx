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
import type { UseSetlistLayoutReturn } from "@/hooks/useSetlistLayout";

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
  /** Setlist display layout controls (line spacing, width, page mode, columns, overflow). */
  layoutControls?: UseSetlistLayoutReturn;
}

type TabId = "font" | "chords" | "layout";

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
  layoutControls,
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
          {layoutControls && (
            <button
              role="tab"
              type="button"
              id="settings-tab-layout"
              aria-selected={activeTab === "layout"}
              aria-controls="settings-panel-layout"
              onClick={() => setActiveTab("layout")}
              className={
                activeTab === "layout" ? tabActiveClass : tabInactiveClass
              }
            >
              Layout
            </button>
          )}
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

          {/* Layout tab (AC-1–6, AC-14, AC-18) */}
          {layoutControls && (
            <div
              role="tabpanel"
              id="settings-panel-layout"
              aria-labelledby="settings-tab-layout"
              hidden={activeTab !== "layout"}
            >
              {/* Line Spacing stepper (AC-2, AC-3, AC-4) */}
              <div className="mb-6">
                <p className={sectionLabelClass}>Line Spacing</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={layoutControls.decreaseLineHeight}
                    aria-label="Decrease line spacing"
                    disabled={layoutControls.lineHeight <= 1.2}
                    className={[
                      ctrlBtnClass,
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={layoutControls.resetLineHeight}
                    aria-label={`Line spacing ${layoutControls.lineHeight.toFixed(1)} — click to reset`}
                    title="Click to reset line spacing to 1.8"
                    className={[
                      "px-2 py-1 rounded-lg shrink-0",
                      "text-xs font-mono font-bold",
                      "text-brand-espresso dark:text-brand-cream",
                      "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                      "transition-colors duration-200",
                    ].join(" ")}
                  >
                    {layoutControls.lineHeight.toFixed(1)}
                  </button>
                  <button
                    type="button"
                    onClick={layoutControls.increaseLineHeight}
                    aria-label="Increase line spacing"
                    disabled={layoutControls.lineHeight >= 2.4}
                    className={[
                      ctrlBtnClass,
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    +
                  </button>
                  <span className="text-xs text-brand-brown/60 dark:text-brand-tan/60 ml-1">
                    1.2–2.4 (default 1.8)
                  </span>
                </div>
              </div>

              {/* Content Width toggle (AC-5) */}
              <div className="mb-6">
                <p className={sectionLabelClass}>Content Width</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => layoutControls.setContentWidth("centered")}
                    aria-pressed={layoutControls.contentWidth === "centered"}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                      layoutControls.contentWidth === "centered"
                        ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan shadow-sm"
                        : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                    ].join(" ")}
                  >
                    Centered (3xl)
                  </button>
                  <button
                    type="button"
                    onClick={() => layoutControls.setContentWidth("full")}
                    aria-pressed={layoutControls.contentWidth === "full"}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                      layoutControls.contentWidth === "full"
                        ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan shadow-sm"
                        : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                    ].join(" ")}
                  >
                    Full Width
                  </button>
                </div>
                {layoutControls.pageColumns > 1 && layoutControls.layoutMode === "page" && (
                  <p className="mt-1.5 text-xs text-brand-brown/60 dark:text-brand-tan/60">
                    Multi-column view automatically expands to full width.
                  </p>
                )}
              </div>

              {/* Layout Mode (Continuous vs Page View) (AC-6, AC-7, AC-8) */}
              <div className="mb-6">
                <p className={sectionLabelClass}>Display Mode</p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => layoutControls.setLayoutMode("scroll")}
                      aria-pressed={layoutControls.layoutMode === "scroll"}
                      className={[
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                        layoutControls.layoutMode === "scroll"
                          ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan shadow-sm"
                          : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                      ].join(" ")}
                    >
                      Continuous Scroll
                    </button>
                    <button
                      type="button"
                      onClick={() => layoutControls.setLayoutMode("page")}
                      aria-pressed={layoutControls.layoutMode === "page"}
                      className={[
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                        layoutControls.layoutMode === "page"
                          ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan shadow-sm"
                          : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                      ].join(" ")}
                    >
                      Page View (1 Song / Screen)
                    </button>
                  </div>

                  {/* Columns selector when Page View is active */}
                  {layoutControls.layoutMode === "page" && (
                    <div className="pt-2 pl-1 border-t border-brand-brown/15 dark:border-brand-tan/15">
                      <p className="text-xs font-medium text-brand-brown dark:text-brand-tan mb-2">
                        Columns (Side-by-side):
                      </p>
                      <div className="flex items-center gap-2">
                        {([1, 2, 3] as const).map((cols) => {
                          const isSelected = layoutControls.pageColumns === cols;
                          return (
                            <button
                              key={cols}
                              type="button"
                              onClick={() => layoutControls.setPageColumns(cols)}
                              aria-pressed={isSelected}
                              className={[
                                "px-3 py-1 rounded-lg text-xs font-semibold border transition-colors duration-200",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                                isSelected
                                  ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan shadow-sm"
                                  : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                              ].join(" ")}
                            >
                              {cols} {cols === 1 ? "Column" : "Columns"}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-xs text-brand-brown/60 dark:text-brand-tan/60">
                        {layoutControls.pageColumns === 3
                          ? "Default: 3 cols on ≥1280px screen; collapses to 2 on 1024–1279px, 1 on <1024px."
                          : layoutControls.pageColumns === 2
                            ? "Default: 2 cols on ≥1024px screen; collapses to 1 on <1024px."
                            : "Default: 1 column single page."}
                      </p>
                      <p className="text-xs text-brand-brown/50 dark:text-brand-tan/50 mt-1">
                        You can also customize columns per song directly in Page View.
                      </p>
                      {Object.keys(layoutControls.songColumnOverrides).length > 0 && (
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-brand-brown/10 dark:border-brand-tan/10">
                          <span className="text-xs text-brand-brown/70 dark:text-brand-tan/70">
                            {Object.keys(layoutControls.songColumnOverrides).length} song(s) have custom columns
                          </span>
                          <button
                            type="button"
                            onClick={layoutControls.clearAllSongColumns}
                            className="text-xs text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream underline cursor-pointer"
                          >
                            Reset per-song columns
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Long Song Overflow & Fit Song to Screen (AC-13, AC-14) */}
              {layoutControls.layoutMode === "page" && (
                <div className="mb-2">
                  <p className={sectionLabelClass}>Long Song Overflow</p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutControls.overflowBehavior === "fit"}
                        onChange={(e) =>
                          layoutControls.setOverflowBehavior(
                            e.target.checked ? "fit" : "paginate"
                          )
                        }
                        className="rounded border-brand-brown/40 dark:border-brand-tan/40 text-brand-espresso focus:ring-brand-espresso dark:focus:ring-brand-tan w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-brand-espresso dark:text-brand-cream">
                        Fit song to screen (auto-scale)
                      </span>
                    </label>
                    <p className="text-xs text-brand-brown/60 dark:text-brand-tan/60">
                      {layoutControls.overflowBehavior === "fit"
                        ? "Scales chord sheet font size down dynamically to fit more content on screen while paginating any remaining overflow."
                        : "Paginate overflow across screens (advance through sub-pages via Space/Arrows)."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
