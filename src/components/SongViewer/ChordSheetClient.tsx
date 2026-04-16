'use client'

import { useRef, useEffect } from 'react'
import type { ProcessedLine } from '@/utils/musicLogic'
import { NOTES, shiftChord } from '@/utils/musicLogic'
import { useTranspose } from '@/hooks/useTranspose'

interface ChordSheetClientProps {
  processedLines: ProcessedLine[]
  originalKey: string
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
}: ChordSheetClientProps) {
  const { semitoneOffset, displayKey, increment, decrement, setTargetKey, reset } =
    useTranspose(originalKey)

  const sheetRef = useRef<HTMLDivElement>(null)

  // Apply transposition to all .chord-item spans after mount and on offset changes.
  useEffect(() => {
    const container = sheetRef.current
    if (!container) return

    const spans = container.querySelectorAll<HTMLSpanElement>('.chord-item[data-original-chord]')
    spans.forEach((span) => {
      const original = span.getAttribute('data-original-chord')
      if (original) {
        span.innerText = shiftChord(original, semitoneOffset)
      }
    })
  }, [semitoneOffset])

  return (
    <div>
      {/* ── Transposition control bar ──────────────────────────────────────── */}
      <div
        className={[
          'flex items-center gap-3 flex-wrap mb-6',
          'px-4 py-3 rounded-xl',
          'bg-brand-cream dark:bg-brand-espresso',
          'border border-brand-brown/20 dark:border-brand-tan/20',
        ].join(' ')}
        aria-label="Transposition controls"
      >
        {/* Label */}
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan shrink-0">
          Key
        </span>

        {/* −1 semitone button */}
        <button
          type="button"
          onClick={decrement}
          aria-label="Transpose down one semitone"
          className={[
            'w-8 h-8 flex items-center justify-center rounded-lg shrink-0',
            'font-mono font-bold text-sm',
            'text-brand-espresso dark:text-brand-cream',
            'bg-brand-cream dark:bg-brand-espresso',
            'border border-brand-brown/30 dark:border-brand-tan/30',
            'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
            'transition-colors duration-200',
          ].join(' ')}
        >
          −1
        </button>

        {/* Key selector dropdown */}
        <select
          value={displayKey}
          onChange={(e) => setTargetKey(e.target.value)}
          aria-label="Select target key"
          className={[
            'px-3 py-1.5 rounded-lg',
            'font-mono font-bold text-sm',
            'text-brand-espresso dark:text-brand-cream',
            'bg-brand-cream dark:bg-brand-espresso',
            'border border-brand-tan dark:border-brand-tan/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
            'transition-colors duration-200',
            'cursor-pointer',
          ].join(' ')}
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
          className={[
            'w-8 h-8 flex items-center justify-center rounded-lg shrink-0',
            'font-mono font-bold text-sm',
            'text-brand-espresso dark:text-brand-cream',
            'bg-brand-cream dark:bg-brand-espresso',
            'border border-brand-brown/30 dark:border-brand-tan/30',
            'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
            'transition-colors duration-200',
          ].join(' ')}
        >
          +1
        </button>

        {/* Reset — only show when transposed */}
        {semitoneOffset !== 0 && (
          <button
            type="button"
            onClick={reset}
            aria-label="Reset to original key"
            className={[
              'px-2.5 py-1 rounded-lg shrink-0',
              'text-xs font-semibold',
              'text-brand-brown dark:text-brand-tan',
              'hover:text-brand-espresso dark:hover:text-brand-cream',
              'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
            ].join(' ')}
          >
            Reset
          </button>
        )}

        {/* Original key indicator */}
        <span className="ml-auto text-xs font-medium text-brand-brown dark:text-brand-tan shrink-0">
          Original: {originalKey}
        </span>
      </div>

      {/* ── Chord sheet ────────────────────────────────────────────────────── */}
      <div ref={sheetRef} className="chord-display" aria-label="Chord sheet">
        {processedLines.map((line, lineIndex) => {
          if (line.type === 'blank') {
            return <div key={lineIndex} className="h-4" aria-hidden="true" />
          }

          if (line.type === 'header') {
            return (
              <span key={lineIndex} className="section-title">
                {line.raw}
              </span>
            )
          }

          if (line.type === 'lyric') {
            return (
              <div key={lineIndex} className="text-brand-espresso dark:text-brand-cream leading-snug">
                {line.raw}
              </div>
            )
          }

          // type === 'chord'
          return (
            <div key={lineIndex} className="leading-snug">
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
                  )
                }
                // Non-chord token (lyric text on a chord line, or whitespace padding)
                return (
                  <span key={tokenIndex} className="text-brand-espresso dark:text-brand-cream">
                    {token.text}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
