# Context Bundle — Dark Mode Artisan Palette Audit

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/library/page.tsx` | PRIMARY BUG: `bg-brand-cream` on `<main>` at line 103 has no `dark:` variant — root cause of the reported issue |
| `src/app/layout.tsx` | Inline `style={{ backgroundColor: "#fdf8f3" }}` on `<body>` — intentional SSR anti-flash literal; not a bug |
| `src/app/profile/page.tsx` | No page-level background shell at all; text classes `text-brand-espresso` on lines 21 and 25 missing `dark:` |
| `src/components/client/EditProfileForm.tsx` | Multiple `text-brand-espresso` and `text-brand-brown` labels/inputs without `dark:` variants (lines 43, 50, 58, 67, 73, 76) |
| `src/components/client/SearchBar.tsx` | `bg-brand-cream` on input (line 67) — no `dark:bg-brand-espresso` |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | `bg-brand-cream` in `inputClass` (line 266) and date input (line 294) — no `dark:` variants |
| `src/components/client/SetlistBuilder/SetlistPanel.tsx` | `bg-brand-cream` on empty-state div (line 67) — no `dark:` variant |
| `src/components/client/SetlistBuilder/SortableSongRow.tsx` | `bg-brand-cream` on row div (line 38) and performance key `<select>` (line 73) — no `dark:` variants |
| `src/components/client/SetlistBuilder/LibraryPanel.tsx` | `bg-brand-cream` on search input (line 75) and song row div (line 94) — no `dark:` variants |
| `src/components/client/SetlistBuilder/ErrorBanner.tsx` | `bg-brand-cream` (line 12) — no `dark:` variant |
| `src/components/client/LoginForm.tsx` | Active toggle buttons use `bg-brand-tan` (lines 80, 91) — no `dark:` variants |
| `src/components/client/button.tsx` | `primary` variant `bg-brand-tan` and `secondary` variant `bg-brand-espresso` — no `dark:` variants (review intended behavior before changing) |
| `src/components/client/NewSongFormClient.tsx` | Submit button `bg-brand-tan` (line 184) — no `dark:` variant |
| `src/components/library/NewSongButton.tsx` | Both desktop and FAB use `bg-brand-tan` (lines 60, 87) — no `dark:` variants |
| `src/components/setlists/NewSetlistButton.tsx` | Both desktop and FAB use `bg-brand-tan` (lines 38, 59) — no `dark:` variants |
| `src/components/dashboard/GreetingStrip.tsx` | `rolePillClasses` Musician branch `bg-brand-tan text-brand-espresso` (line 18) — no `dark:` variant |
| `src/styles/globals.css` | Source of truth: `--brand-background`, `--brand-card-bg`, `--brand-text` semantic tokens correctly switch in `.dark` |

## Reuse Candidates

- `src/app/library/[id]/page.tsx` line 111 — Already correctly uses `bg-brand-cream dark:bg-brand-darker` on `<main>`; this is the direct fix template for `src/app/library/page.tsx` line 103.
- `src/components/client/SongEditorClient.tsx` `inputBaseClass` — Already uses `bg-brand-cream dark:bg-brand-espresso` for inputs; the SetlistBuilder inputs (`SetlistBuilderClient`, `SortableSongRow`, `LibraryPanel`) should adopt the exact same class string.
- `src/components/client/SongEditorClient.tsx` `panelClasses` — `bg-brand-cream dark:bg-brand-espresso` for card panels; copy for `SetlistPanel` empty-state and `ErrorBanner`.
- `src/components/dashboard/GreetingStrip.tsx` lines 16–17 — Music Director pill already has `dark:bg-brand-tan dark:text-brand-espresso`; the Musician pill (line 18) should add analogous `dark:bg-brand-brown dark:text-brand-cream` (or whichever dark variant matches the design intent).

## Patterns to Follow

- **Page shell pattern**: See `src/app/library/[id]/page.tsx` line 111 — `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker ...">`. Every `<main>` or top-level page wrapper must pair `bg-brand-cream` with `dark:bg-brand-darker`.
- **Card/input bg pattern**: See `src/components/client/SongEditorClient.tsx` `panelClasses` and `inputBaseClass` — always `bg-brand-cream dark:bg-brand-espresso` for card-depth and form elements.
- **Primary text pattern**: `text-brand-espresso dark:text-brand-cream` for headings and primary labels.
- **Secondary text pattern**: `text-brand-brown dark:text-brand-tan` for metadata and secondary labels.
- **CSS-variable arbitrary values**: `bg-[var(--brand-background)]` and `bg-[var(--brand-tan-alpha)]` switch automatically via `.dark` root class and do NOT need `dark:` pairing — see `navbar.tsx` and `logout-modal.tsx` for correct usage.

## Anti-Patterns Flagged

- `src/app/library/page.tsx` line 103: `<main className="min-h-screen bg-brand-cream ...">` — bare `bg-brand-cream` on a page shell without `dark:bg-brand-darker`. This is the exact bug being fixed. Do not write bare `bg-brand-cream` on page shells.
- `src/components/client/EditProfileForm.tsx` lines 43, 50, 58, 67, 73, 76: All label/input text classes use `text-brand-espresso` / `text-brand-brown` without `dark:` — violates BUG-004 pattern.
- `src/app/profile/page.tsx` lines 21, 25: `text-brand-espresso` without `dark:text-brand-cream` on a page that has no bg shell of its own.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` lines 266, 294: `bg-brand-cream` in `inputClass` and date input — entire SetlistBuilder component family never received dark mode treatment.
- `src/components/client/LoginForm.tsx` lines 80, 91: Active mode toggle `bg-brand-tan text-brand-espresso border-brand-tan` — no `dark:` variants; active button becomes illegible in dark mode.

## MEMORY.md Notes

- **BUG-003**: Every return branch in a Server Component must independently include the layout shell. Confirmed: `src/app/library/page.tsx` has a single return path missing `dark:bg-brand-darker`.
- **BUG-004**: All 6 dashboard components previously used hard-coded Artisan palette classes without `dark:` variants — they are now fixed. The same pattern of omission is present in the Library page, Profile page, SearchBar, SetlistBuilder family, LoginForm toggle buttons, and NewSong/NewSetlist button components.
- **Key rule**: Tailwind named utilities (`bg-brand-cream`, `text-brand-espresso`, etc.) do NOT respond to the `.dark` class automatically. They must be paired with explicit `dark:` utilities. CSS-variable arbitrary values (`bg-[var(--brand-background)]`) DO switch automatically and need no `dark:` pair.
