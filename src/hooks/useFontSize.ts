import { useState, useCallback } from 'react'

const STORAGE_KEY = 'saliw-font-size'
const MIN_SIZE = 12
const MAX_SIZE = 48
const DEFAULT_SIZE = 16
const STEP = 2

function clamp(value: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, value))
}

/**
 * Return type for the useFontSize hook.
 */
export type UseFontSizeReturn = {
  /** Current font size in pixels. Range: 12–48. Default: 16. */
  fontSize: number
  /** Increase font size by 2px, clamped at 48. Persists to localStorage. */
  increase: () => void
  /** Decrease font size by 2px, clamped at 12. Persists to localStorage. */
  decrease: () => void
  /** Reset font size to 16px. Persists to localStorage. */
  reset: () => void
}

/**
 * Manages the chord sheet font size with localStorage persistence.
 *
 * - Initializes to 16px by default (SSR-safe: localStorage is read on mount only).
 * - Persists changes under the key "saliw-font-size".
 * - All offsets are clamped to [12, 48] — never returns a value outside this range.
 * - Does NOT apply the CSS variable itself; the consumer is responsible for that.
 *
 * @returns UseFontSizeReturn
 */
function readStoredFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_SIZE
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) return clamp(parsed)
    }
  } catch {
    // localStorage unavailable — use default
  }
  return DEFAULT_SIZE
}

export function useFontSize(): UseFontSizeReturn {
  const [fontSize, setFontSize] = useState<number>(readStoredFontSize)

  const persist = useCallback((value: number) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(value))
      }
    } catch {
      // localStorage unavailable — non-fatal
    }
  }, [])

  const increase = useCallback(() => {
    setFontSize((prev) => {
      const next = clamp(prev + STEP)
      persist(next)
      return next
    })
  }, [persist])

  const decrease = useCallback(() => {
    setFontSize((prev) => {
      const next = clamp(prev - STEP)
      persist(next)
      return next
    })
  }, [persist])

  const reset = useCallback(() => {
    setFontSize(DEFAULT_SIZE)
    persist(DEFAULT_SIZE)
  }, [persist])

  return { fontSize, increase, decrease, reset }
}
