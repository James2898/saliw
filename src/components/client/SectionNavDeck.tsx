"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UseAutoScrollReturn } from "@/hooks/useAutoScroll";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectionTarget {
  /** Stable DOM element id (e.g. "section-{junctionId}-{lineIndex}"). */
  id: string;
  /** Raw label from the chord sheet (e.g. "[Verse 1]"). */
  label: string;
  /** Short badge abbreviation (e.g. "V1", "CH", "BR"). */
  badge: string;
  /** Full accessible label (e.g. "Verse 1"). */
  ariaLabel: string;
}

interface SectionNavDeckProps {
  /** Derived list of section targets — empty means no deck rendered. */
  sections: SectionTarget[];
  /**
   * Shared auto-scroll instance from SetlistViewerClient.
   * BUG-014: never call useAutoScroll() here; receive the shared instance as a prop.
   */
  autoScroll: UseAutoScrollReturn | null;
  /**
   * Whether the chord drawer is currently open.
   * On desktop, the deck shifts its `right` offset to avoid overlapping the drawer.
   * Defaults to false when chord drawer is not present in the current view.
   */
  isDrawerOpen?: boolean;
  /**
   * Whether the song viewer is in edit mode.
   * AC-14: do not render the Deck when edit mode is active.
   */
  isEditMode?: boolean;
}

// ── Module-scope constants (AC-18: static data at module scope, not inline) ──

/**
 * Maps normalized section type names to badge abbreviations.
 * Includes explicit numbering for "verse"-type sections (handled separately).
 * Keys are lowercased for case-insensitive matching.
 */
const SECTION_MAP: Readonly<Record<string, string>> = {
  intro: "IN",
  verse: "V",
  "pre-chorus": "PC",
  prechorus: "PC",
  chorus: "CH",
  bridge: "BR",
  interlude: "IL",
  tag: "TAG",
  coda: "CODA",
  outro: "OUT",
};

/**
 * Section types that are always numbered by occurrence order regardless of
 * whatever number appears in the source label.
 */
const NUMBERED_TYPES = new Set(["verse", "pre-chorus", "prechorus", "chorus"]);

/** Width of the chord drawer in pixels on desktop. Kept in sync with ChordDrawer's layout. */
const DRAWER_OPEN_RIGHT_OFFSET = 24; // px from right when drawer is open — drawer is full-width

/**
 * Right edge offset (px) of the deck when the chord drawer is CLOSED.
 * Accounts for the AutoScrollToolbar FAB at `right-6` (24 px).
 * The deck sits above the FAB on mobile; on desktop it is to the left of the FAB zone.
 */
const DECK_RIGHT_CLOSED = 80; // px — clears the 64px FAB width + 16px gap

/** Z-index for the Section Nav Deck — z-[45] (below ChordDrawer z-60, above ServiceNavigator z-40). */
const DECK_Z_CLASS = "z-[45]";

// ── Module-scope helper functions (BUG-007: declared before hooks) ────────────

/**
 * Strips the surrounding brackets from a raw header label and trims whitespace.
 * Input: "[Verse 1]"  →  Output: "Verse 1"
 */
function stripBrackets(raw: string): string {
  return raw.replace(/^\[|\]$/g, "").trim();
}

/**
 * Derives the normalized type key for SECTION_MAP lookup.
 * Strips trailing numbers/spaces so "[Verse 2]" → "verse".
 */
