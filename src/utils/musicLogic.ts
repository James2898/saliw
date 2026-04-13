/**
 * musicLogic.ts — Shared musical utility functions and constants.
 *
 * All chord transposition logic must use these exports.
 * Do NOT define chordRegex or shiftChord inline in components.
 * See docs/coding-guidelines.md — Musical Integrity section.
 */

/**
 * The 12-note chromatic scale used for all transposition calculations.
 * Semitone offsets are calculated as array indices (0 = C, 11 = B).
 */
export const NOTES: readonly string[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "Bb",
  "B",
] as const;

/**
 * Shared chord detection regex.
 * Matches standard chord notation including:
 * - Root notes (A–G with optional # or b)
 * - Chord qualities (m, maj, dim, aug, sus, add, 7, 9, 11, 13, etc.)
 * - Slash chords (e.g., G/B, Am/E)
 *
 * TODO: Replace stub with full production regex extracted from SongView.
 * Reference: src/pages/SongView/index.tsx (Vite version) — lines 29–30.
 */
export const chordRegex: RegExp =
  /\b([A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7-5|7-9|7#5|7#9|7\+5|7\+9|7b5|7b9|9-5|9-9|9#5|9#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?(\/[A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7-5|7-9|7#5|7#9|7\+5|7\+9|7b5|7b9|9-5|9-9|9#5|9#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?)?)(?=\s|$|\)|-|\n)/g;

/**
 * Shifts a chord root (and optional slash bass note) by the given semitone offset.
 *
 * Rules:
 * - semitoneOffset = performanceKey index − originalKey index (mod 12)
 * - Always calculate offset relative to original_key, NEVER relative to a prior transposition state.
 * - Output uses the canonical NOTES array (sharps preferred, except Bb).
 *
 * @param chord - A single chord token, e.g. "Am", "G/B", "C#maj7"
 * @param semitones - Number of semitones to transpose (negative = down, positive = up)
 * @returns The transposed chord string
 */
export function shiftChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  return chord.replace(/[A-G][b#]?/g, (match) => {
    let idx = (NOTES as string[]).indexOf(match);

    // Normalize enharmonic equivalents to chromatic scale index
    if (idx === -1) {
      const enharmonics: Record<string, number> = {
        Ab: 8,
        Bb: 10,
        Cb: 11,
        Db: 1,
        Eb: 3,
        Fb: 4,
        Gb: 6,
      };
      idx = enharmonics[match] ?? 0;
    }

    let newIdx = (idx + semitones) % 12;
    while (newIdx < 0) newIdx += 12;

    return NOTES[newIdx];
  });
}

/**
 * Calculates the semitone offset between two keys.
 * Use this to derive the transposition amount from originalKey → performanceKey.
 *
 * @param originalKey - The song's stored key (e.g., "G")
 * @param performanceKey - The desired performance key (e.g., "A")
 * @returns Semitone offset (0–11)
 */
export function getSemitoneOffset(
  originalKey: string,
  performanceKey: string,
): number {
  const fromIdx = (NOTES as string[]).indexOf(originalKey);
  const toIdx = (NOTES as string[]).indexOf(performanceKey);
  if (fromIdx === -1 || toIdx === -1) return 0;
  return (toIdx - fromIdx + 12) % 12;
}
