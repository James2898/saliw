import { useState, useCallback } from 'react'
import { NOTES, getSemitoneOffset } from '@/utils/musicLogic'

/**
 * Return type for the useTranspose hook.
 */
export type UseTransposeReturn = {
  /** Current semitone offset relative to the original key (always 0 on mount). */
  semitoneOffset: number
  /** The key name at the current offset (derived from originalKey + semitoneOffset). */
  displayKey: string
  /** Increment semitone offset by 1 (wraps at +11). */
  increment: () => void
  /** Decrement semitone offset by 1 (wraps at -11). */
  decrement: () => void
  /**
   * Jump directly to a target key string from the NOTES array.
   * Computes offset via getSemitoneOffset(originalKey, targetKey).
   */
  setTargetKey: (key: string) => void
  /** Reset semitone offset to 0 (back to original key). */
  reset: () => void
}

/**
 * Manages live transposition state for a chord sheet.
 *
 * - Always initializes at semitoneOffset = 0 (originalKey).
 * - `displayKey` is derived from originalKey + semitoneOffset — never stored as a
 *   separate string to avoid drift.
 * - All offsets are relative to originalKey, never accumulated across prior states.
 *
 * @param originalKey - The song's stored key (e.g. "G"), from the `original_key` DB column.
 * @returns UseTransposeReturn
 */
export function useTranspose(originalKey: string): UseTransposeReturn {
  const [semitoneOffset, setSemitoneOffset] = useState<number>(0)

  // Derive the display key from the chromatic index.
  // NOTES has 12 entries (indices 0–11). We resolve the originalKey's index
  // by using getSemitoneOffset(originalKey, 'C') to get its distance from C,
  // then add semitoneOffset. A simpler direct lookup:
  const originalIndex = (NOTES as string[]).indexOf(originalKey)
  // Fall back to 0 (C) if originalKey is an enharmonic not in NOTES (e.g. "Ab").
  // getSemitoneOffset handles enharmonics internally; we replicate that here.
  const resolvedOriginalIndex =
    originalIndex !== -1
      ? originalIndex
      : (12 - getSemitoneOffset(originalKey, NOTES[0])) % 12

  const displayIndex = (resolvedOriginalIndex + semitoneOffset + 12) % 12
  const displayKey = NOTES[displayIndex]

  const increment = useCallback(() => {
    setSemitoneOffset((prev) => (prev + 1) % 12)
  }, [])

  const decrement = useCallback(() => {
    setSemitoneOffset((prev) => (prev - 1 + 12) % 12)
  }, [])

  const setTargetKey = useCallback(
    (key: string) => {
      const offset = getSemitoneOffset(originalKey, key)
      setSemitoneOffset(offset)
    },
    [originalKey],
  )

  const reset = useCallback(() => {
    setSemitoneOffset(0)
  }, [])

  return {
    semitoneOffset,
    displayKey,
    increment,
    decrement,
    setTargetKey,
    reset,
  }
}
