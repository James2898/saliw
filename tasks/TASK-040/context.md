# Context Bundle — Setlist Viewer Settings Modal (Gear Icon + Font/Chord Tabs)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | The Client Component that renders the setlist header (date, Hide Chords button, Pencil/Edit link) — the gear icon and modal trigger go here |
| `src/hooks/useFontSize.ts` | The existing font-size hook to reuse; exposes `fontSize`, `increase`, `decrease`, `reset`; persists to localStorage under key `"saliw-font-size"` |
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders chord tokens via `.chord-item` spans; font size is applied as a CSS variable `--chord-font-size` via `sheetRef.current?.style.setProperty`; chord color/background is currently controlled by globals.css only |
| `src/components/client/AppendSongsModal.tsx` | The most complete modal pattern in the codebase — backdrop + dialog panel, focus trap, Escape dismiss, aria-modal, `role="dialog"`, z-[80]/z-[90] layering |
| `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` | Simpler modal pattern (no scroll body); use as a secondary modal reference |
| `src/components/client/logout-modal.tsx` | Third modal reference; identical accessibility boilerplate to CloneSetlistDialog |
| `src/components/client/button.tsx` | Shared Button component with `variant` (primary/secondary/ghost) and `size` (sm/md/lg) props; supports `forwardRef` |
| `src/styles/globals.css` | Defines `.chord-item` color (`#c0392b` light / `var(--brand-cream)` with `var(--brand-brown)` bg dark), `.chord-display` CSS variable `--chord-font-size`, and all brand color tokens |
| `src/components/client/SetlistSongSection.tsx` | Wraps ChordSheetClient; passes `externalChordsHidden` and `injectedAutoScroll` down; shows the chord rendering chain |

## Reuse Candidates

- `src/hooks/useFontSize.ts` — Reuse directly for the "Font" tab body-text font size control. For the new chord-specific font size, create a parallel hook (e.g. `useChordFontSize`) with a different localStorage key (`"saliw-chord-font-size"`) following the exact same lazy-initializer pattern. Do NOT add a second size to the existing hook; that would change the hook's current contract and break ChordSheetClient's direct import.
- `src/components/client/AppendSongsModal.tsx` — The canonical modal shell pattern to copy: backdrop `fixed inset-0 z-[80]`, panel `fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, `role="dialog"` + `aria-modal="true"` + `aria-labelledby`, focus-to-first-element on open, Escape key + Tab focus trap, backdrop click dismiss.
- `src/components/client/button.tsx` — Use `variant="ghost"` size="sm"` for the modal close/cancel button. The gear trigger button itself should follow the inline button pattern already used for the Hide Chords button in `SetlistViewerClient.tsx` (lines 155–175).

## Patterns to Follow

