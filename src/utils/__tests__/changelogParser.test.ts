import { describe, it, expect } from "vitest";
import {
  formatChangelogDate,
  stripAuditParentheses,
  sanitizeBulletText,
  parseCategories,
  parseChangelog,
} from "../changelogParser";

describe("changelogParser", () => {
  describe("formatChangelogDate", () => {
    it("formats YYYY-MM-DD into human-readable Month Day, Year", () => {
      expect(formatChangelogDate("2026-10-31")).toBe("October 31, 2026");
      expect(formatChangelogDate("2026-04-13")).toBe("April 13, 2026");
      expect(formatChangelogDate("2026-01-01")).toBe("January 1, 2026");
    });

    it("uses UTC to prevent local timezone calendar rollbacks (AM-4, BUG-018)", () => {
      // 2026-10-30 in UTC must remain October 30 regardless of machine offset
      expect(formatChangelogDate("2026-10-30")).toBe("October 30, 2026");
    });

    it("returns raw string if not matching YYYY-MM-DD pattern", () => {
      expect(formatChangelogDate("Initial Release")).toBe("Initial Release");
      expect(formatChangelogDate("")).toBe("");
    });
  });

  describe("stripAuditParentheses and sanitizeBulletText", () => {
    it("stripAuditParentheses removes parenthesized audit tokens and leaves regular text", () => {
      expect(stripAuditParentheses("Title (TASK-123)")).toBe("Title");
      expect(stripAuditParentheses("Title (regular comment)")).toBe(
        "Title (regular comment)"
      );
    });

    it("strips ticket references in parentheses e.g. (`TASK-xxx`) and (BUG-xxx)", () => {
      const input = "Navbar Full-Width Header Expansion (`TASK-20261031-fer`)";
      expect(sanitizeBulletText(input)).toBe(
        "Navbar Full-Width Header Expansion"
      );

      const input2 =
        "Worship Leader Song History in Setlist Builder (TASK-20261029-5cf)";
      expect(sanitizeBulletText(input2)).toBe(
        "Worship Leader Song History in Setlist Builder"
      );
    });

    it("strips acceptance criteria and amendment markers e.g. (AC-1, AM-2)", () => {
      const input =
        "Replaced interior `<nav>` container constraint (AC-1, AC-2, AC-3, AC-6)";
      expect(sanitizeBulletText(input)).toBe(
        "Replaced interior `<nav>` container constraint"
      );

      const input2 =
        "Completed explicit `dark:` Artisan palette counterparts (`AM-1`, `AM-2`, `AC-7`)";
      expect(sanitizeBulletText(input2)).toBe(
        "Completed explicit `dark:` Artisan palette counterparts"
      );
    });

    it("strips combined markers containing BUG, AC, and AM", () => {
      const input =
        "React 19 / Compiler compliance with memoized sync slice handlers (`BUG-019`), dependency hygiene (AC-6)";
      expect(sanitizeBulletText(input)).toBe(
        "React 19 / Compiler compliance with memoized sync slice handlers, dependency hygiene"
      );
    });

    it("handles nested brackets and parentheses safely without catastrophic backtracking", () => {
      const input =
        "All new UI elements (no `bg-[var(--brand-card-bg)]`, BUG-021)";
      expect(sanitizeBulletText(input)).toBe("All new UI elements");
    });

    it("strips prefix ticket references e.g. TASK-035: or per BUG-018", () => {
      const input = "TASK-035 extension: removed manual-scroll auto-pause";
      expect(sanitizeBulletText(input)).toBe(
        "removed manual-scroll auto-pause"
      );

      const input2 =
        "Matching Supabase schema conventions and nullable `timestamptz` typing per BUG-018 (AC-1)";
      expect(sanitizeBulletText(input2)).toBe(
        "Matching Supabase schema conventions and nullable `timestamptz` typing"
      );
    });

    it("preserves non-audit parentheses like descriptive options or dimensions", () => {
      const input =
        "Single song display in Page View mode with responsive column collapse (columns-1 lg:columns-2) (AC-7, AC-8)";
      expect(sanitizeBulletText(input)).toBe(
        "Single song display in Page View mode with responsive column collapse (columns-1 lg:columns-2)"
      );

      const input2 = "Line spacing stepper (1.2–2.4, default 1.8)";
      expect(sanitizeBulletText(input2)).toBe(
        "Line spacing stepper (1.2–2.4, default 1.8)"
      );
    });
  });

  describe("parseCategories", () => {
    it("maps standard headings to primary categories", () => {
      expect(parseCategories("Added")).toEqual(["Added"]);
      expect(parseCategories("Changed")).toEqual(["Changed"]);
      expect(parseCategories("Fixed")).toEqual(["Fixed"]);
      expect(parseCategories("Security")).toEqual(["Security"]);
    });

    it("maps compound category headings", () => {
      expect(parseCategories("Added / Changed")).toEqual(["Added", "Changed"]);
      expect(parseCategories("Performance & Reliability")).toEqual(["Changed"]);
      expect(parseCategories("Security Hardening")).toEqual(["Security"]);
    });

    it("defaults to Changed if category is unknown", () => {
      expect(parseCategories("Other Updates")).toEqual(["Changed"]);
    });
  });

  describe("parseChangelog", () => {
    it("handles empty or null markdown gracefully", () => {
      expect(parseChangelog("")).toEqual([]);
      expect(parseChangelog("   \n\n  ")).toEqual([]);
    });

    it("parses release sections chronologically and strips [Unreleased]", () => {
      const sample = `
# Changelog

## [Unreleased] — 2026-10-31

### Changed
- Header Expansion (\`TASK-001\`)
  - Detail 1 (AC-1)
  - Affected files: \`src/navbar.tsx\`

## [Unreleased] — 2026-10-30

### Added
- New Feature
`;
      const releases = parseChangelog(sample);
      expect(releases).toHaveLength(2);

      expect(releases[0].date).toBe("2026-10-31");
      expect(releases[0].displayDate).toBe("October 31, 2026");
      expect(releases[0].anchorId).toBe("release-2026-10-31");
      expect(releases[0].entries).toHaveLength(1);
      expect(releases[0].entries[0].title).toBe("Header Expansion");
      expect(releases[0].entries[0].category).toBe("Changed");
      expect(releases[0].entries[0].details).toEqual(["Detail 1"]);

      expect(releases[1].date).toBe("2026-10-30");
      expect(releases[1].displayDate).toBe("October 30, 2026");
      expect(releases[1].anchorId).toBe("release-2026-10-30");
      expect(releases[1].entries[0].title).toBe("New Feature");
      expect(releases[1].entries[0].category).toBe("Added");
    });

    it("excludes Affected files: sub-bullets from public rendering (AC-4)", () => {
      const sample = `
## 2026-10-25

### Fixed
- Fix mobile overflow
  - Adjusted width calculation (AC-1)
  - Affected files: \`src/styles.css\`, \`src/app.tsx\`
`;
      const releases = parseChangelog(sample);
      expect(releases[0].entries[0].details).toEqual([
        "Adjusted width calculation",
      ]);
    });

    it("aggregates multiple PR blocks sharing the same date into one release", () => {
      const sample = `
## [Unreleased] — 2026-04-27

### Changed
- First update

## [Unreleased] — 2026-04-27

### Added
- Second update
`;
      const releases = parseChangelog(sample);
      expect(releases).toHaveLength(1);
      expect(releases[0].date).toBe("2026-04-27");
      expect(releases[0].anchorId).toBe("release-2026-04-27");
      expect(releases[0].entries).toHaveLength(2);
      expect(releases[0].entries[0].title).toBe("First update");
      expect(releases[0].entries[1].title).toBe("Second update");
    });

    it("orders releases chronologically descending (newest first)", () => {
      const sample = `
## 2026-01-01
### Added
- Old feature

## 2026-10-01
### Added
- New feature
`;
      const releases = parseChangelog(sample);
      expect(releases[0].date).toBe("2026-10-01");
      expect(releases[1].date).toBe("2026-01-01");
    });

    it("handles releases without date format fallback", () => {
      const sample = `
## Initial Release
### Added
- Welcome
`;
      const releases = parseChangelog(sample);
      expect(releases).toHaveLength(1);
      expect(releases[0].anchorId).toBe("release-initial-release");
      expect(releases[0].displayDate).toBe("Initial Release");
    });
  });
});
