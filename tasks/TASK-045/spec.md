# Spec — One-Click Section Navigator Deck

## Feature Summary

Add a floating Section Navigator Deck to the song viewer that gives stage musicians a single-tap shortcut to any structural section (Intro, Verse, Chorus, Bridge, Outro, etc.). On desktop the deck is a vertical column of large badge buttons pinned to the right-hand margin; on mobile it is a horizontally-scrollable banner row pinned below the sticky navbar. Clicking a badge instantly scrolls the song so that section's header sits at the top edge of the visible song card (accounting for any sticky offsets). A lightweight IntersectionObserver tracks which section header is currently topmost-visible and highlights the corresponding badge; all other badges dim. The deck is visible only when the song contains two or more detected sections, and is suppressed when the viewer is in edit mode.

## Acceptance Criteria

1. **Section detection — bracketed format:** The component parses the song body for section headers using the existing bracketed-label format (e.g., `[Verse 1]`, `[Chorus]`, `[Bridge]`). Detection uses the shared regex/parser already present in `src/utils/musicLogic.ts` (or the song viewer component) rather than a new inline regex.

2. **Section detection — minimum threshold:** The Navigator Deck renders only when two or more distinct sections are detected. If zero or one section is detected, the deck is not rendered and no space is reserved for it.

3. **Badge abbreviation mapping — canonical list:**

   | Section type (case-insensitive match) | Badge label |
   |---------------------------------------|-------------|
   | Intro                                 | IN          |
   | Verse (N)                             | V1, V2, V3… |
   | Pre-Chorus                            | PC          |
   | Chorus                                | CH          |
   | Bridge                                | BR          |
   | Interlude                             | IL          |
   | Tag                                   | TAG         |
   | Coda                                  | CODA        |
   | Outro                                 | OUT         |
   | (Any unrecognized section type)       | First 3 chars of label, uppercased |

4. **Repeated sections — numbering:** When the same section type appears more than once (e.g., two Verse sections), each badge is numbered sequentially: V1, V2, V3. Numbering resets per song and is derived from parse order, not from any number already present in the source label (i.e., `[Verse 2]` that is the third verse in the document becomes V3 in badge display).

5. **Badge sizing — touch target:** Each badge button has a minimum rendered size of 44×44 px on all viewports to comply with WCAG 2.5.5 touch target guidelines.

6. **Desktop positioning:** On viewports ≥ 768 px wide, the deck renders as a fixed vertical column pinned to the right-hand margin of the viewport, vertically centered in the song card area. It must not overlap the chord drawer when the chord drawer is open; the deck's `right` offset must accommodate the chord drawer's open width. The exact pixel offset is a Pending Reconciliation item (see Open Questions).

7. **Mobile positioning:** On viewports < 768 px wide, the deck renders as a horizontally-scrollable single-row banner. Its vertical position is directly below the sticky navbar (not overlapping it) and above the song card content area. It must not overlap the auto-scroll FAB.

8. **Scroll-to-section mechanics — JS-controlled:** Clicking a badge triggers a JavaScript-controlled scroll (not `CSS scroll-behavior: smooth` alone) that scrolls the song viewport so the clicked section's header element sits flush at the top boundary of the visible song card, minus any fixed navbar/header height offset. The exact offset value is a Pending Reconciliation item.

9. **Scroll-to-section mechanics — auto-scroll interplay:** Before issuing the scroll command, the component calls `pause()` on the auto-scroll context (if auto-scroll is active). After the programmatic scroll completes, the component waits for a scroll-settle signal (≥ 3 consecutive animation frames with no `scrollY` change, mirroring the BUG-015 settle-detector pattern) before calling `resume()`. It never calls `resume()` while a smooth scroll is still in flight.

10. **Scroll-to-section mechanics — animation:** The scroll animation uses `window.scrollTo({ top: targetY, behavior: "smooth" })` (or equivalent `Element.scrollTo` on the song container if it is a scrollable element rather than the window). The animation must complete within a perceptually "rapid" duration — if the browser's native smooth scroll is too slow, the implementation may use a short `requestAnimationFrame`-driven linear ease (≤ 350 ms) instead.

11. **Active section tracking — IntersectionObserver:** An `IntersectionObserver` monitors each section header element. The "active" section is the one whose header is closest to (and at or above) the top of the visible song card area. When multiple section headers are intersecting, the bottommost one that is still within or at the top boundary is preferred.

12. **Active section tracking — scroll-to-bottom edge case:** When the user has scrolled to the very bottom of the song (and the last section header may have scrolled past the top boundary), the last section's badge remains in the active/highlighted state. It does not deactivate.

13. **Active badge visual state:** The active badge displays at full opacity with the Artisan Tan accent (`bg-brand-tan`, `text-brand-espresso`, plus `dark:bg-brand-brown dark:text-brand-cream`). Inactive badges display at reduced opacity (0.4) with the Artisan Espresso/Cream base and matching `dark:` pairs. Transitions between states use a CSS `transition-opacity` of 150 ms.

