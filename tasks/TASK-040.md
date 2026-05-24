# TASK-040 — Setlist Viewer Settings Modal (Gear Icon + Font/Chord Tabs)

- **Tier:** 1
- **Date Created:** 2026-05-24
- **Status:** Complete

---

## Feature Summary

Add a gear/settings icon button to the far right of the setlist viewer header row, positioned inline with the date and "hide all chords" button. Clicking the gear icon opens a two-tab settings modal (Font + Chords). The Font tab reuses the existing font size adjuster component for global lyric font size and adds an independent chord font size control. The Chords tab exposes 5 preset chord background colors (Artisan palette) plus a "no background" option, and 5 preset chord font colors (high-contrast readable colors). All settings are client-side display preferences stored in localStorage with live preview — no Save/Apply button. Persistence uses SSR-safe lazy useState initializers (BUG-001 mandatory).

---

## Acceptance Criteria

### Gear Icon & Modal Shell

1. A gear/settings icon button is rendered at the far right of the setlist viewer header row, positioned inline with the date and "hide all chords" button. It must not displace existing controls or cause layout shift.
2. The gear icon button has `aria-label="Open display settings"`.
3. Clicking the gear icon opens the settings modal overlay; setlist content behind it remains visible but non-interactive.
4. Modal dismisses on: (a) clicking the gear icon again (toggle), (b) clicking a visible close button inside the modal, (c) pressing Escape key.
5. Modal contains exactly two tabs: "Font" and "Chords".
6. Switching tabs does not reset any setting — all tab states persist while the modal is open.
7. All setting changes apply immediately (live preview); no Save/Apply button.
8. Modal uses Artisan palette styling. ALL named Tailwind brand utilities must have explicit `dark:` variants (BUG-004/BUG-005).

### Font Tab

9. Font tab reuses the existing font size adjuster component (do not duplicate) for global lyric font size — applies to all songs in the setlist view.
10. Font tab has a separate independent chord font size control using a parallel `useChordFontSize` hook (localStorage key: `"saliw-chord-font-size"`). Uses the same increase/decrease/reset pattern as `useFontSize`.
11. Both controls show min/max bounds (12px–48px) and the current numeric value.

### Chords Tab

12. Chords tab has a chord background color section: exactly 5 Artisan palette preset swatches + a "No background" choice (6 total, single-select).
    - Preset bg colors (Artisan): `#F5F0E8` (cream), `#C9A96E` (tan), `#8B6347` (brown), `#3D1F0D` (espresso), `#E8DDD0` (light warm gray)
    - "No background" = transparent / no fill
    - Default: "No background"
13. Chords tab has a chord font color section: exactly 5 high-contrast readable preset swatches (single-select).
    - Preset font colors: `#FFFFFF` (white), `#1A1A1A` (near-black), `#C0392B` (existing Artisan chord red — codebase default), `#1A5276` (deep blue), `#145A32` (deep green)
    - Default: `#C0392B` (existing codebase default — matches current `.chord-item` color in globals.css)
14. Selecting a swatch applies it immediately as live preview.
15. The active/selected swatch has a distinct visual indicator (highlighted border or checkmark).

### CSS Variable Pattern (Critical)

16. Convert `.chord-item` in `src/styles/globals.css` to use CSS custom properties:
    - Light mode: `color: var(--chord-color, #c0392b)`, `background-color: var(--chord-bg, transparent)`
    - Dark mode: `color: var(--chord-color, var(--brand-cream))`, `background-color: var(--chord-bg, var(--brand-brown))`
17. Inject `--chord-color` and `--chord-bg` onto the `.chord-display` container ref (same pattern as `--chord-font-size` injection in ChordSheetClient.tsx) — never apply inline styles to individual `.chord-item` spans.

### Persistence

18. All 4 preferences (lyric font size, chord font size, chord bg color, chord font color) persisted in localStorage.
19. localStorage keys: `"saliw-font-size"` (existing, unchanged), `"saliw-chord-font-size"` (new), `"saliw-chord-bg"` (new), `"saliw-chord-color"` (new).
20. All localStorage reads use `useState(() => readValue())` lazy initializer (BUG-001). Never `useEffect` + `setState`.
21. SSR-safe: initializer returns the default value when `typeof window === "undefined"`.

### useFontSize Lift (Critical)

22. `useFontSize` is currently called inside `ChordSheetClient.tsx`. To avoid dual-instance state, lift it to `SetlistViewerClient.tsx` and pass `fontSize` + `increase`/`decrease`/`reset` callbacks as props down to `ChordSheetClient` (and its intermediary `SetlistSongSection` if needed). Remove the direct `useFontSize()` call from `ChordSheetClient.tsx`.

### Accessibility & Architecture

