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
 * - Chord qualities (m, maj, min, dim, aug, sus, add, 7, 9, 11, 13, etc.)
 * - Slash chords (e.g., G/B, Am/E)
 *
 * The pattern is word-boundary anchored at the start and requires a word
 * boundary or end-of-string at the end to avoid matching inside lyric words.
 *
 * Example matches:  C, Am, G/B, D#m7, Csus4, Bbmaj7, F#dim
 * Example non-matches (lyric words): I, A, To, Me, the, in
 */
export const chordRegex: RegExp =
  /\b[A-G][b#]?(m7b5|maj13|maj11|maj9|maj7|maj|min13|min11|min9|min7|min|m13|m11|m9|m7|m|add13|add11|add9|sus4|sus2|sus|dim7|dim|aug7|aug|13|11|9|7|6|5|4|2)?(\/[A-G][b#]?)?(?![a-zA-Z0-9#/])/g;

/**
 * Enharmonic equivalents not present in the NOTES array, mapped to their
 * chromatic scale index. Used internally by shiftChord and getSemitoneOffset.
 */
const ENHARMONICS: Readonly<Record<string, number>> = {
  Ab: 8,
  Bb: 10,
  Cb: 11,
  Db: 1,
  Eb: 3,
  Fb: 4,
  Gb: 6,
};

/**
 * Returns the chromatic index (0–11) for a root note string.
 * Handles both canonical NOTES entries and enharmonic equivalents.
 *
 * @param root - A root note string, e.g. "C", "F#", "Bb", "Ab"
 * @returns Chromatic index 0–11, or 0 as a safe fallback for unrecognised input
 */
function rootToIndex(root: string): number {
  const idx = (NOTES as string[]).indexOf(root);
  if (idx !== -1) return idx;
  return ENHARMONICS[root] ?? 0;
}

/**
 * Shifts a chord root (and optional slash bass note) by the given semitone offset.
 *
 * Rules:
 * - semitoneOffset = performanceKey index − originalKey index (mod 12)
 * - Always calculate offset relative to original_key, NEVER relative to a prior transposition state.
 * - Output uses the canonical NOTES array (sharps preferred, except Bb).
 *
 * Implementation note:
 * The chord string is split on "/" to separate root+quality from the optional
 * bass note. For each part the root is extracted by matching only at the START
 * of the string (preventing letters inside quality suffixes like "maj", "aug",
 * "dim" from being treated as roots). The root is transposed and the quality
 * suffix is re-appended before the parts are rejoined.
 *
 * @param chord - A single chord token, e.g. "Am", "G/B", "C#maj7"
 * @param semitones - Number of semitones to transpose (negative = down, positive = up)
 * @returns The transposed chord string
 */
export function shiftChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  const parts = chord.split("/");

  const transposedParts = parts.map((part) => {
    // Match only the root at the very start of this part string.
    const rootMatch = part.match(/^[A-G][b#]?/);
    if (!rootMatch) return part;

    const root = rootMatch[0];
    const suffix = part.slice(root.length); // quality string, e.g. "maj7", "m", ""

    const idx = rootToIndex(root);
    let newIdx = (idx + semitones) % 12;
    while (newIdx < 0) newIdx += 12;

    return NOTES[newIdx] + suffix;
  });

  return transposedParts.join("/");
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

/**
 * Common single-token words that are ambiguous with chord names (e.g. "A", "I")
 * but almost always appear in lyric content. A line containing any of these
 * tokens is treated as a lyric line regardless of how many valid chord tokens
 * it also contains.
 */
const LYRIC_GUARD_WORDS = new Set<string>([
  "I",
  "A",
  "To",
  "Me",
  "We",
  "You",
  "The",
  "And",
  "But",
  "In",
  "Is",
  "It",
  "My",
  "No",
  "Of",
  "On",
  "Or",
  "So",
  "Up",
  "He",
  "Be",
]);

/**
 * Heuristic that decides whether a text line contains chords rather than lyrics.
 *
 * Algorithm:
 * 1. Return false for empty lines.
 * 2. Return false immediately if the line contains any token from LYRIC_GUARD_WORDS
 *    (case-sensitive exact match), because those words are ambiguous with chord
 *    names and are strong indicators of lyric content.
 * 3. Split the line into whitespace-delimited tokens.
 * 4. Return true if more than 50% of the tokens are valid chord tokens
 *    (matched entirely by chordRegex).
 *
 * @param line - A single line of song text
 * @returns true if the line is likely a chord line, false otherwise
 *
 * @example
 * isChordLine("G   Am   F   C")   // true
 * isChordLine("I love you Lord")  // false — contains "I"
 * isChordLine("A new song")       // false — contains "A"
 * isChordLine("Am  G  Em  C")     // true
 */
export function isChordLine(line: string): boolean {
  if (line.trim() === "") return false;

  const tokens = line.trim().split(/\s+/);

  // Guard: any lyric-indicator word makes the whole line a lyric line.
  for (const token of tokens) {
    if (LYRIC_GUARD_WORDS.has(token)) return false;
  }

  // Count how many tokens are fully consumed by a single chord match.
  let chordCount = 0;
  // Reset lastIndex before reusing the global regex.
  const localRegex = new RegExp(chordRegex.source);

  for (const token of tokens) {
    const match = token.match(localRegex);
    // The token is a chord token only if the entire token string is the match.
    if (match && match[0] === token) {
      chordCount++;
    }
  }

  return chordCount / tokens.length > 0.5;
}
