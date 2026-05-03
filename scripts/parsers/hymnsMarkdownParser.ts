/**
 * hymnsMarkdownParser.ts
 *
 * Pure parser for the English Hymnal source markdown
 * (`/Users/adish/Downloads/English Hymns.md`). Splits the file into 173 hymns,
 * unescapes Markdown-escape sequences, and converts section headers into the
 * Saliw chord-sheet format used elsewhere in the app (`[VERSE 1]`, `[CHORUS]`,
 * `[REFRAIN]`).
 *
 * No I/O. No DB calls. Used by:
 *   - scripts/import-hymns.ts (the seeder)
 *   - scripts/parsers/hymnsMarkdownParser.test.ts (unit tests)
 */

export type Hymn = {
  /** Hymn number from the source file as a zero-padded string, e.g. "01", "08", "173". */
  number: string;
  /** Title with all escape sequences resolved, e.g. "Doxology", "Holy, Holy, Holy, Lord God Almighty!". */
  title: string;
  /** Body content with escapes resolved, section headers normalized, and whitespace tidied. */
  content: string;
};

/**
 * Heading regex that captures `## \#NN \- Title`.
 *
 * Source format example:
 *   `## \#01 \- Doxology`
 *   `## \#173 \- No One Ever Cared for Me Like Jesus`
 *
 * Capture groups:
 *   1. The hymn number (digits only, with leading zeros preserved)
 *   2. The raw title (still contains escape sequences — unescaped downstream)
 *
 * Tolerances (observed in the real source):
 *   - Whitespace between `## ` and `\#NN` may be one or more spaces.
 *   - Whitespace AFTER the `\-` separator may be ZERO or more spaces (hymn #164
 *     in the source is `## \#164 \-Come, Holy Spirit` with no space).
 *   - Trailing whitespace after the title is allowed (the source frequently has
 *     a single trailing space).
 *
 * Anchored with /m so it matches at the start of any line. The /g flag drives
 * the matchAll iteration in parseHymns.
 */
const HEADING_REGEX = /^##\s+\\#(\d+)\s+\\-\s*(.+?)\s*$/gm;

/**
 * Resolves the markdown escape sequences known to appear in the source file.
 * Order matters only insofar as the input contains literal backslashes; the
 * sequences here are non-overlapping so a series of String#replaceAll calls
 * is sufficient and easier to audit than a single regex.
 *
 * Sequences (per task spec AC2):
 *   \!  → !
 *   \'  → '
 *   \"  → "
 *   \#  → #
 *   \(  → (
 *   \)  → )
 *
 * Anything else (e.g. an unexpected `\.` or `\,`) is left untouched so the
 * post-condition "no backslashes remain" can be asserted by tests as a sentinel
 * for unhandled escape sequences.
 */
function unescapeMarkdown(input: string): string {
  return input
    .replaceAll("\\!", "!")
    .replaceAll("\\'", "'")
    .replaceAll('\\"', '"')
    .replaceAll("\\#", "#")
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")");
}

/**
 * Converts source-style section markers into Saliw chord-sheet headers.
 *
 * After unescapeMarkdown runs, the source `\#\#(Verse 1\)` becomes `##(Verse 1)`.
 * We then map:
 *   ##(Verse N)  →  [VERSE N]
 *   ##(Chorus)   →  [CHORUS]
 *   ##(Refrain)  →  [REFRAIN]
 *
 * The conversion is case-insensitive on the literal label but preserves the
 * digit on Verse. We do not collapse spaces inside the label — the source uses
 * `Verse 1`, `Verse 2`, etc., never `Verse1`.
 *
 * Trailing whitespace and the optional Markdown line-break marker (two spaces)
 * may follow the label on the same line. We do not strip them here; the
 * cleanContent step normalizes whitespace later.
 */
function convertSectionHeaders(input: string): string {
  return input
    .replace(/^##\(Verse\s+(\d+)\)\s*$/gim, (_m, n) => `[VERSE ${n}]`)
    .replace(/^##\(Chorus\)\s*$/gim, "[CHORUS]")
    .replace(/^##\(Refrain\)\s*$/gim, "[REFRAIN]");
}

/**
 * Tidies a hymn body after escape and header normalization.
 *
 * Steps:
 *   1. Strip per-line trailing whitespace (the source uses two-space line-break
 *      markers that are meaningless once we render in our own pipeline).
 *   2. Collapse 3+ consecutive blank lines down to exactly two newlines so
 *      stanza breaks remain visible without runaway gaps.
 *   3. Trim leading/trailing whitespace on the whole string.
 */
function cleanContent(input: string): string {
  const noTrailingSpaces = input
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  const collapsedBlanks = noTrailingSpaces.replace(/\n{3,}/g, "\n\n");

  return collapsedBlanks.trim();
}

/**
 * Parses the English Hymnal source markdown into an ordered array of Hymn records.
 *
 * The function uses a single sweep over the markdown:
 *   1. Iterates HEADING_REGEX matches with their byte indices.
 *   2. For each heading, the body is the slice from the heading's end to the
 *      next heading's start (or end of string for the last hymn).
 *   3. Title and body each have escapes resolved; body additionally has section
 *      headers normalized and whitespace cleaned.
 *
 * @param markdown The raw contents of `English Hymns.md`.
 * @returns An array of Hymn records, in source order.
 *
 * @throws Error if zero headings match — defensive, never happens for the real source.
 */
export function parseHymns(markdown: string): Hymn[] {
  // Find every heading match and its index. The /g flag is on HEADING_REGEX so
  // we collect all matches in one pass via matchAll, which is cheaper than a
  // manual exec loop and easier to reason about.
  const headings = Array.from(markdown.matchAll(HEADING_REGEX));

  if (headings.length === 0) {
    throw new Error(
      "parseHymns: no hymn headings matched. The source markdown is empty or its format has changed."
    );
  }

  const hymns: Hymn[] = [];

  for (let i = 0; i < headings.length; i++) {
    const match = headings[i];
    // matchAll always provides .index for matches against a string; the type
    // system requires the explicit guard.
    if (match.index === undefined) {
      throw new Error("parseHymns: heading match missing index");
    }

    const headingStart = match.index;
    const headingEnd = headingStart + match[0].length;
    const nextStart =
      i + 1 < headings.length
        ? (headings[i + 1].index ?? markdown.length)
        : markdown.length;

    const rawNumber = match[1];
    const rawTitle = match[2];
    const rawBody = markdown.slice(headingEnd, nextStart);

    const title = unescapeMarkdown(rawTitle).trim();

    // Order: unescape → header conversion → whitespace cleanup.
    // Doing header conversion before unescape would require us to also match
    // `\#\#(Verse 1\)`, which is more brittle than matching `##(Verse 1)`
    // post-unescape.
    const unescapedBody = unescapeMarkdown(rawBody);
    const headeredBody = convertSectionHeaders(unescapedBody);
    const content = cleanContent(headeredBody);

    hymns.push({
      number: rawNumber,
      title,
      content,
    });
  }

  return hymns;
}
