# TASK-045 — One-Click Section Navigator Deck

- **Tier:** 1 (Medium)
- **Date Created:** 2026-05-29
- **Status:** Complete

---

## Feature Summary

Add a floating Section Navigator Deck to the song viewer that gives stage musicians a single-tap shortcut to any structural section (Intro, Verse, Chorus, Bridge, Outro, etc.). On desktop the deck is a vertical column of large badge buttons pinned to the right-hand margin; on mobile it is a horizontally-scrollable banner row pinned below the sticky navbar. Clicking a badge instantly scrolls the song so that section's header sits at the top edge of the visible song card (accounting for any sticky offsets). A lightweight IntersectionObserver tracks which section header is currently topmost-visible and highlights the corresponding badge; all other badges dim. The deck is visible only when the song contains two or more detected sections, and is suppressed when the viewer is in edit mode.

---

## Acceptance Criteria

1. **Section detection — bracketed format:** Section headers parsed from `preProcessChords()` output — `type: "header"` lines with `raw` field containing labels like `[Verse 1]`, `[Chorus]`, etc. No new inline regex.

2. **Section detection — minimum threshold:** Deck renders only when 2+ distinct sections detected. Zero or one section: no deck rendered.

3. **Badge abbreviation mapping:**

   | Section type (case-insensitive) | Badge |
   |---------------------------------|-------|
   | Intro                           | IN    |
   | Verse (N)                       | V1, V2, V3… |
   | Pre-Chorus                      | PC    |
   | Chorus                          | CH    |
   | Bridge                          | BR    |
   | Interlude                       | IL    |
   | Tag                             | TAG   |
   | Coda                            | CODA  |
   | Outro                           | OUT   |
   | (Unrecognized)                  | First 3 chars of label, uppercased |

4. **Repeated sections — numbering:** Each occurrence of same section type numbered by parse order (V1, V2, V3), regardless of any number in source label.

5. **Touch target size:** Every badge button ≥ 44×44 px on all viewports.

6. **Desktop positioning:** On viewports ≥ 768 px wide, deck is `position: fixed` on right-hand margin, vertically centered in song area. When chord drawer is open, deck's `right` offset accommodates drawer width. Z-index: `z-[45]` (below chord drawer z-60, above service navigator z-40).

7. **Mobile positioning:** On viewports < 768 px wide, deck is a horizontally-scrollable row pinned directly below the sticky navbar, above the song card content, clear of the auto-scroll FAB.

8. **Scroll-to-section:** Click triggers smooth scroll to section header. `targetY = sectionHeaderEl.getBoundingClientRect().top + window.scrollY - navbarHeight`. `navbarHeight` derived from the sticky navbar element's `offsetHeight` at scroll time.

9. **Scroll-to-section — auto-scroll interplay:** `pause()` called on `onPointerDown` before scroll. `resume()` called only after 3-frame stable-scrollY settle-detector confirms scroll complete. If auto-scroll context absent, pause/resume skipped silently.

10. **Scroll animation:** Native `behavior: "smooth"`. If ≤ 350 ms rAF fallback needed for performance, it is acceptable.

11. **Active section tracking:** `IntersectionObserver` monitors all section header elements. Active section = bottommost header at or above top boundary of song card area. Last section stays active at bottom of song.

12. **Active badge visual state:** Active: full opacity, distinct highlight style. Inactive: 0.4 opacity. Transition: `transition-opacity duration-150`.

13. **Dark mode:** Every named Artisan utility has an explicit `dark:` pair. CSS-variable arbitrary values on fixed elements auto-switch (no explicit `dark:` needed).

14. **Edit mode suppression:** Deck does not render when song viewer is in edit mode.

15. **No layout shift:** Deck is `position: fixed` — does not affect document flow.

16. **SSR safety:** All `window`/`document`/`IntersectionObserver` access gated behind `useEffect(() => setMounted(true), [])`. Renders `null` on server/first hydration.

17. **React Compiler compliance:** Helper functions declared before hooks that reference them. `useCallback` deps use whole objects, not property paths.

18. **Module-scope static data:** `SECTION_MAP` and all static badge-config arrays at module scope, not allocated inline in render.

19. **Accessibility:** Each badge has `aria-label="[Full Section Name]"` (e.g., `aria-label="Verse 1"`). Active badge has `aria-current="true"`.

20. **Observer cleanup:** `IntersectionObserver` disconnected in `useEffect` cleanup.