function normalizeType(label: string): string {
  return label
    .replace(/\s*\d+\s*$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Computes the badge abbreviation for a section label given the occurrence
 * index of that section type (0-based).
 *
 * Examples:
 *   "Verse 1" occurrence 0 → "V1"
 *   "Chorus"  occurrence 0 → "CH"
 *   "Bridge"  occurrence 1 → "BR2"
 *   "Jam"     occurrence 0 → "JAM" (unrecognized — first 3 chars, uppercased)
 */
function computeBadge(label: string, occurrenceIndex: number): string {
  const normalized = normalizeType(label);
  const base = SECTION_MAP[normalized];

  if (!base) {
    // Unrecognized: use first 3 chars uppercased (AC-3)
    const abbrev = label.slice(0, 3).toUpperCase();
    return occurrenceIndex > 0 ? `${abbrev}${occurrenceIndex + 1}` : abbrev;
  }

  // Verse/numbered types always get a number (AC-4)
  // Other types get a number only when they appear more than once.
  if (NUMBERED_TYPES.has(normalized) || occurrenceIndex > 0) {
    return `${base}${occurrenceIndex + 1}`;
  }
  return base;
}

/**
 * Derives the full aria-label for a section from its label and occurrence index.
 * Examples: "Verse 1", "Chorus 2", "Bridge"
 *
 * AC-19 fix: reconstruct from the normalized base name + occurrence index rather
 * than appending to the raw label, which would produce "Verse 1 1" double-numbers.
 */
function computeAriaLabel(label: string, occurrenceIndex: number): string {
  const normalized = normalizeType(label);
  const isNumbered = NUMBERED_TYPES.has(normalized);
  if (!isNumbered) return stripBrackets(label);
  const baseName = normalized
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${baseName} ${occurrenceIndex + 1}`;
}

/**
 * Derives the list of SectionTarget objects from all songs' processedLines.
 * Each section header emits one entry with a stable DOM id, badge, and aria label.
 * Call this in the parent component (SetlistViewerClient) via useMemo.
 */
export function deriveSections(
  songs: Array<{
    junctionId: string;
    processedLines: Array<{ type: string; raw: string }>;
  }>
): SectionTarget[] {
  const targets: SectionTarget[] = [];
  // Track occurrence count per normalized type across ALL songs in the setlist.
  const occurrenceCounts: Record<string, number> = {};

  for (const song of songs) {
    for (
      let lineIndex = 0;
      lineIndex < song.processedLines.length;
      lineIndex++
    ) {
      const line = song.processedLines[lineIndex];
      if (line.type !== "header") continue;

      const label = stripBrackets(line.raw);
      const normalized = normalizeType(label);
      const occurrenceIndex = occurrenceCounts[normalized] ?? 0;
      occurrenceCounts[normalized] = occurrenceIndex + 1;

      targets.push({
        id: `section-${song.junctionId}-${lineIndex}`,
        label: line.raw,
        badge: computeBadge(label, occurrenceIndex),
        ariaLabel: computeAriaLabel(label, occurrenceIndex),
      });
    }
  }

  return targets;
}

// ── Module-scope CSS class constants (avoids per-render string allocations) ───

/**
 * Desktop deck — fixed right column, vertically centered.
 * CSS-variable arbitrary values auto-switch in dark mode; no explicit dark: pair needed (BUG-004/BUG-021).
 */
const desktopDeckClass = [
  "hidden md:flex flex-col items-center gap-1.5",
  "fixed top-1/2 -translate-y-1/2",
  DECK_Z_CLASS,
  "bg-[var(--brand-espresso)]",
  "text-[var(--brand-cream)]",
  "border border-[var(--brand-tan)]/30",
  "rounded-2xl shadow-lg",
  "py-3 px-2",
  "max-h-[80vh] overflow-y-auto",
].join(" ");

/**
 * Mobile deck — horizontally-scrollable row below sticky navbar.
 * Positioned below top-16 (navbar) using top-16; clear of auto-scroll FAB.
 */
const mobileDeckClass = [
  "md:hidden fixed top-16 left-0 right-0",
  DECK_Z_CLASS,
  "flex flex-row items-center gap-1.5",
  "overflow-x-auto",
  "bg-[var(--brand-espresso)]",
  "border-b border-[var(--brand-tan)]/30",
  "px-3 py-1.5",
  "shadow-sm",
].join(" ");

/** Badge button — base styles shared between active and inactive states. */
const badgeBtnBase = [
  "min-w-[44px] min-h-[44px]",
  "flex items-center justify-center",
  "px-2",
  "rounded-lg",
  "text-xs font-bold font-mono",
  "transition-opacity duration-150",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-[var(--brand-tan)]",
  "focus-visible:ring-offset-1",
  "focus-visible:ring-offset-[var(--brand-espresso)]",
  "shrink-0",
].join(" ");

const badgeActiveClass = `${badgeBtnBase} opacity-100 bg-[var(--brand-tan)] text-[var(--brand-espresso)]`;
const badgeInactiveClass = `${badgeBtnBase} opacity-40 hover:opacity-70 text-[var(--brand-cream)]`;

// ── SectionNavDeck ─────────────────────────────────────────────────────────────

/**
 * SectionNavDeck — One-click section navigator floating deck.
 *
 * Renders a vertical badge column (desktop) or horizontal scrollable row
 * (mobile) that lets stage musicians jump to any section with a single tap.
 *
 * Compliance notes:
 * - BUG-013: pause on onPointerDown, not onClick
 * - BUG-014: autoScroll received as prop, never called useAutoScroll()
 * - BUG-015: settle-detector pattern, not IntersectionObserver, as resume signal
 * - BUG-004/BUG-021: CSS-variable arbitrary values on fixed elements
 * - BUG-002: useCallback deps use whole objects
 * - BUG-007: helpers declared before hooks
 * - AC-16: SSR guard with mounted state
 */
export default function SectionNavDeck({
  sections,
  autoScroll,
  isDrawerOpen = false,
  isEditMode = false,
}: SectionNavDeckProps) {
  // AC-16: SSR safety — render null on server and first hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Active section ID — the section header currently closest to the top of the viewport.
  // AC-22: initialize to null so that when IO is absent (activeSectionId stays null),
  // all badges render at full opacity rather than dimming all-but-first.
  // When IO runs, it sets a real section id and only the matching badge is highlighted.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // rAF id for the settle-detector so we can cancel on unmount or new click.
  const settleRafIdRef = useRef<number | null>(null);

  // Latest autoScroll stored in a ref so the settle-detector closure always
  // reads the current value without re-creating the callback.
  const autoScrollRef = useRef(autoScroll);
  useEffect(() => {
    autoScrollRef.current = autoScroll;
  });

  // Ratios map stored in a ref (not state) to prevent IO reconnection on re-renders.
  const ratiosRef = useRef<Map<string, number>>(new Map());

  // Cleanup: cancel any pending settle detector rAF on unmount.
  useEffect(() => {
    return () => {
      if (settleRafIdRef.current !== null) {
        cancelAnimationFrame(settleRafIdRef.current);
      }
    };
  }, []);

  // ── IntersectionObserver — track which section header is topmost visible ────
  // AC-11: Active section = bottommost header at or above top boundary.
  // AC-20: Observer disconnected in cleanup.
  // AC-22: Fallback if IO unsupported — all badges full opacity (activeSectionId = null).
  useEffect(() => {
    if (!mounted) return;
    if (sections.length < 2) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratiosRef.current.set(entry.target.id, entry.intersectionRatio);
        });

        // Find the section header that is most visible (highest ratio).
        // On tie, prefer the one earlier in the sections array.
        // AC-11: last section stays active at bottom of song.
        let winningId: string | null = null;
        let winningRatio = -1;

        for (const section of sections) {
          const ratio = ratiosRef.current.get(section.id) ?? 0;
          if (ratio > winningRatio) {
            winningRatio = ratio;
            winningId = section.id;
          }
        }

        if (winningId !== null && winningRatio > 0) {
          setActiveSectionId(winningId);
        }
      },
      {
        // Fine-grained thresholds for smooth highlight transitions.
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        // Observe headers relative to root viewport.
        rootMargin: "0px 0px -80% 0px",
      }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [mounted, sections]);

  // ── Settle-detector (BUG-015 pattern from ServiceNavigator.tsx) ─────────────
  // Polls window.scrollY for 3 stable frames before firing resume.
  // Prevents cancelling browser smooth scroll mid-flight.
  const startSettleDetector = useCallback(() => {
    if (settleRafIdRef.current !== null) {
      cancelAnimationFrame(settleRafIdRef.current);
    }
    let lastY = window.scrollY;
    let stableFrames = 0;
    const STABLE_FRAMES = 3;
    const TIMEOUT_MS = 2000;
    const startedAt = performance.now();

    const tick = () => {
      const y = window.scrollY;
      if (y === lastY) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastY = y;
      }
      if (stableFrames >= STABLE_FRAMES) {
        settleRafIdRef.current = null;
        autoScrollRef.current?.resume();
        return;
      }
      if (performance.now() - startedAt > TIMEOUT_MS) {
        // Safety bail-out — fire resume anyway so user isn't stranded paused.
        settleRafIdRef.current = null;
        autoScrollRef.current?.resume();
        return;
      }
      settleRafIdRef.current = requestAnimationFrame(tick);
    };
    settleRafIdRef.current = requestAnimationFrame(tick);
  }, []); // no deps — accesses autoScrollRef which always holds the latest value

  // ── Scroll-to-section handler ────────────────────────────────────────────────
  // AC-8: targetY = el.top + scrollY - navbarHeight
  const handleScrollToSection = useCallback(
    (sectionId: string) => {
      const el = document.getElementById(sectionId);
      if (!el) return; // AC-21: no-op if target missing

      // Measure total sticky header height at scroll time (AC-8).
      // Accounts for: main navbar (top-16 = 64px) + ServiceNavigator song selector bar.
      const navbar =
        document.querySelector<HTMLElement>("[data-navbar]") ??
        document.querySelector<HTMLElement>("nav");
      const navbarHeight = navbar?.offsetHeight ?? 64;
      const songBar = document.querySelector<HTMLElement>(
        '[aria-label="Setlist song navigator"]'
      );
      const songBarHeight = songBar?.offsetHeight ?? 0;

      const targetY =
        el.getBoundingClientRect().top +
        window.scrollY -
        navbarHeight -
        songBarHeight -
        8;

      window.scrollTo({ top: targetY, behavior: "smooth" });

      // BUG-015: use settle-detector, not IO, as resume signal.
      if (autoScrollRef.current?.isActive) {
        startSettleDetector();
      }
    },
    [startSettleDetector]
  );

  // ── Render guard ─────────────────────────────────────────────────────────────

  // AC-16: SSR guard
  if (!mounted) return null;

  // AC-2: minimum threshold — need 2+ sections
  if (sections.length < 2) return null;

  // AC-14: suppressed in edit mode
  if (isEditMode) return null;

  // ── Desktop right offset — account for chord drawer width (AC-6) ─────────────
  // ChordDrawer is `fixed bottom-0 left-0 right-0` — when open, the Deck on
  // desktop must not overlap. We use a generous bottom padding so the vertically-
  // centered deck doesn't drift over the drawer area.
  const desktopStyle: React.CSSProperties = {
    right: isDrawerOpen ? DRAWER_OPEN_RIGHT_OFFSET : DECK_RIGHT_CLOSED,
  };

  // ── Badge button renderer (extracted to avoid BUG-017 inline arrow wrapping) ─

  const renderBadge = (section: SectionTarget) => {
    // AC-22: when activeSectionId is null (IO unsupported), treat all badges as
    // active so they render at full opacity rather than 0.4 dimmed.
    const isActive = activeSectionId === null || section.id === activeSectionId;

    const handlePointerDown = () => {
      // BUG-013: pause on pointerDown so the page is stationary before click fires.
      autoScrollRef.current?.pause();
    };

    const handleClick = () => {
      handleScrollToSection(section.id);
    };

    return (
      <button
        key={section.id}
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        aria-label={section.ariaLabel}
        aria-current={isActive ? "true" : undefined}
        className={isActive ? badgeActiveClass : badgeInactiveClass}
      >
        {section.badge}
      </button>
    );
  };

  return (
    <>
      {/* ── Desktop: fixed right column, vertically centered (AC-6) ──────────── */}
      <div
        className={desktopDeckClass}
        style={desktopStyle}
        role="navigation"
        aria-label="Section navigator"
      >
        {sections.map(renderBadge)}
      </div>

      {/* ── Mobile: horizontally-scrollable row below navbar (AC-7) ──────────── */}
      <div
        className={mobileDeckClass}
        role="navigation"
        aria-label="Section navigator"
      >
        {sections.map(renderBadge)}
      </div>
    </>
  );
}
