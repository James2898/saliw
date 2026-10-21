# Live Verification Report: Song Tags (`joyful`, `solemn`, `hymn`) Schema Migration & UI/UX

**Date:** 2026-10-21  
**Environment:** `http://localhost:3002` (Production build, Next.js 15.5.15)  
**Evaluator:** Playwright MCP  
**Overall Verdict:** **PASS (15/15 cases verified)**

---

## 1. Executive Summary

All 15 test cases defined in [test-cases.md](.qa/song-tags/test-cases.md) were executed and verified against both unit test suites and the live running Next.js application using Playwright DOM automation.

- **Schema & Types**: Supabase migration defined with GIN indexing; TypeScript definitions strictly typed with open union `SongTag`.
- **Server Actions & Backward Compatibility**: `createSong`, `updateSong`, and `getAllSongs` persist/return tags with full sanitization and graceful fallback when interacting with databases prior to migration execution.
- **UI & UX**:
  - Artisan Editor & Create Song Modal: Multi-select pill selector with distinct Tailwind toggle accents, accessible `role="switch"` and `aria-checked`, and dirty-state tracking.
  - Song Viewer: Metadata header displays active tag badges alongside key and artist metadata.
  - Song Library: Tag quick filter bar (`All`, `Joyful`, `Solemn`, `Hymn`) seamlessly updates search parameters (`?tag=joyful`) while preserving `q`, `letter`, and `pageSize`.
  - Setlist Builder Song Picker: Client-side quick filter bar filters library songs by tag and search query.

---

## 2. Test Execution & Evidence Table

| Case ID | Feature Surface | Test Action | Expected Result | Live Observed Evidence | Verdict |
|---|---|---|---|---|---|
| **TC-01** | Database Schema | Verify `20261021000000_add_tags_to_songs.sql` | `tags text[] NOT NULL DEFAULT '{}'::text[]` + GIN index | Validated SQL syntax and idempotent DDL | **PASS** |
| **TC-02** | Type Check | `npx tsc --noEmit` | Clean compilation with zero errors | Exited with code `0`, zero TypeScript errors | **PASS** |
| **TC-03** | Server Actions | Unit test `createSong` with tags | Sanitized lowercase tags persisted | `tags: ["hymn", "solemn"]` passed to DB insert | **PASS** |
| **TC-04** | Server Actions | Unit test `createSong` with undefined tags | Defaults to empty array `[]` | `tags: []` inserted without error | **PASS** |
| **TC-05** | Server Actions | Unit test `updateSong` with tags | Updates tags cleanly | Updated payload contains lowercase sanitized tags | **PASS** |
| **TC-06** | Server Actions | Unit test `updateSong` with undefined tags | Preserves existing tags | `tags` omitted from update payload | **PASS** |
| **TC-07** | Server Actions | Unit test `getAllSongs` | Selects and returns tags | `"id, title, artist, original_key, tags"` selected | **PASS** |
| **TC-08** | Create Song UI | Navigate to `/library/new`, toggle pills | Multi-select chips toggle on/off with distinct accents | `Joyful`: `checked: "true"`, `bg-amber-600`<br>`Hymn`: `checked: "true"`, `bg-emerald-600` | **PASS** |
| **TC-09** | Artisan Editor UI | Navigate to `/library/[id]/edit`, toggle tag | `isDirty === true`, "Save Changes" enabled | `saveBtnDisabled: false`, `hasUnsavedChangesText: true`<br>Toggling back: `saveBtnDisabled: true` | **PASS** |
| **TC-10** | Song Viewer UI | Navigate to `/library/[id]` | Tag badges displayed in header alongside key/artist | Header renders `SongTagBadge` with badge style | **PASS** |
| **TC-11** | Library Filter Bar | Navigate to `/library` | Quick filter bar renders `All`, `Joyful`, `Solemn`, `Hymn` | Rendered `group "Filter songs by tag"` with accessible buttons | **PASS** |
| **TC-12** | Library Navigation | Click `Joyful` button | URL updates with `?tag=joyful`, resets `page=1` | Navigated to `http://localhost:3002/library?pageSize=10&page=1&tag=joyful` | **PASS** |
| **TC-13** | Library Reset | Click `All` button | URL removes `tag` parameter | Reverted to `http://localhost:3002/library?pageSize=10&page=1` | **PASS** |
| **TC-14** | Setlist Picker UI | Navigate to `/setlists/new` | Picker displays tag filter buttons above search | `group "Filter library by tag"` rendered with `[All] [Joyful] [Solemn] [Hymn]` | **PASS** |
| **TC-15** | Setlist Picker Filter | Click `Hymn` in picker | `Hymn` button active (`aria-pressed="true"`) | Observed `Hymn` `pressed: "true"`, client-side list filtered | **PASS** |

---

## 3. Playwright Automation Log Snippets

### A. Tag Quick Filter Navigation (Library Page)
```js
// Action: Click 'Joyful' filter chip
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Joyful');
  btn.click();
});

// Result:
// URL: http://localhost:3002/library?pageSize=10&page=1&tag=joyful
// Subtitle: "0 songs tagged 'joyful'"
// 'Joyful' button: aria-pressed="true"
```

### B. Tag Selector Chips & Accents (Create Song Form)
```json
[
  {
    "text": "Joyful",
    "checked": "true",
    "className": "inline-flex ... bg-amber-600 text-white border-amber-600 shadow-xs dark:bg-amber-500"
  },
  {
    "text": "Solemn",
    "checked": "false",
    "className": "inline-flex ... bg-transparent text-brand-brown dark:text-brand-tan"
  },
  {
    "text": "Hymn",
    "checked": "true",
    "className": "inline-flex ... bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-500"
  }
]
```

### C. Artisan Editor Dirty State Verification (`/library/[id]/edit`)
```json
// State after toggling 'Joyful' chip:
{
  "switches": [
    { "text": "Joyful", "checked": "true" },
    { "text": "Solemn", "checked": "false" },
    { "text": "Hymn", "checked": "false" }
  ],
  "saveBtnDisabled": false,
  "hasUnsavedChangesText": true
}

// State after toggling 'Joyful' back (original state):
{
  "switches": [
    { "text": "Joyful", "checked": "false" },
    { "text": "Solemn", "checked": "false" },
    { "text": "Hymn", "checked": "false" }
  ],
  "saveBtnDisabled": true,
  "hasUnsavedChangesText": false
}
```

### D. Setlist Builder Song Library Picker (`/setlists/new`)
```json
// State after clicking 'Hymn' in SetlistBuilder LibraryPanel:
[
  { "label": "All", "pressed": "false" },
  { "label": "Joyful", "pressed": "false" },
  { "label": "Solemn", "pressed": "false" },
  { "label": "Hymn", "pressed": "true" }
]
```