14. **Dark mode:** All badge utilities use explicit `dark:` paired classes — no named Artisan utility (`bg-brand-*`, `text-brand-*`, `border-brand-*`) is used without a corresponding `dark:` variant.

15. **Edit mode suppression:** When the song viewer is in edit mode (determined by the mechanism already used in the codebase — URL param, context flag, or prop), the Navigator Deck is not rendered. The exact edit-mode signal is a Pending Reconciliation item.

16. **No layout shift:** The Navigator Deck uses `position: fixed` (or equivalent sticky/portal) so it does not affect the document flow of the song card content. No horizontal or vertical layout shift occurs when the deck appears or disappears.

17. **SSR safety — mount guard:** The IntersectionObserver and any `window`/`document` access are gated behind a `useState(false)` + `useEffect(() => setMounted(true), [])` mount guard. The component renders `null` on the server and on first hydration, preventing hydration mismatch.

18. **React Compiler compliance:** All helper functions referenced inside `useEffect`, `useCallback`, or `useMemo` hooks are declared before the hook that references them. `useCallback` dependency arrays reference whole objects, not property paths.

19. **Module-scope static data:** The `SECTION_MAP` abbreviation table and any other static badge-config arrays are defined as module-scope constants, not allocated inline in the render body.

20. **Accessibility:** Each badge button has an `aria-label` attribute containing the full section name (e.g., `aria-label="Verse 1"`). The active badge has `aria-current="true"`.

21. **No new chord-detection regex:** The component does not introduce a new inline regex for chord detection. Section header detection uses the shared parser utility already present in the codebase.

22. **Performance — observer cleanup:** The `IntersectionObserver` is disconnected in the `useEffect` cleanup function to prevent memory leaks when the component unmounts.

## Out of Scope

- Editing or reordering song sections from the Navigator Deck.
- Showing or hiding individual chords or lyrics from the deck.
- Any server-side or Supabase data changes — this is a pure client-side UI feature reading existing song body content.
- Support for nested or hierarchical section structures (e.g., sub-sections within a Bridge).
- Customizable abbreviation mappings per user or per song.
- Keyboard-only navigation shortcuts from the deck (beyond standard tab/enter focus behavior).
- Animating the deck itself in/out (it is rendered or not, no fade-in animation for the deck container).

## Fallback Behaviors

- **Auto-scroll context missing:** If the auto-scroll context is not present (song viewer loaded without the auto-scroll feature, or context not yet initialized), the Navigator Deck skips the `pause()`/`resume()` calls and proceeds with the scroll directly. No error is thrown.
- **Section headers not found in DOM:** If a section badge is clicked but its target DOM element cannot be located (e.g., element was conditionally unmounted), the click is a no-op. No scroll is attempted and no error surfaces to the user.
- **IntersectionObserver not supported:** If `IntersectionObserver` is unavailable in the browser (extremely rare in modern browsers), the active-tracking highlight is disabled. All badges render at full opacity. The scroll-to-section click behavior still works.
- **Chord drawer open (desktop):** If the chord drawer is open and its width is not yet known at render time, the deck defaults to a safe `right` offset (e.g., `right-4`) and updates its position once the drawer width is available via context or CSS variable.

## Resolved Ambiguities

- **"Rapid, smooth cinematic" scroll definition** → Resolved as: `window.scrollTo({ top, behavior: "smooth" })` with a fallback rAF-driven linear ease of ≤ 350 ms if native smooth scroll is perceptually too slow. Source: BUG-015 pattern in MEMORY.md + coding-guidelines scroll safety rules.
- **Auto-scroll interplay** → Resolved as: pause before scroll, settle-detector (3 stable frames) before resume, never resume mid-flight. Source: BUG-015 in MEMORY.md.
- **Mount guard pattern** → Resolved as: `useState(false)` + `useEffect(() => setMounted(true), [])`. Source: BUG-020 in MEMORY.md.
- **Dark mode requirement** → Resolved as: every `bg-brand-*` / `text-brand-*` / `border-brand-*` class requires an explicit `dark:` pair. Source: BUG-004/BUG-005 in MEMORY.md and coding-guidelines.md.
- **Static arrays in render body** → Resolved as: `SECTION_MAP` hoisted to module scope. Source: BUG-019 in MEMORY.md.
- **React Compiler forward-reference** → Resolved as: declare helpers before the hooks that reference them. Source: BUG-007 in MEMORY.md.
- **useCallback dep discipline** → Resolved as: whole-object deps, never property paths. Source: BUG-002 in MEMORY.md.
- **Pre-Chorus abbreviation** → Resolved as: PC. Source: user request explicitly listed this mapping.
- **Unrecognized section types** → Resolved as: first 3 uppercase characters of the label (truncated display, not hidden). Source: user request stated "Section types not in the mapping — shown as truncated text or hidden?" — choosing truncated text as the conservative default that surfaces content rather than hiding it; not a product decision requiring user input.
- **Visibility threshold** → Resolved as: 2+ sections required to render the deck. Source: user request §5 ("Should the Navigator Deck be always visible, or only when the song has 2+ sections?") — 2+ is the sensible default for a "navigator" to have navigational value; this is a non-controversial default.
