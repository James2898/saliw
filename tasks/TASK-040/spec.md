# Spec — Setlist Viewer Settings Modal

## Feature Summary

Add a gear icon to the setlist viewer header, positioned at the far right of the row that contains the date and the "hide all chords" button. Clicking the gear icon opens a modal with two tabs: **Font** and **Chords**. The Font tab reuses the existing font size adjuster component and also exposes an independent chord font size control. The Chords tab exposes preset chord background color and chord font color pickers (5 presets each), plus a "no background" option for the chord background. All settings are client-side display preferences stored in `localStorage`; no Supabase writes are required.

---

## Acceptance Criteria

### Gear Icon & Modal Shell

1. A gear icon button is rendered at the far right of the setlist viewer header row, inline with the setlist date and the "hide all chords" button. It must not displace existing controls or cause a layout shift.
2. The gear icon button has an accessible `aria-label` (e.g. `"Open display settings"`).
3. Clicking the gear icon opens the settings modal. The modal renders as an overlay; the setlist content behind it remains visible but non-interactive while the modal is open.
4. The modal can be dismissed by (a) clicking the gear icon again, (b) clicking a visible close button inside the modal, or (c) pressing the Escape key.
5. The modal contains exactly two tabs: **Font** and **Chords**.
6. Switching between tabs does not reset any setting — all tab states persist while the modal is open.
7. All changes to settings apply immediately (live preview) — there is no Save/Apply button.
8. The modal uses Artisan palette styling (cream/tan/brown/espresso) consistent with the rest of the setlist viewer. All named Tailwind brand utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must include explicit `dark:` variants (per BUG-004/BUG-005).

### Font Tab

9. The Font tab contains the existing font size adjuster component, reused without duplication. It controls the global lyric/song-body font size for all songs in the current setlist view (it overrides per-song sizes rather than applying an offset on top of them).
10. The Font tab also contains a separate, independent chord font size control. This control adjusts the rendered font size of chord tokens (`<span class="chord-item">`) independently of the lyric font size.
11. Both font size controls (lyric and chord) have visible minimum and maximum bounds. The exact min/max values are `<must match codebase convention — see context.md "Patterns to Follow">` (explorer to confirm from existing `useFontSize` hook).
12. Both font size controls display the current size value numerically so the user can see the exact value they have selected.

### Chords Tab

13. The Chords tab contains a chord background color picker showing exactly 5 preset color swatches plus a clearly labeled "No background" option (6 total choices). The "No background" option is a distinct choice co-located with the 5 presets, not a separate toggle that removes the picker.
14. The Chords tab contains a chord font color picker showing exactly 5 preset color swatches.
15. The 5 preset chord background colors are: `<must match codebase convention — see context.md "Color Presets">`. Pending Reconciliation: the explorer must confirm whether Artisan palette or general-purpose highlight colors are more appropriate for chord readability in the existing chord sheet context. Suggested resolution: check `src/styles/` and existing chord-item CSS for current background treatment.
16. The 5 preset chord font colors are: `<must match codebase convention — see context.md "Color Presets">`. Same pending reconciliation as AC-15.
17. Selecting a preset applies it immediately (live preview on the open setlist).
18. Exactly one background color choice is active at a time (single-select). Exactly one font color choice is active at a time (single-select). The currently selected choice has a distinct visual indicator (e.g. a checkmark or highlighted border).

### Default State

19. On first load (no stored preference), the default chord background color is **no background** (transparent/none) and the default chord font color is the existing Artisan chord color already rendered by the codebase — `<must match codebase convention — see context.md "Patterns to Follow">` (explorer to confirm current chord-item CSS class default color).
20. On first load (no stored preference), the default lyric font size and chord font size match the existing defaults already used by the codebase.

### Persistence

21. All four preference values (lyric font size, chord font size, chord background color, chord font color) are stored in `localStorage` and restored on subsequent page loads.
22. `localStorage` reads for all four preferences must use a lazy `useState` initializer — `useState(() => readValue())` — not a `useEffect` + `setState` pattern (per BUG-001). The initializer must return the default value when `window` is undefined (SSR-safe).
23. Keys used to store preferences in `localStorage` are `<must match codebase convention — see context.md "Patterns to Follow">` (explorer to confirm existing key name convention used by `useFontSize`, e.g. whether keys are prefixed, camelCase, etc.).