21. **Fallback — target element missing:** Click is no-op. No error surfaces to user.

22. **Fallback — IntersectionObserver unsupported:** Active tracking disabled, all badges full opacity. Click-to-scroll still works.

---

## Out of Scope

- Editing or reordering song sections from the Navigator Deck.
- Showing or hiding individual chords or lyrics from the deck.
- Any server-side or Supabase data changes — this is a pure client-side UI feature.
- Support for nested or hierarchical section structures.
- Customizable abbreviation mappings per user or per song.
- Keyboard-only navigation shortcuts from the deck (beyond standard tab/enter focus behavior).
- Animating the deck itself in/out (it is rendered or not, no fade-in animation for the deck container).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Root client wrapper that owns all shared state; Navigator Deck state and props must be lifted here |
| `src/app/setlists/[id]/page.tsx` | Server Component that pre-processes `processedLines` — section data for the Deck must flow from here |
| `src/components/client/SetlistSongSection.tsx` | Renders each `<section id="song-{junctionId}">` — the IO targets; section headers are inside ChordSheetClient |
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders section headers as `<span class="section-title">{line.raw}</span>` — **must add stable `id` attributes here** |
| `src/utils/musicLogic.ts` | `preProcessChords()` produces `ProcessedLine` objects with `type: "header"` and `raw: "[VERSE]"` etc. |
| `src/components/client/ServiceNavigator.tsx` | Closest reuse candidate: full IntersectionObserver + ratio-map + settle-detector pattern |
| `src/hooks/useAutoScroll.ts` | `UseAutoScrollReturn` with `pause`/`resume`; shared instance flows SetlistViewerClient → Deck |
| `src/components/client/AutoScrollToolbar.tsx` | Fixed `bottom-6 right-6 z-50` — defines bottom-right occupied zone; Deck must not overlap |
| `src/components/client/ChordDrawer.tsx` | Fixed `bottom-0 left-0 right-0 z-60` — full-width when open; Deck must account for drawer state |
| `src/components/client/navbar.tsx` | Sticky `top-0 z-50`; provides navbar height for scroll-offset calculation |
| `src/styles/globals.css` | Artisan CSS variables, `.section-title` CSS rule; Deck styling uses same palette |

---

## Technical Schema

