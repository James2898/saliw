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
  /\b[A-G][b#]?(m7b5|maj13|maj11|maj9|maj7|maj|min13|min11|min9|min7|min|m13|m11|m9|m7|m|add13|add11|add9|sus4|sus2|sus|dim7|dim|aug7|aug|13|11|9|7|6|5|4|2)?(\/[A-G][b#]?)?(?![a-zA-Z0-9#/])/;

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
  const fromIdx = rootToIndex(originalKey);
  const toIdx = rootToIndex(performanceKey);
  return (toIdx - fromIdx + 12) % 12;
}

// ── Chord sheet pre-processing ───────────────────────────────────────────────

/**
 * Represents a single whitespace-delimited token on a chord line.
 *
 * - `text`: the raw token string (chord or space-padding)
 * - `isChord`: true if this token is a valid chord token (fully matched by chordRegex)
 * - `originalChord`: the chord string when isChord is true, otherwise null
 */
export type ChordToken = {
  text: string
  isChord: boolean
  originalChord: string | null
}

/**
 * Represents a single processed line of a chord sheet.
 *
 * - `type`:
 *   - `'header'`  — a section label line matching /^\[.+\]$/ (e.g. "[VERSE]")
 *   - `'chord'`   — a line containing mostly chord tokens (per isChordLine heuristic)
 *   - `'lyric'`   — a non-empty line that is neither a header nor a chord line
 *   - `'blank'`   — an empty or whitespace-only line
 * - `raw`: the original unmodified line string
 * - `tokens`: present only for `'chord'` lines — the tokenized chord data
 */
export type ProcessedLine =
  | { type: 'header'; raw: string; tokens?: undefined }
  | { type: 'lyric'; raw: string; tokens?: undefined }
  | { type: 'blank'; raw: string; tokens?: undefined }
  | { type: 'chord'; raw: string; tokens: ChordToken[] }

/**
 * Regex that matches a section header line: a line whose entire content is a
 * bracket-wrapped label, e.g. "[VERSE]", "[CHORUS]", "[BRIDGE 2]".
 * Must be anchored to the full line (start and end).
 */
const HEADER_REGEX = /^\[.+\]$/

/**
 * Regex that detects a pipe-delimited chord chart line.
 *
 * A pipe-chart line contains at least two pipe characters (`|`) and has
 * non-whitespace content between them, e.g.:
 *   [Intro]| F | C | G | Am7 || F | C | G | Am7 |
 *   | F | C | G | Am7 |
 *
 * The regex requires two or more `|` characters anywhere in the trimmed line.
 * Single pipes can appear in lyric lines (rare but possible), so we require
 * at least two to reduce false-positive classification.
 *
 * This is intentionally loose — it identifies candidate lines for pipe-chart
 * tokenisation, after which the >0 chord-token check gates final classification.
 */
const PIPE_CHART_REGEX = /\|.*\|/

/**
 * Parses a raw chord-sheet content string into an array of `ProcessedLine` objects.
 *
 * Line classification (in priority order):
 * 1. Blank       — line is empty or contains only whitespace
 * 2. Header      — line matches /^\[.+\]$/ (entire trimmed line is a bracket-wrapped label)
 * 3. Pipe-chart  — line matches PIPE_CHART_REGEX (/\|.*\|/) and contains ≥1 chord token
 *                  between pipes (e.g. "[Intro]| F | C | G | Am7 || F | C | G | Am7 |")
 * 4. Chord       — line passes the isChordLine heuristic (>50% tokens are valid chords)
 * 5. Lyric       — all other non-empty lines
 *
 * For chord lines, each whitespace-delimited token is wrapped in a `ChordToken`
 * that records whether it is a chord and, if so, its original chord string.
 * Whitespace runs between tokens are preserved as non-chord tokens so the SSR
 * renderer can re-emit them for alignment under `white-space: pre-wrap`.
 *
 * @param content - The raw song content string (may contain \r\n or \n line endings)
 * @returns Array of ProcessedLine objects, one per line
 */