23. Tab strip uses ARIA semantics: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`.
24. Modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (pointing to a modal title).
25. Focus traps to the close button on modal open (BUG-007: declare focus-trap handler above the useEffect that calls it).
26. Icon: `Settings` from `lucide-react` (add to existing import in `SetlistViewerClient.tsx`).
27. `npm run format` before committing (Prettier mandatory).

---

## Out of Scope

- Saving preferences to Supabase / user profile (no DB writes).
- Per-song font size or color overrides (settings are global across all songs in the viewer).
- Custom color picker / hex input (only the 5 presets plus "no background" are provided).
- More than two tabs in the modal.
- Any new backend endpoints, RLS policies, or Server Actions.
- Changing the "hide all chords" button behavior or placement.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Main client — add gear icon + modal trigger here; existing Hide Chords button (lines 155–175) is the styling reference for the gear button; lift `useFontSize()` from ChordSheetClient to here |
| `src/hooks/useFontSize.ts` | Existing font size hook (lazy initializer, localStorage key `"saliw-font-size"`) — reuse pattern for new `useChordFontSize` and chord color hooks |
| `src/components/SongViewer/ChordSheetClient.tsx` | Currently calls `useFontSize()` directly — must be refactored to accept fontSize as a prop after lifting |
| `src/components/client/AppendSongsModal.tsx` | Canonical modal pattern: `z-[80]` backdrop, `z-[90]` panel, focus trap, Escape, `role="dialog"` |
| `src/components/client/SetlistSongSection.tsx` | Prop chain intermediary between SetlistViewerClient and ChordSheetClient |
| `src/components/client/button.tsx` | Shared Button — use for close button inside modal |
| `src/styles/globals.css` | `.chord-item` hardcoded colors must be converted to CSS custom properties |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-040/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-040/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-040/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> _Copied verbatim from `context.md` → MEMORY.md Notes. This is the canonical list of past-bug prevention rules for `@fullstack-developer`, `@release-manager`, and `@validator-agent`. They MUST NOT re-read `MEMORY.md` directly; trust this list._

- **BUG-001 (useState lazy initializer):** Any new hook that reads from localStorage for chord color or chord font size MUST use `useState(readStoredValue)` lazy initializer — never `useEffect(() => setState(localStorage.getItem(...)))`. The React Compiler will reject the latter as a build error on Vercel.
- **BUG-002 (React Compiler useCallback deps):** In the new modal component, `useCallback` deps must reference whole objects, not property paths. If the modal receives a `fontSizeControls` prop object, depend on `[fontSizeControls]` not `[fontSizeControls.increase]`.
- **BUG-004 / BUG-005 (dark mode named utilities):** Every Tailwind named color utility in the modal and gear button must have an explicit `dark:` pair. Color picker swatches using inline hex colors (for the preset chord colors) will not be affected by the `.dark` class — but their labels and borders will be. Audit every `text-brand-*` / `bg-brand-*` / `border-brand-*` in the new component before merging.
- **BUG-007 (React Compiler forward references):** In the new modal, declare all `useCallback` and handler functions BEFORE the `useEffect` blocks that reference them. The React Compiler treats forward references as build errors.
- **BUG-006 (Tailwind scanning):** Do not write Tailwind arbitrary-value class patterns with wildcard `*` in any file at or below the project root — Tailwind v4 will attempt to emit CSS from them. When describing preset color classes in code comments, use a concrete specific example, not a wildcard pattern.
- **Formatting (Prettier):** Run `npm run format` before every commit. The `.prettierrc` config is present and Prettier v3 is installed.

---

## Amendments (from Context Bundle)

- **AM-1:** **useFontSize state duplication risk** — The existing `useFontSize()` hook is called directly inside `ChordSheetClient.tsx`. If the new settings modal also calls `useFontSize()` at the SetlistViewerClient level, both instances will read/write to the same localStorage key (`"saliw-font-size"`), creating a state split. The modal's controls will update localStorage, but ChordSheetClient's independent instance won't see the change until remount. Solution: Lift `useFontSize()` from ChordSheetClient to SetlistViewerClient, and pass the returned `fontSize` value + `increase`/`decrease`/`reset` callbacks as props down to ChordSheetClient (via SetlistSongSection if needed). Remove the direct `useFontSize()` call from ChordSheetClient. This ensures a single source of truth.

- **AM-2:** **CSS variable pattern required before chord color injection** — The existing `.chord-item` class in `src/styles/globals.css` hardcodes colors (`color: #c0392b`, `.dark .chord-item { background-color: var(--brand-brown) }`). To enable the new chord color presets, convert these to CSS custom properties: `color: var(--chord-color, #c0392b)` (light mode default) and `background-color: var(--chord-bg, transparent)` (light mode default to no bg). For dark mode, default `--chord-color` to `var(--brand-cream)` and `--chord-bg` to `var(--brand-brown)`. Then inject `--chord-color` and `--chord-bg` onto the `.chord-display` container ref (same pattern as `--chord-font-size` injection in ChordSheetClient, using `ref.current?.style.setProperty()`). Never apply inline `style` to individual `.chord-item` spans — they are batch-mutated for transposition, and mixing mutation with inline styles requires touching every span on every color change.

- **AM-3:** **No dual hook instance pattern** — Do not replicate a pattern where both SetlistViewerClient and ChordSheetClient call `useFontSize()` independently. This was flagged in context.md anti-patterns as a latent state-split risk. Once the lift is complete (AM-1), neither ChordSheetClient nor any other consumer should call `useFontSize()` directly; all consumers must receive fontSize as a prop from SetlistViewerClient.

