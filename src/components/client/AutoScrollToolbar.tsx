'use client'

import type { UseAutoScrollReturn } from '@/hooks/useAutoScroll'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutoScrollToolbarProps {
  /** The full return value of useAutoScroll, passed from the parent viewer. */
  scroll: UseAutoScrollReturn
}

// ── Module-level CSS class constants (avoids per-render string allocations) ────

/**
 * Outer fixed container — bottom-right corner, always visible (AC 1).
 * z-50 keeps it above content; exceeds ServiceNavigator z-40.
 */
const containerClass = [
  'fixed bottom-6 right-6 z-50',
  'flex flex-col items-end gap-2',
  'font-sans',
].join(' ')

/**
 * The panel that wraps both the toggle button and expanded controls.
 * CSS-variable arbitrary values auto-switch in dark mode; no dark: pair needed (AC 21).
 */
const panelClass = [
  'rounded-2xl shadow-lg',
  'bg-[var(--brand-espresso)]',
  'text-[var(--brand-cream)]',
  'border border-[var(--brand-tan)]/30',
  'overflow-hidden',
].join(' ')

/**
 * The main toggle button — always clickable (AC 1–4).
 */
const mainToggleBtnClass = [
  'flex items-center gap-2 px-4 py-2.5',
  'text-xs font-semibold uppercase tracking-widest',
  'text-[var(--brand-cream)]',
  'hover:bg-[var(--brand-tan)]/20',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
  'focus-visible:ring-[var(--brand-tan)]',
  'transition-colors duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

const activeDotClass = 'w-2 h-2 rounded-full bg-[var(--brand-tan)] animate-pulse shrink-0'
const inactiveDotClass = 'w-2 h-2 rounded-full bg-[var(--brand-cream)]/40 shrink-0'

const dividerClass = 'w-full h-px bg-[var(--brand-tan)]/20'

const controlPanelClass = 'flex flex-col gap-3 px-4 pb-4 pt-3 min-w-[180px]'

/**
 * Scroll state button (Pause / Resume) — brand-tan background (AC 21).
 * text-[var(--brand-espresso)] on bg-[var(--brand-tan)] meets WCAG AA (AC 22).
 */
const scrollStateBtnClass = [
  'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg',
  'text-xs font-semibold',
  'bg-[var(--brand-tan)] text-[var(--brand-espresso)]',
  'hover:opacity-90',
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-[var(--brand-cream)]',
  'transition-opacity duration-200',
].join(' ')

const speedLabelClass = [
  'flex items-center justify-between',
  'text-xs font-semibold uppercase tracking-widest',
  'text-[var(--brand-cream)]/70',
].join(' ')

const sliderClass = [
  'w-full h-1 rounded-full appearance-none cursor-pointer',
  'accent-[var(--brand-tan)]',
].join(' ')

// ── AutoScrollToolbar ─────────────────────────────────────────────────────────

/**
 * AutoScrollToolbar — Fixed bottom-right auto-scroll control.
 *
 * Receives the full return of `useAutoScroll` from the parent viewer component.
 * This allows the parent to read `isActive` for the AC-20 bottom-padding rule.
 *
 * AC 1: Always visible, fixed bottom-right.
 * AC 4: Disabled + "Nothing to scroll" hint when cannotScroll is true.
 * AC 5: Expanded panel only visible while isActive.
 * AC 6–8: Speed slider + single cycling Pause/Resume button.
 * AC 21–23: CSS-variable colors; brand-espresso bg, brand-cream text, brand-tan accent.
 * AC 25: Client Component only — no Supabase calls.
 */
export default function AutoScrollToolbar({ scroll }: AutoScrollToolbarProps) {
  const { isActive, isScrolling, isPaused, cannotScroll, speed, toggle, pause, resume, setSpeed } =
    scroll

  return (
    <div className={containerClass} role="region" aria-label="Auto-scroll controls">
      <div className={panelClass}>
        {/* ── Expanded control panel — visible only while active (AC 5) ─────── */}
        {isActive && (
          <>
            <div className={controlPanelClass}>
              {/* ── Speed slider (AC 9–13) ─────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <div className={speedLabelClass}>
                  <label htmlFor="autoscroll-speed-slider">Speed</label>
                  <span className="font-mono text-[var(--brand-cream)]">{speed}</span>
                </div>
                <input
                  id="autoscroll-speed-slider"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label={`Scroll speed ${speed} of 10`}
                  className={sliderClass}
                />
                <div
                  className="flex justify-between select-none"
                  style={{ fontSize: '10px', color: 'color-mix(in srgb, var(--brand-cream) 40%, transparent)' }}
                  aria-hidden="true"
                >
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* ── Scroll state button: Pause / Resume (AC 7–8) ───────────── */}
              <button
                type="button"
                onClick={isScrolling ? pause : resume}
                aria-pressed={isPaused}
                aria-label={isScrolling ? 'Pause auto-scroll' : 'Resume auto-scroll'}
                className={scrollStateBtnClass}
              >
                {isScrolling ? (
                  <>
                    {/* Pause icon */}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <rect x="1" y="1" width="3" height="8" rx="1" />
                      <rect x="6" y="1" width="3" height="8" rx="1" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    {/* Play/resume icon */}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                    </svg>
                    Resume
                  </>
                )}
              </button>
            </div>

            {/* Divider between control panel and main toggle */}
            <div className={dividerClass} aria-hidden="true" />
          </>
        )}

        {/* ── Main toolbar toggle (AC 1–4) ──────────────────────────────────── */}
        <button
          type="button"
          onClick={toggle}
          disabled={cannotScroll}
          aria-pressed={isActive}
          aria-label={
            cannotScroll
              ? 'Auto-scroll disabled — nothing to scroll'
              : isActive
              ? 'Auto-scroll on — click to stop'
              : 'Auto-scroll off — click to start'
          }
          title={cannotScroll ? 'Nothing to scroll' : undefined}
          className={mainToggleBtnClass}
        >
          {/* Status dot */}
          <span className={isActive ? activeDotClass : inactiveDotClass} aria-hidden="true" />

          {/* Label (AC 1: "Auto-scroll off" / "Auto-scroll on") */}
          <span>
            {cannotScroll
              ? 'Nothing to scroll'
              : isActive
              ? 'Auto-scroll on'
              : 'Auto-scroll off'}
          </span>

          {/* Downward scroll arrow icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={isActive && isScrolling ? 'animate-bounce' : ''}
          >
            <path d="M6 2v8M3 7l3 3 3-3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
