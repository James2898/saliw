/**
 * hymnsMarkdownParser.test.ts
 *
 * Vitest suite for the English Hymnal markdown parser.
 *
 * The source markdown lives outside the repository
 * (`/Users/adish/Downloads/English Hymns.md`) so we read it synchronously here
 * with `fs.readFileSync`. This is acceptable for a one-shot import seeder —
 * the parser itself remains pure (no I/O).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseHymns, type Hymn } from "./hymnsMarkdownParser";

const SOURCE_PATH = "/Users/adish/Downloads/English Hymns.md";

const markdown = readFileSync(SOURCE_PATH, "utf-8");
const hymns: Hymn[] = parseHymns(markdown);

describe("parseHymns — count and shape", () => {
  it("parses exactly 173 hymns from the source file", () => {
    expect(hymns).toHaveLength(173);
  });

  it("returns hymns whose numbers are in source order, starting at 01", () => {
    expect(hymns[0].number).toBe("01");
    expect(hymns[1].number).toBe("02");
    expect(hymns[2].number).toBe("03");
    expect(hymns[7].number).toBe("08");
    expect(hymns[hymns.length - 1].number).toBe("173");
  });

  it("produces non-empty title strings for every hymn", () => {
    for (const h of hymns) {
      expect(typeof h.title).toBe("string");
      expect(h.title.length).toBeGreaterThan(0);
    }
  });

  it("produces string content for every hymn (empty allowed for hymns whose source body is empty)", () => {
    // Hymn #169 ("Were You There?") has no body content between its heading and
    // hymn #170's heading in the source markdown. We preserve that fact rather
    // than fabricate content, so an empty string is acceptable for that hymn.
    // All others must be non-empty.
    for (const h of hymns) {
      expect(typeof h.content).toBe("string");
      if (h.number !== "169") {
        expect(h.content.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("parseHymns — escape sequence resolution (AC2)", () => {
  it("contains no backslashes in any title", () => {
    for (const h of hymns) {
      expect(h.title.includes("\\")).toBe(false);
    }
  });

  it("contains no backslashes in any content body", () => {
    for (const h of hymns) {
      expect(h.content.includes("\\")).toBe(false);
    }
  });

  it("preserves exclamation marks where the source had \\!", () => {
    // Hymn #05 title in source: "Holy, Holy, Holy, Lord God Almighty\!"
    const hymn05 = hymns.find((h) => h.number === "05");
    expect(hymn05).toBeDefined();
    expect(hymn05!.title).toContain("Almighty!");
  });

  it("preserves apostrophes where the source had \\'", () => {
    // Use a content-level check; source uses \' in many lyric lines.
    // Pick any hymn that has "I'm" or "He'll" etc. — hymn #08 has "I'm" in v1.
    const hymn08 = hymns.find((h) => h.number === "08");
    expect(hymn08).toBeDefined();
    expect(hymn08!.content).toMatch(/I'm/);
  });
});

describe("parseHymns — section header conversion (AC2)", () => {
  it("converts ##(Verse N) into [VERSE N] for lyric-only hymns", () => {
    const hymn08 = hymns.find((h) => h.number === "08");
    expect(hymn08).toBeDefined();
    expect(hymn08!.content).toContain("[VERSE 1]");
    expect(hymn08!.content).toContain("[VERSE 2]");
    expect(hymn08!.content).toContain("[VERSE 3]");
    // Source-style markers must be gone.
    expect(hymn08!.content).not.toContain("##(Verse");
    expect(hymn08!.content).not.toContain("(Verse 1)");
  });

  it("converts ##(Chorus) into [CHORUS] when present", () => {
    // Hymn #04 (To God Be the Glory) has a (Chorus) section in the source.
    const hymn04 = hymns.find((h) => h.number === "04");
    expect(hymn04).toBeDefined();
    expect(hymn04!.content).toContain("[CHORUS]");
    expect(hymn04!.content).not.toContain("##(Chorus");
  });
});

describe("parseHymns — spot checks (AC3)", () => {
  it("hymn #01 (Doxology) has chord tokens in its body", () => {
    const hymn01 = hymns.find((h) => h.number === "01");
    expect(hymn01).toBeDefined();
    expect(hymn01!.title).toBe("Doxology");
    // The original chord lines for hymn #01 use bare letter names like G, C, D, Em.
    // We don't enforce a specific format here — just that some chord-looking line exists
    // and that the closing "Amen." text remains intact.
    expect(hymn01!.content).toMatch(/\bG\b/);
    expect(hymn01!.content).toContain("Amen");
  });

  it("hymn #08 (Come, Thou Fount...) is lyrics-only with [VERSE N] headers", () => {
    const hymn08 = hymns.find((h) => h.number === "08");
    expect(hymn08).toBeDefined();
    expect(hymn08!.title.startsWith("Come, Thou Fount")).toBe(true);
    expect(hymn08!.content).toContain("[VERSE 1]");
    expect(hymn08!.content).toContain("[VERSE 3]");
    expect(hymn08!.content).toMatch(/Tune my heart to sing Thy grace/);
  });

  it("hymn #170 (He Touched Me) parses correctly near end of file", () => {
    const hymn170 = hymns.find((h) => h.number === "170");
    expect(hymn170).toBeDefined();
    expect(hymn170!.title).toBe("He Touched Me");
    expect(hymn170!.content).toContain("[VERSE 1]");
    expect(hymn170!.content).toMatch(/Shackled by a heavy burden/);
  });

  it("hymn #173 (final hymn) parses correctly at end of file", () => {
    const hymn173 = hymns.find((h) => h.number === "173");
    expect(hymn173).toBeDefined();
    expect(hymn173!.title).toBe("No One Ever Cared for Me Like Jesus");
    expect(hymn173!.content).toContain("[VERSE 1]");
    expect(hymn173!.content).toContain("[VERSE 3]");
  });
});

describe("parseHymns — whitespace hygiene", () => {
  it("does not contain runs of 3+ blank lines in any hymn body", () => {
    for (const h of hymns) {
      expect(h.content.match(/\n{3,}/)).toBeNull();
    }
  });

  it("does not have leading or trailing whitespace in content", () => {
    for (const h of hymns) {
      expect(h.content).toBe(h.content.trim());
    }
  });
});
