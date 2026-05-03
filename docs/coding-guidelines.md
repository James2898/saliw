# Coding Guidelines — Saliw Music Portal

> **Read when:** writing or reviewing any code in this project. These rules ensure musical integrity, SSR safety, and adherence to the Artisan design system.

---

## General Principles

- **Readability Over Cleverness:** Prefer explicit, descriptive code that another musician/developer can understand.
- **Error Handling:** Never silently swallow errors. User-facing messages must be helpful (e.g., "Unable to sync setlist") rather than raw technical strings.
- **Single Responsibility:** Keep components and functions focused. Extract musical math to `utils/`.

---

## Naming Conventions

| Scope                 | Convention   | Example              |
| --------------------- | ------------ | -------------------- |
| Files (general)       | `kebab-case` | `setlist-viewer.tsx` |
| React Components      | `PascalCase` | `ChordSheet.tsx`     |
| Variables / Functions | `camelCase`  | `shiftChord`         |
| Types / Interfaces    | `PascalCase` | `SongData`           |
| CSS Variables         | `kebab-case` | `--brand-tan`        |
| Database Tables       | `snake_case` | `setlist_songs`      |

---

## Frontend (Next.js + TypeScript)

### Component Boundaries (SSR Safety)

- **Server Components (Default):** Use for all data fetching (Setlists, Song Library). Pre-render chords whenever possible.
- **Client Components (`'use client'`):** Use only for interactivity:
  - Live Transposition toggles.
  - Modals and Form inputs.
  - Realtime WebSocket listeners.
- **Hydration:** Ensure `shiftChord` logic produces identical strings on Server and Client to prevent hydration mismatch.

### Styling (Tailwind CSS v4 + Artisan System)

- **Brand Colors:** Always use brand variables.
  - Cream: `#FDF8F3` (`--brand-cream`)
  - Tan: `#BC8E5C` (`--brand-tan`)
  - Brown: `#835B43` (`--brand-brown`)
  - Espresso: `#2D1F1B` (`--brand-espresso`)
- **Dark Mode:** In dark mode, the page background is `--brand-darker` while card containers use `--brand-espresso` for depth.
- **Typography:** Use 'Plus Jakarta Sans' for UI and 'JetBrains Mono' for chord sheets to ensure alignment.

---

## Musical Integrity

### Transposition Logic

- **Regex:** Always use the shared `chordRegex` in `src/utils/musicLogic.ts`. Do not write custom regex for chord detection in components.
- **Performance Keys:** The `performanceKey` is the target. Always calculate the semitone offset relative to the song's `original_key`.
- **Note System:** Use the 12-note chromatic scale: `C, C#, D, D#, E, F, F#, G, G#, A, Bb, B`.

### Chord Sheets

- Wrap chords in `<span class="chord-item">` to apply brand styling and transposition targeting.
- Maintain `white-space: pre` or `white-space: pre-wrap` for chord-over-lyric alignment.

---

## Backend & Data (Supabase)

### Mutations (Server Actions)

- Use **Server Actions** for all database mutations (creating setlists, adding songs).
- Implement optimistic updates in the UI for a "snappy" feel, but roll back on server failure.

### Security (RLS)

- **Permissions:** Creation and editing are restricted to users with the `music_director` role.
- **Policies:** Verification of the `auth.uid()` must be handled via Supabase Row Level Security (RLS), not just hidden in the UI.

---

## Workflow Rules

- **Base branch:** Always target `main`.
- **Branching:** `feature/task-title` or `bug/task-title`.
- **Formatting:** Run `npm run format` before every commit. Prettier (v3, config in `.prettierrc`) is the formatter. Never commit unformatted files.
- **Validation:** Every task must be verified by `@validator-agent` for UI contrast and RLS security before being considered complete.

---

## Validator & Release Manager Audit Checklist (Saliw-Specific)

When `@validator-agent` or `@release-manager` audits code in this project, apply these checks in addition to generic security/performance rules:

### Security
- **RLS bypass:** Confirm no Server Action uses the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) on the frontend or in client-accessible code.
- **Role check:** All mutating Server Actions must enforce `music_director` role via RLS — not just hidden UI controls.
- **Auth session:** Confirm `@supabase/ssr` is used for server-side session access. Never use the browser client for server-side auth checks.

### Performance
- **N+1 on chord sheets:** Confirm transposition loops do not issue a Supabase query per chord or per song. Pre-fetch the full setlist in a single query.
- **Server vs Client boundary:** Data fetching must happen in Server Components. Client Components must not call Supabase directly unless using Realtime subscriptions.

### Musical Integrity
- **Hydration mismatch:** The `shiftChord` function must produce identical output on Server (initial render) and Client (live transposition). Any conditional logic that differs between environments will cause a React hydration error.
- **chordRegex:** All chord detection must use the shared `chordRegex` from `src/utils/musicLogic.ts`. Flag any inline regex for chord matching as a violation.
- **performanceKey offset:** Semitone offset must always be calculated relative to `original_key`, never hardcoded or relative to a prior transposition state.

### Architecture
- **Unhandled Promise rejections:** All Server Actions must have try/catch. Never allow a rejected Promise to propagate silently to the UI.
- **UI contrast:** All text on Artisan Palette backgrounds must meet WCAG AA contrast ratio. Flag any use of `--brand-tan` text on `--brand-cream` background (low contrast pair).
- **`--brand-darker`:** Dark mode backgrounds use `--brand-darker`. Confirm this CSS variable is defined in `src/styles/` before any code references it.