---

## Resolved Open Questions

- **Chord color presets mix** → User confirmed: Artisan palette colors for background presets (`#F5F0E8` cream, `#C9A96E` tan, `#8B6347` brown, `#3D1F0D` espresso, `#E8DDD0` light warm gray); high-contrast readable colors for font color presets (`#FFFFFF` white, `#1A1A1A` near-black, `#C0392B` existing red, `#1A5276` deep blue, `#145A32` deep green).

- **Default chord font color** → Existing codebase default: `#C0392B` (light mode, from `.chord-item { color: #c0392b }` in globals.css); `var(--brand-cream)` (dark mode, from `.dark .chord-item { color: var(--brand-cream) }`).

- **useFontSize min/max bounds and defaults** → From `src/hooks/useFontSize.ts`: MIN_SIZE=12, MAX_SIZE=48, DEFAULT_SIZE=16, STEP=2. Chord font size control should follow the same bounds and step.

- **localStorage key naming convention** → Existing `useFontSize` hook uses key `"saliw-font-size"` (camelCase prefix pattern). New hooks should follow: `"saliw-chord-font-size"`, `"saliw-chord-bg"`, `"saliw-chord-color"`.

- **Existing font size adjuster component** → Reuse pattern from `useFontSize.ts` (lines 37–49) — lazy initializer function passed to `useState`. No separate "adjuster UI component" exists; the Font tab must directly render increase/decrease/reset buttons using the hook's returned controls.

- **Setlist viewer header location** → `src/app/setlists/[id]/SetlistViewerClient.tsx`, lines 116–177. Gear icon button must be added to the header flex row at line 121, positioned after the "Hide Chords" button (line 175).

---

## Resolution

- **Completed:** 2026-05-24
- **Branch:** `feature/TASK-040-setlist-settings-modal`
- **Base branch:** `develop`
- **Files changed:**
  - `src/hooks/useChordFontSize.ts` — New hook, parallel to useFontSize; localStorage key `"saliw-chord-font-size"`; BUG-001 lazy initializer
  - `src/hooks/useChordColor.ts` — New hook for chord background and font color presets; localStorage keys `"saliw-chord-bg"` and `"saliw-chord-color"`; BUG-001 lazy initializers
  - `src/components/client/SetlistSettingsModal.tsx` — New two-tab modal (Font/Chords); gear-button focus trap; Escape + backdrop dismiss; ARIA role=dialog; BUG-007 handlers declared before useEffects
  - `src/styles/globals.css` — Converted `.chord-item` hardcoded colors to CSS custom properties: `color: var(--chord-color, #c0392b)`, `background-color: var(--chord-bg, transparent)`, `font-size: var(--chord-item-font-size, inherit)`; dark mode defaults preserved
  - `src/components/SongViewer/ChordSheetClient.tsx` — Added optional props `fontSize`, `onIncreaseFont`, `onDecreaseFont`, `onResetFont`, `chordFontSize`, `chordBg`, `chordColor`; uses injected values when provided, falls back to internal `useFontSize` hook for standalone use (library/editor pages); added CSS variable injection effects for `--chord-color`, `--chord-bg`, `--chord-item-font-size`
  - `src/components/client/SetlistSongSection.tsx` — Added prop chain for font size and chord color/bg props; passes them through to ChordSheetClient
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — Added Settings gear icon button (lucide-react `Settings`); lifted `useFontSize`, `useChordFontSize`, `useChordColor` hooks to this level (AM-1 fix); wires all settings to SetlistSongSection; renders SetlistSettingsModal
- **Notes:**
  - The `useFontSize` hook is kept in `ChordSheetClient` as an always-called fallback (Rules of Hooks), but its return value is only used when no `fontSize` prop is injected. This preserves backward compatibility with the standalone song library viewer and song editor pages which do not pass font size props.
  - The `--chord-item-font-size` CSS variable controls chord token font size independently of the lyric/display font size (`--chord-font-size`). The chord display container receives both variables.
  - All modal color classes use CSS variable arbitrary-value syntax (`text-[var(--brand-espresso)]`) instead of named Tailwind utilities to avoid needing explicit `dark:` pairs — consistent with the AppendSongsModal pattern.
  - Section label and control button classes do use named Tailwind utilities (`text-brand-brown dark:text-brand-tan`, `text-brand-espresso dark:text-brand-cream`, `bg-brand-cream dark:bg-brand-espresso`) with explicit `dark:` pairs per BUG-004 rule.
  - Swatch button colors are applied via inline `style={{ backgroundColor: preset.value }}` (hex literals), which are not affected by the `.dark` class — borders and focus rings on swatches use named utilities with dark pairs.
  - Gear button toggle behavior: pressing it again closes the modal (aria-pressed toggle), and it also functions as the focus-return target on Escape/backdrop close.
  - **AC-8 fix (2026-05-24):** Added missing `dark:text-brand-espresso` companion to two `text-brand-espresso` occurrences in swatch checkmark ternaries (bg-swatch line ~441 and color-swatch line ~500). BUG-004 compliance restored.