export function preProcessChords(content: string): ProcessedLine[] {
  const lines = content.split(/\r?\n/)
  // Hoist anchored regex construction outside all inner loops (Finding #1 fix).
  // Anchors the shared chordRegex to the full token string so partial matches
  // (e.g. "Am" matching inside "Amplitude") are rejected.
  const anchoredChordRegex = new RegExp('^' + chordRegex.source + '$')

  return lines.map((raw): ProcessedLine => {
    // 1. Blank
    if (raw.trim() === '') {
      return { type: 'blank', raw }
    }

    // 2. Header — entire trimmed line is a bracket-wrapped section label
    if (HEADER_REGEX.test(raw.trim())) {
      return { type: 'header', raw: raw.trim() }
    }

    // 3. Pipe-delimited chord chart line, e.g.:
    //    [Intro]| F | C | G | Am7 || F | C | G | Am7 |
    //    | F | C | G | Am7 |
    //
    // These lines fail the isChordLine >50% heuristic because pipe and bracket
    // characters are counted as non-chord tokens, diluting the ratio below the
    // threshold. We detect them explicitly before that heuristic and tokenise
    // them directly, emitting chord tokens with the same ChordToken shape used
    // by standard chord lines so ChordSheetClient needs no changes.
    if (PIPE_CHART_REGEX.test(raw)) {
      // Split on pipe characters, keeping the pipes as separate segments via
      // the capturing-group split pattern.
      const pipeSplit = raw.split(/(\|+)/)
      const tokens: ChordToken[] = []

      for (const segment of pipeSplit) {
        if (segment === '') continue

        if (/^\|+$/.test(segment)) {
          // One or more consecutive pipe characters — emit as non-chord token.
          tokens.push({ text: segment, isChord: false, originalChord: null })
          continue
        }

        // Split segment further on whitespace, preserving whitespace runs.
        const subSegments = segment.split(/(\s+)/)
        for (const sub of subSegments) {
          if (sub === '') continue
          if (/^\s+$/.test(sub)) {
            tokens.push({ text: sub, isChord: false, originalChord: null })
            continue
          }
          // Test each non-whitespace token against the anchored chord regex.
          const match = anchoredChordRegex.exec(sub)
          if (match && match[0] === sub) {
            tokens.push({ text: sub, isChord: true, originalChord: sub })
          } else {
            tokens.push({ text: sub, isChord: false, originalChord: null })
          }
        }
      }

      // Only classify as a chord line if at least one chord token was found.
      // If no chords were detected (unlikely but defensive), fall through to lyric.
      const hasChord = tokens.some((t) => t.isChord)
      if (hasChord) {
        return { type: 'chord', raw, tokens }
      }
    }

    // 4. Chord line — use existing isChordLine heuristic
    if (isChordLine(raw)) {
      // Split on runs of spaces, keeping whitespace segments as separate tokens
      // so the renderer can re-emit them to maintain horizontal alignment.
      const segments = raw.split(/(\s+)/)
      const tokens: ChordToken[] = segments.map((segment): ChordToken => {
        if (/^\s+$/.test(segment)) {
          return { text: segment, isChord: false, originalChord: null }
        }
        const match = anchoredChordRegex.exec(segment)
        if (match && match[0] === segment) {
          return { text: segment, isChord: true, originalChord: segment }
        }
        return { text: segment, isChord: false, originalChord: null }
      })
      return { type: 'chord', raw, tokens }
    }

    // 5. Lyric
    return { type: 'lyric', raw }
  })
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
  const localRegex = new RegExp(chordRegex.source, "g");

  for (const token of tokens) {
    const match = token.match(localRegex);
    // The token is a chord token only if the entire token string is the match.
    if (match && match[0] === token) {
      chordCount++;
    }
  }

  return chordCount / tokens.length > 0.5;
}
