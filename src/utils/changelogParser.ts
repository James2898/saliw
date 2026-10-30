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
 * Humanizes entry titles for non-technical users by stripping engineering prefixes
 * (P0/P1/P2/P3, UI/UX, Refactor) and phrasing updates around direct user value.
 */
export function humanizeTitle(title: string): string {
  let cleaned = title
    .replace(/^P[0-3]\s+(?:UI\/UX\s+|immediate\s+|architecture,\s+|TypeScript\s+)?/i, "")
    .replace(/^Immediate\s+P[0-3]\s+/i, "")
    .replace(/^(?:Immediate|Standardize|Extracted|Refactored|Multiplexed)\s+/i, (m) => m.toLowerCase());

  const titleReplacements: Array<[RegExp, string]> = [
    [/mobile polish across navigation.*?hero CTAs/i, "Mobile improvements for navigation, song editor, and lineup"],
    [/security hardening across auth.*?authorization/i, "Security hardening for logins and user profiles"],
    [/privacy hardening and private setlist RLS scoping/i, "Improved privacy and access permissions for private setlists"],
    [/reliability and performance optimizations across chord processing.*?listeners/i, "Performance and responsiveness optimizations for chord charts"],
    [/architecture, dynamic code splitting, and atomic setlist reordering/i, "Faster page loading and smoother setlist reordering"],
    [/TypeScript modernization, schema generics, and domain safety/i, "System reliability and data consistency updates"],
    [/alternating row stripe backgrounds.*?drawer/i, "Alternating row colors on chord charts and section navigation drawer"],
    [/extended setlist search to OR-match/i, "Search setlists by both setlist title and song names"],
    [/YouTube link attachment and collapsible embed player/i, "Attach and watch YouTube videos directly on song pages"],
    [/worship leader selector and musician lineup fields on the \/setlists\/new creation form/i, "Assign worship leaders and add musician lineups when creating setlists"],
    [/global interactive chord drawer with guitar fretboard and piano keyboard diagrams/i, "Interactive chord helper drawer with guitar and piano chord diagrams"],
    [/capo selector.*?inside the expandable song-controls panel/i, "Capo selector and chord shape tools in song view"],
    [/one-click Section Navigator Deck/i, "Quick section bar for jumping between verses and choruses"],
    [/spacebar keyboard shortcut to activate, pause, and resume autoscroll/i, "Press Spacebar to play, pause, and resume auto-scrolling"],
    [/setlist viewer settings modal with gear icon.*?preferences/i, "Display settings for customizable font sizes and chord colors"],
    [/A–Z alphabet filter bar on Song Library and Setlist List pages/i, "A–Z alphabet filter bar on library and setlists"],
    [/append Songs FAB on setlist detail page/i, "Quick button on setlist pages to add new songs"],
    [/items-per-page selector.*?list views/i, "Choose how many songs or setlists to view per page"],
    [/bulk-import script for 173 English Hymnal hymns/i, "Added 173 classic hymns to the song library"],
    [/removed manual-scroll auto-pause.*?default speed/i, "Smoother auto-scroll controls and speed adjustments"],
    [/standardize loading indicators and save\/error feedback/i, "Clearer loading indicators and save feedback across all buttons"],
  ];

  for (const [pattern, replacement] of titleReplacements) {
    if (pattern.test(cleaned)) {
      return replacement;
    }
  }

  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Cleans technical implementation details from bullet text for non-technical readers.
 * Filters out file paths, database code, React hook names, and converts code-heavy
 * descriptions into plain, understandable sentences. Returns empty string if the
 * bullet is purely developer scaffolding.
 */
export function humanizeDetail(detail: string): string {
  // Omit bullets that are purely engineering plumbing
  if (
    /(?:canonical `?Database`? interface|dead code pruning|Vitest|ESLint|reorder_setlist_songs|SQLSTATE|SECURITY DEFINER|RLS scoping|migration `?\d+|useMemo|useCallback|useRef|useEffect|useOptimistic|preProcessChords|generic parameterization|search path pinned|z-\[45\])/i.test(
      detail
    )
  ) {
    return "";
  }

  let text = detail;

  // Remove code paths e.g. `src/app/...` or `src/...`
  text = text.replace(/`?src\/[a-zA-Z0-9_\/.-]+`?/g, "");
  text = text.replace(/`?[a-zA-Z0-9_-]+\.(?:ts|tsx|sql|css|json)`?/g, "");

  // Strip technical code markers and backticks around jargon
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove bracketed task/bug and internal note markers
  text = text.replace(/\([A-Z0-9_,-]+:[^)]+\)/g, "");

  // Clean up excessive whitespace and punctuation left behind
  text = text.replace(/\s{2,}/g, " ");
  text = text.replace(/\(\s*\)/g, "");
  text = text.replace(/,\s*,/g, ",");
  text = text.replace(/;\s*;/g, ";");
  text = text.replace(/:\s*;/g, ":");
  text = text.replace(/\s+([.,;:])/g, "$1");
  text = text.trim();

  // Remove leading punctuation if any
  text = text.replace(/^[-,:;\s]+/, "");

  if (text.length === 0) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
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

      const sanitized = sanitizeBulletText(rawText);
      const title = humanizeTitle(sanitized);
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

      const sanitizedDetail = humanizeDetail(sanitizeBulletText(rawSub));
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