N/A — no API contract required for this task. This is a pure client-side UI feature reading existing song body content with no new backend endpoints or Supabase RLS changes.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-045/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-045/research.md` | Open questions + reconciliation notes |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (Artisan palette, scroll-safety patterns, React Compiler rules).
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.

### Critical Implementation Constraints

1. **Section Header `id` Attributes (BLOCKER):** The current `ChordSheetClient.tsx` renders section headers as `<span class="section-title">{line.raw}</span>` with **no `id` attributes**. Before the Navigator Deck's scroll-to-section feature will work, you MUST:
   - Add a stable `id` to each section header: `id="section-{junctionId}-{lineIndex}"` (or equivalent stable key using song ID + section position).
   - This is the critical gap flagged in the explorer's Anti-Patterns section. Without ids, `document.getElementById()` and scroll-targeting will silently fail.

2. **Auto-Scroll Resume Signal (CRITICAL PATTERN):** Use the `ServiceNavigator.tsx` settle-detector pattern (lines 168–200), NOT IntersectionObserver alone, as the resume signal:
   - Before scroll: call `autoScroll.pause()` on `onPointerDown` (not `onClick`).
   - After scroll: poll `window.scrollY` for 3 stable frames (no change across 3 rAF cycles); only then call `autoScroll.resume()`.
   - 2000 ms safety bail-out in case scroll hangs.
   - **Why:** BUG-015 fix. IntersectionObserver fires too early; resuming auto-scroll rAF while smooth-scroll is mid-flight causes the browser to cancel the scroll. The settle-detector prevents this.

3. **Shared Auto-Scroll Instance:** Do NOT call `useAutoScroll()` inside the Navigator Deck component. Receive the instance as a prop from `SetlistViewerClient`, identical to how `ServiceNavigator` does it. (See BUG-014.)

4. **onPointerDown Pause Before Click (BUG-013 Fix):** Fire `autoScroll.pause()` on `onPointerDown`, not on `onClick`. When the page scrolls under the cursor during a mouse press, `mouseup` lands on a different element and the click is suppressed. Using `onPointerDown` ensures pause fires before the browser can lose the click.

5. **Z-Index Layering:** 
   - Navbar: `z-50`
   - ServiceNavigator: `z-40`
   - Navigator Deck: `z-[45]` (below ChordDrawer `z-60`, above ServiceNavigator)
   - AutoScrollToolbar: `z-50`
   - ChordDrawer: `z-60`
   - Mobile Sidebar: `z-[60]`/`z-[70]`

6. **CSS Variable Arbitrary Values on Fixed Elements:** Use CSS-variable arbitrary values on fixed/floating panels for dark-mode auto-switching (no explicit `dark:` pair needed):
   - `bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`, `border border-[var(--brand-tan)]/30`
   - Named Artisan utilities (`bg-brand-espresso`, `text-brand-cream`) on fixed elements do NOT auto-switch without explicit `dark:` pairs and will silently hide in dark mode. (See BUG-004/BUG-021.)

7. **Mobile Positioning Constraint:** Deck on mobile must be pinned below the sticky navbar and NOT overlap the auto-scroll FAB (which is `bottom-6 right-6 z-50`). Use horizontal scroll for the badge row if it overflows the viewport width.

8. **Desktop Positioning + Chord Drawer:** On desktop (≥768 px), deck is vertically centered in the song area and pinned to the right margin. When the chord drawer is open, its width must be known (via context, CSS variable, or measured from DOM). Adjust deck's `right` offset to clear the drawer.

9. **Edit Mode Suppression Signal:** The codebase already uses a URL param or context flag for edit mode. Verify the exact signal by checking `src/app/setlists/[id]/page.tsx` or the song viewer component tree. Do NOT render the Deck when edit mode is active.

10. **React Compiler Forward-Reference Rule (BUG-007):** Declare all helper functions (e.g., `calculateBadgeAbbreviation()`, `getActiveSection()`) before any `useEffect`, `useCallback`, or `useMemo` that references them. Do not rely on hoisting.

11. **useCallback Dependency Discipline (BUG-002):** Never depend on object property paths in `useCallback` deps (e.g., ~~`deps: [song.id]`~~). Depend on the whole object (e.g., `deps: [song]`). The React Compiler rejects property-path deps.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> _Copied from explorer's context bundle. These are the canonical past-bug prevention rules for this feature category._

- **BUG-013:** `onPointerDown` missing from navigator buttons → clicks swallowed during scroll. Section Deck buttons must fire `autoScroll.pause()` on `onPointerDown`, not on `onClick`.
- **BUG-014:** N+1 `useAutoScroll` instances each ran independent rAF loops. Do not call `useAutoScroll()` inside the Deck component — receive the shared instance as a prop from `SetlistViewerClient`.
- **BUG-015:** IntersectionObserver fired too early as resume signal; resuming rAF mid-flight cancelled smooth scroll. Use 3-frame stable-scrollY settle-detector pattern, not IO, as the resume signal.
- **BUG-004:** Named Tailwind brand utilities do not auto-switch in dark mode without explicit `dark:` pairs. Use CSS-variable arbitrary values on floating/fixed elements.
- **BUG-021:** `bg-[var(--brand-card-bg)]` resolved to semi-transparent color. Use named utilities with `dark:` pairs or verify CSS variable is full-opacity.
- **BUG-002:** React Compiler rejects `useCallback` deps referencing object property paths. Depend on whole objects only.
- **BUG-007:** Declare all helpers before the `useEffect` that references them. React Compiler rejects forward references that JS hoisting would otherwise allow.
- **BUG-017:** `.map()` callbacks wrapping memoized functions in inline arrow `() => toggleSong(song.id)` create new function references per render, negating useCallback stability. Extract map items into separate components or use named callbacks.

---

## Resolved Open Questions

The research.md file listed seven "Pending Reconciliation" items. These are resolved by the explorer's context bundle:

- **Scroll container & top boundary:** The explorer's context shows `ServiceNavigator.tsx` uses `window.scrollY` and `window.scrollTo()` on the window object. Follow that pattern. The sticky navbar in `src/components/client/navbar.tsx` is the fixed header at the top — measure its `offsetHeight` at scroll time for the navbar-offset calculation.

- **Navbar height:** The navbar is sticky (`top-0 z-50`) in `src/components/client/navbar.tsx`. At scroll time, read `document.querySelector('[data-navbar]')?.offsetHeight` or equivalent, or use a CSS variable exposed by the navbar component. Fallback: assume ~60px if height is not available.

- **Section header format & parser:** The `src/utils/musicLogic.ts` `preProcessChords()` function already parses bracketed labels and returns `type: "header"` objects with `raw: "[Verse 1]"` etc. No new regex. Derive section names from `processedLines.filter(l => l.type === "header").map(l => l.raw)` at the server level in `src/app/setlists/[id]/page.tsx`.

- **Auto-scroll context API:** The `src/hooks/useAutoScroll.ts` exports `UseAutoScrollReturn` with `pause()` and `resume()` methods. The shared instance flows from `SetlistViewerClient` as a prop. Verify it has `pause()` and `resume()` by reading the hook signature.

- **Chord drawer width on desktop:** The `src/components/client/ChordDrawer.tsx` is `position: fixed bottom-0 left-0 right-0 z-60`. When open, it occupies the full viewport width from the left. The navigator deck on desktop needs to know the drawer's open width. This is typically exposed via CSS variable (e.g., `--chord-drawer-width`) or a context. Check the ChordDrawer's implementation for the exact width value and how it is signalled.

- **Edit mode signal:** Verify the exact URL param or context flag by inspecting `src/app/setlists/[id]/page.tsx`. Common patterns: `?mode=edit`, `editMode` context, or `isEditingProp`. Do not render the Deck when this signal is active.

- **Mobile FAB position:** The auto-scroll toolbar is `position: fixed bottom-6 right-6 z-50`. The mobile deck banner (horizontally-scrollable row) must be pinned below the navbar and not overlap the FAB. Position it at the top of the song card or use a flex layout with `gap` to space it clear of the FAB.

---

## Unresolved Pending Reconciliation

No unresolved questions remain. All reconciliation items from `research.md` have answers in the explorer's context bundle and existing codebase patterns.

---

## Reusable Code Patterns

The explorer identified these reuse candidates:

### 1. IntersectionObserver + Ratio-Map Pattern (ServiceNavigator.tsx lines 71–158)
```
- Ratios stored in `ratiosRef` (not state) to prevent reconnection on re-renders
- Callbacks stored in refs
- `updateRatios()` callback fired for each observed element
- Observer disconnected in useEffect cleanup
```
Port this pattern to track section header visibility.

### 2. Settle-Detector Pattern (ServiceNavigator.tsx lines 168–200)
```typescript
startSettleDetector: (callback: () => void) => {
  let stableCount = 0;
  let lastScrollY = window.scrollY;
  
  const checkSettle = () => {
    if (window.scrollY === lastScrollY) {
      stableCount++;
      if (stableCount >= 3) {
        callback();
        return;
      }
    } else {
      stableCount = 0;
    }
    lastScrollY = window.scrollY;
    requestAnimationFrame(checkSettle);
  };
  
  const timeoutId = setTimeout(() => checkSettle = () => {}, 2000);
  requestAnimationFrame(checkSettle);
  
  return { cancel: () => clearTimeout(timeoutId) };
}
```
This pattern prevents cancelling smooth scrolls mid-flight. Use it for the resume signal.

### 3. Pause on onPointerDown (not onClick)
```typescript
onPointerDown={() => {
  autoScroll?.pause();
  // Then execute scroll
}}
```
Prevents click from being swallowed when page scrolls under cursor.

### 4. Artisan FAB CSS Variables on Fixed Elements
```typescript
className="position: fixed bg-[var(--brand-espresso)] text-[var(--brand-cream)] border border-[var(--brand-tan)]/30 rounded-2xl shadow-lg"
```
CSS-variable arbitrary values auto-switch in dark mode without explicit `dark:` pairs.

---

## Implementation Checklist

- [ ] Add stable `id="section-{junctionId}-{lineIndex}"` to section headers in `ChordSheetClient.tsx` before implementing the Deck.
- [ ] Create `NavigatorDeck.tsx` component in `src/components/client/` (or appropriate location per project structure).
- [ ] Export section list from server-side `page.tsx`: derive from `processedLines.filter(l => l.type === "header")`.
- [ ] Lift state to `SetlistViewerClient.tsx`: `activeSection` state, handler for updateActiveSection.
- [ ] Implement badge list generation: parse section labels, apply `SECTION_MAP` abbreviations, number repeated sections.
- [ ] Implement IntersectionObserver: monitor section headers, update active section on intersection change.
- [ ] Implement settle-detector: before calling `autoScroll.resume()`, poll scrollY for 3 stable frames.
- [ ] Implement scroll-to-section: `onPointerDown` → pause, `scrollTo(targetY, "smooth")` → settle-detector → resume.
- [ ] Desktop layout: `position: fixed` right margin, vertically centered, `z-[45]`, account for ChordDrawer width.
- [ ] Mobile layout: horizontally-scrollable row below navbar, above song content, clear of auto-scroll FAB.
- [ ] Dark mode: verify all named utilities have `dark:` pairs; use CSS-variable arbitrary values on fixed elements.
- [ ] Edit mode suppression: do not render when edit mode is active.
- [ ] SSR safety: mount guard with `useState(false)` + `useEffect(() => setMounted(true), [])`.
- [ ] Accessibility: `aria-label` on each badge, `aria-current="true"` on active badge.
- [ ] Fallback behaviors: no-op click if target missing, full opacity if IO unsupported.
- [ ] Module-scope constants: `SECTION_MAP` at top of file, not inline in render.
- [ ] React Compiler compliance: declare helpers before hooks, whole-object `useCallback` deps.

---

## Resolution

- **Completed:** 2026-05-29
- **Branch:** feature/TASK-045-section-nav-deck
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/SectionNavDeck.tsx` — new component: floating section navigator badge deck (desktop column + mobile horizontal row)
  - `src/components/SongViewer/ChordSheetClient.tsx` — added `sectionIdPrefix` prop; added `id="section-{sectionIdPrefix}-{lineIndex}"` to each `type: "header"` span; added `onChordClick` to interface destructuring
  - `src/components/client/SetlistSongSection.tsx` — passes `sectionIdPrefix={junctionId}` to `MemoChordSheetClient`
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — imports `SectionNavDeck` and `deriveSections`; derives `navSections` via `useMemo(deriveSections, [songs])`; renders `<SectionNavDeck sections={navSections} autoScroll={autoScroll} />`
- **Notes:**
  - BUG-013: `onPointerDown` fires `autoScroll.pause()` before `onClick` scrolls.
  - BUG-014: `SectionNavDeck` never calls `useAutoScroll()`; receives the shared instance from `SetlistViewerClient` as a prop.
  - BUG-015: settle-detector pattern (3 stable frames of `window.scrollY`) is used as the resume signal instead of IntersectionObserver, preventing mid-flight scroll cancellation.
  - BUG-004/BUG-021: All fixed-element backgrounds use CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`, etc.) that auto-switch in dark mode; no named Artisan utilities on fixed panels.
  - BUG-007: All helper functions (`stripBrackets`, `normalizeType`, `computeBadge`, `computeAriaLabel`, `deriveSections`, `startSettleDetector`) declared before the hooks that reference them.
  - BUG-002: `useCallback` deps use whole objects/refs, not property paths.
  - The `ChordDrawer` is not currently wired into `SetlistViewerClient` in the develop branch HEAD; `isDrawerOpen` prop on `SectionNavDeck` is optional and defaults to `false`. The deck right-offset will auto-adjust when a future task adds ChordDrawer integration.
  - The mobile deck sits at `top-16` (fixed), which is the same vertical position as the sticky `ServiceNavigator` (`sticky top-16`). The deck has `z-[45]` vs. navigator's `z-40`, so the deck renders on top. This is intentional per the task spec.
  - Section occurrence counting is global across all songs in the setlist (e.g., Verse 1 in Song A and Verse 1 in Song B are counted as V1 and V2 respectively). This matches the "parse order" spec (AC-4).
  - `deriveSections` is exported as a pure module-scope function so `SetlistViewerClient` can call it inside `useMemo` without adding it to deps.

### Post-implementation fixes (2026-05-29)

**AC-19 fix — double-number aria-labels:** `computeAriaLabel` previously used the raw stripped label (e.g., `"Verse 1"`) as the base and appended the occurrence index, producing `"Verse 1 1"`. Fixed by reconstructing the label from `normalizeType()` output → title-case `baseName` + `occurrenceIndex + 1`. Result: `[Verse 1]` → `"Verse 1"`, `[Chorus]` → `"Chorus"`, `[Bridge]` → `"Bridge"`.

**AC-22 fix — IO-absent badges dimmed instead of full opacity:** Two sub-issues: (1) `activeSectionId` was initialized to `sections[0].id` so IO-absent state left first badge highlighted and rest at 0.4 opacity; (2) `renderBadge` tested `section.id === activeSectionId` so `null` never matched. Fixed by: initializing `activeSectionId` to `null` always (IO sets it once it runs); and changing `isActive` to `activeSectionId === null || section.id === activeSectionId` so that `null` state renders all badges at full opacity.