### Scope / Isolation

24. The settings modal and its state are scoped to the setlist viewer. Navigating away from the setlist view and returning does not reset preferences (they are restored from `localStorage`).
25. The chord color and chord font size settings apply only to chord tokens rendered inside the setlist viewer. They must not bleed into the song library, search, or any other page.

---

## Out of Scope

- Saving preferences to Supabase / user profile (no DB writes).
- Per-song font size or color overrides (settings are global across all songs in the viewer).
- Custom color picker / hex input (only the 5 presets plus "no background" are provided).
- More than two tabs in the modal.
- Any new backend endpoints, RLS policies, or Server Actions.
- Changing the "hide all chords" button behavior or placement.

---

## Fallback Behaviors

- No backend dependency exists for this feature; all fallbacks are N/A.
- If `localStorage` is unavailable (e.g. private browsing in some browsers), the feature degrades gracefully: settings apply for the session but are not persisted. No error is shown to the user.

---

## Resolved Ambiguities

- **Tab labels** — Resolved: tabs are named **Font** and **Chords** (from user's description: "the font tab", "chord background color and font color adjuster").
- **Modal close behavior** — Resolved: changes apply immediately (live preview); no Save/Apply button. Sourced from user's implied UX pattern ("adjuster" language implies live feedback) and absence of any mention of a save step.
- **"No background" as 6th choice vs. separate toggle** — Resolved: "No background" is a 6th distinct choice co-located with the 5 presets on the background color row (not a toggle that hides the row). The user said "there's an option also to have no background color for the chords," implying it is part of the same selection group.
- **Scope of lyric font size** — Resolved: global override for all songs in the setlist view (not a per-song offset). The user said "it's for all the songs in the setlist."
- **Chord font size vs. lyric font size** — Resolved: two fully independent controls. The user explicitly said "there's a separate option on the font tab, regarding the font size of the chords," which implies independence, not a ratio or offset.
- **Settings persistence** — Open Question (Blocking) resolved below — see research.md. Defaulting to `localStorage` based on BUG-001's existing pattern (`useFontSize` already uses `localStorage`), which confirms the project already adopted this approach.
- **BUG-001 compliance** — All `localStorage` reads must use lazy `useState` initializers, not `useEffect` + `setState`. Sourced from `MEMORY.md` BUG-001.
- **Dark mode variants** — All named Artisan Tailwind utilities in the modal must carry explicit `dark:` pairs. Sourced from `MEMORY.md` BUG-004/BUG-005.

---

## Open Questions

- **Pending Reconciliation** — What are the 5 preset chord background colors and 5 preset chord font colors? Should they be drawn from the Artisan palette or be general-purpose highlight colors? (suggested resolution source: `src/styles/globals.css` or equivalent for CSS variable definitions; `src/` for chord-item existing color treatment; ask user if explorer finds no existing convention).
- **Pending Reconciliation** — What is the current default chord token color (the `chord-item` class color in the existing codebase)? This is needed for AC-19 to specify the correct default font color fallback. (suggested resolution source: `src/styles/` or the chord sheet component file for `.chord-item` CSS).
- **Pending Reconciliation** — What are the existing min/max bounds in the `useFontSize` hook (for AC-11)? (suggested resolution source: `src/hooks/useFontSize.ts`).
- **Pending Reconciliation** — What `localStorage` key naming convention does the existing `useFontSize` hook use? (suggested resolution source: `src/hooks/useFontSize.ts`, look for the key literal passed to `localStorage.getItem`).
- **Pending Reconciliation** — Which exact component file is the existing font size adjuster, and what props does it accept? Required so the Font tab can reuse it without duplication. (suggested resolution source: search `src/components/` for a font size adjuster or slider component).
- **Pending Reconciliation** — Which file is the setlist viewer header component where the gear icon must be inserted? (suggested resolution source: `src/app/setlists/[id]/` page and associated client components).
- **Blocking** — Should the 5 preset chord background colors and 5 preset chord font colors be from the Artisan palette (cream, tan, brown, espresso, and a 5th derived color) or general readability colors (e.g. yellow, blue, green, pink, white)? This is a product/design decision that cannot be inferred from the codebase alone. User input required because it affects the visual identity of the chord sheet and the PM's context did not specify a direction.