- **Modal shell pattern:** See `src/components/client/AppendSongsModal.tsx` lines 37–49 (panelClass, backdropClass, z-index layering). All modals in this codebase use `z-[80]` for backdrop and `z-[90]` for the panel.
- **localStorage persistence (SSR-safe):** See `src/hooks/useFontSize.ts` lines 37–49 — use `useState(readStoredValue)` lazy initializer, never `useEffect` + `setState`. This is the BUG-001 fix pattern and is mandatory.
- **CSS variable injection (no re-render):** See `ChordSheetClient.tsx` lines 164–168 — apply CSS variables via `ref.current?.style.setProperty(...)` in a `useEffect`, not as inline `style` props on individual chord spans. For chord background/font color, add new CSS variables (e.g. `--chord-bg-color`, `--chord-color`) to `.chord-item` in globals.css and set them on the `.chord-display` container ref in the same pattern.
- **Inline header button style:** See `SetlistViewerClient.tsx` lines 155–175 (the Hide Chords button) — the gear icon button must match this exact button shape: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200 focus-visible:ring-2`.
- **Function declaration before useEffect (React Compiler guard):** See `AppendSongsModal.tsx` line 163 comment "declared BEFORE useEffects (BUG-007)". All helper callbacks must be declared before any `useEffect` that references them.
- **useCallback dep arrays — whole object, not property path:** See MEMORY.md BUG-002. In any `useCallback`, depend on the whole object (e.g. `[autoScroll]`), never on `[autoScroll.pause]`. The React Compiler rejects property-path deps.
- **Dark mode — explicit `dark:` pairs required:** See MEMORY.md BUG-005. Every `text-brand-*`, `bg-brand-*`, and `border-brand-*` Tailwind utility used in the new modal and gear button must have a corresponding `dark:` variant. Do not rely on CSS variable switching alone.
- **Icon import:** See `SetlistViewerClient.tsx` line 6 — the project uses `lucide-react`. The correct icon for a settings/gear trigger is `Settings` (gear with cog teeth, https://lucide.dev/icons/settings) or `Settings2` (two sliders with circles). `Settings` is the conventional choice; `Settings2` is available as a less common alternative. No `Cog` or `Gear` export exists in this version.

## Anti-Patterns Flagged

- `src/components/SongViewer/ChordSheetClient.tsx` line 103–106: `useFontSize()` is called directly inside `ChordSheetClient`. If the new settings modal also calls `useFontSize()` at the setlist level (in `SetlistViewerClient.tsx`) to control body font, there will be two separate hook instances with separate state — both reading from the same localStorage key `"saliw-font-size"`. This is a state duplication risk, not a bug today, but the developer must decide: (a) lift `useFontSize` into `SetlistViewerClient` and pass `fontSize` + controls down as props to `ChordSheetClient`, or (b) keep both hook instances and accept that the modal controls will update localStorage but ChordSheetClient's own instance won't re-read until remount. Option (a) is architecturally cleaner. Do not replicate the dual-instance pattern without consciously choosing.
- `src/styles/globals.css` lines 98–108: `.chord-item` color and background are currently hardcoded (`color: #c0392b`, `.dark .chord-item { color: var(--brand-cream); background-color: var(--brand-brown); }`). The new chord color presets must NOT patch these rules with additional CSS classes — instead, convert the hardcoded values to CSS variables (e.g. `--chord-color`, `--chord-bg`) that default to the current values, so the DOM mutation approach in ChordSheetClient can override them per-instance. Never use inline `style` on individual `.chord-item` spans — the transposition effect only mutates `innerText`, and a mix of ref + inline style would require touching every span on every color change.
- `src/components/SongViewer/ChordSheetClient.tsx` line 171: `const chordDisplayClass = ["chord-display", chordsHidden && "chords-hidden"].filter(Boolean).join(" ")` — the class string is built inline in render. Do not add a third dynamic class (e.g. a color preset class) to this same inline array; extract all dynamic class building to a `useMemo` to keep the pattern readable.

## MEMORY.md Notes

Relevant prevention rules for this feature:

- **BUG-001 (useState lazy initializer):** Any new hook that reads from localStorage for chord color or chord font size MUST use `useState(readStoredValue)` lazy initializer — never `useEffect(() => setState(localStorage.getItem(...)))`. The React Compiler will reject the latter as a build error on Vercel.
- **BUG-002 (React Compiler useCallback deps):** In the new modal component, `useCallback` deps must reference whole objects, not property paths. If the modal receives a `fontSizeControls` prop object, depend on `[fontSizeControls]` not `[fontSizeControls.increase]`.
- **BUG-005 / BUG-004 (dark mode named utilities):** Every Tailwind named color utility in the modal and gear button must have an explicit `dark:` pair. Color picker swatches using inline hex colors (for the preset chord colors) will not be affected by the `.dark` class — but their labels and borders will be. Audit every `text-brand-*` / `bg-brand-*` / `border-brand-*` in the new component before merging.
- **BUG-007 (React Compiler forward references):** In the new modal, declare all `useCallback` and handler functions BEFORE the `useEffect` blocks that reference them. The React Compiler treats forward references as build errors.
- **BUG-006 (MEMORY.md Tailwind scanning):** Do not write Tailwind arbitrary-value class patterns with wildcard `*` in any file at or below the project root — Tailwind v4 will attempt to emit CSS from them. When describing preset color classes in code comments, use a concrete specific example, not a wildcard pattern.
- **Formatting (Prettier):** Run `npm run format` before every commit. The `.prettierrc` config is present and Prettier v3 is installed.
