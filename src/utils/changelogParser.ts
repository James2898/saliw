/**
 * changelogParser.ts
 *
 * Zero-dependency pure parser for Saliw's CHANGELOG.md.
 * Ingests raw markdown, extracts releases and category groupings,
 * formats release dates with UTC timezone safety (AM-4, BUG-018),
 * sanitizes internal developer notes (AC-4), and produces structured data.
 */

export type ChangelogCategory = "Added" | "Changed" | "Fixed" | "Security";

export interface ChangelogEntry {
  /** Cleaned entry title */
  title: string;
  /** Primary category */
  category: ChangelogCategory;
  /** All categories this entry satisfies (e.g. Added / Changed) */
  categories: ChangelogCategory[];
  /** Sanitized detail sub-bullets */
  details: string[];
}

export interface ChangelogRelease {
  /** Raw heading text from markdown */
  rawHeading: string;
  /** Normalized release date string (YYYY-MM-DD) or clean heading */
  date: string;
  /** Human-friendly formatted date (e.g. "October 30, 2026") */
  displayDate: string;
  /** Unique anchor ID for deep-linking (e.g. "release-2026-10-30") */
  anchorId: string;
  /** Entries for this release */
  entries: ChangelogEntry[];
}

/**
 * Formats a YYYY-MM-DD date string into "Month Day, Year" using UTC
 * to prevent calendar date rollbacks across local timezones (AM-4, BUG-018).
 */
export function formatChangelogDate(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return dateStr;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Strips matching parentheses containing internal audit markers (TASK-, BUG-, AC-, AM-)
 * without catastrophic regex backtracking, supporting nested brackets.
 */
export function stripAuditParentheses(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "(") depth++;
        else if (text[j] === ")") depth--;
        j++;
      }
      if (depth === 0) {
        const inside = text.slice(i + 1, j - 1);
        if (/\b(?:TASK|BUG|AC|AM)-[a-zA-Z0-9_-]+/i.test(inside)) {
          if (result.endsWith(" ")) {
            result = result.slice(0, -1);
          }
          i = j;
          continue;
        }
      }
    }
    result += text[i];
    i++;
  }
  return result;
}

/**
 * Sanitizes developer notes from bullet text:
 * - Strips internal ticket references e.g. (`TASK-xxx`), (BUG-xxx)
 * - Strips acceptance criteria / audit markers e.g. (AC-1, AM-2)
 * - Strips standalone ticket prefixes e.g. "TASK-035: " or "per BUG-018"
 */
export function sanitizeBulletText(text: string): string {
  let cleaned = stripAuditParentheses(text);
  cleaned = cleaned.replace(
    /\b(?:per\s+)?`?(?:TASK|BUG)-[a-zA-Z0-9_-]+`?\s*(?:extension)?\s*[:-]?\s*/gi,
    ""
  );
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/\s+([.,;:])/g, "$1").trim();
  return cleaned;
}

/**
 * Parses a markdown H3 category heading into one or more ChangelogCategory values.
 */
export function parseCategories(rawCategory: string): ChangelogCategory[] {
  const normalized = rawCategory.toLowerCase();
  const categories: ChangelogCategory[] = [];

  if (normalized.includes("add")) {
    categories.push("Added");
  }
  if (
    normalized.includes("change") ||
    normalized.includes("performance") ||
    normalized.includes("reliability") ||
    normalized.includes("refactor")
  ) {
    categories.push("Changed");
  }
  if (normalized.includes("fix") || normalized.includes("bug")) {
    categories.push("Fixed");
  }
  if (normalized.includes("sec")) {
    categories.push("Security");
  }

  if (categories.length === 0) {
    categories.push("Changed");
  }

  return categories;
}

/**
 * Parses raw CHANGELOG.md markdown into chronological release objects.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const lines = markdown.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentCategory: ChangelogCategory = "Changed";
  let currentCategories: ChangelogCategory[] = ["Changed"];
  let currentEntry: ChangelogEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Level 2 Heading: e.g. "## [Unreleased] — 2026-10-31" or "## 2026-10-31"
    const h2Match = /^##\s+(.+)$/.exec(line);
    if (h2Match) {
      currentEntry = null;
      const rawHeading = h2Match[1].trim();
      // Strip [Unreleased] and separator
      const cleanHeading = rawHeading
        .replace(/\[Unreleased\]\s*[-—–]?\s*/i, "")
        .trim();
      const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(cleanHeading);
      const dateStr = dateMatch ? dateMatch[1] : null;

      const releaseDate = dateStr || cleanHeading;
      const displayDate = dateStr ? formatChangelogDate(dateStr) : cleanHeading;
      const anchorId = dateStr
        ? `release-${dateStr}`
        : `release-${cleanHeading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

      // Check if a release for this date/anchor already exists to merge same-day entries
      let existingRelease = releases.find((r) => r.anchorId === anchorId);
      if (!existingRelease) {
        existingRelease = {
          rawHeading,
          date: releaseDate,
          displayDate,
          anchorId,
          entries: [],
        };
        releases.push(existingRelease);
      }
      currentRelease = existingRelease;
      currentCategory = "Changed";
      currentCategories = ["Changed"];
      continue;
    }

    if (!currentRelease) continue;

    // Level 3 Heading: e.g. "### Changed" or "### Added / Changed"
    const h3Match = /^###\s+(.+)$/.exec(line);
    if (h3Match) {
      currentEntry = null;
      const rawCat = h3Match[1].trim();
      currentCategories = parseCategories(rawCat);
      currentCategory = currentCategories[0];
      continue;
    }

    // Top-level bullet: e.g. "- Title" or "* Title" (0 or 1 leading space)
    const topBulletMatch = /^(?:-|\*)\s+(.+)$/.exec(line);
    if (topBulletMatch) {
      const rawText = topBulletMatch[1].trim();
      // Omit if bullet is "Affected files:"
      if (/^Affected files:/i.test(rawText)) {
        currentEntry = null;
        continue;
      }

      const title = sanitizeBulletText(rawText);
      if (!title) {
        currentEntry = null;
        continue;
      }

      currentEntry = {
        title,
        category: currentCategory,
        categories: currentCategories,
        details: [],
      };
      currentRelease.entries.push(currentEntry);
      continue;
    }

    // Sub-bullet: e.g. "  - Detail line"
    const subBulletMatch = /^\s{2,}(?:-|\*)\s+(.+)$/.exec(line);
    if (subBulletMatch && currentEntry) {
      const rawSub = subBulletMatch[1].trim();
      // Omit sub-bullets starting with "Affected files:"
      if (/^Affected files:/i.test(rawSub)) {
        continue;
      }

      const sanitizedDetail = sanitizeBulletText(rawSub);
      if (sanitizedDetail) {
        currentEntry.details.push(sanitizedDetail);
      }
      continue;
    }
  }

  // Sort releases chronologically descending by date
  releases.sort((a, b) => b.date.localeCompare(a.date));

  return releases;
}
