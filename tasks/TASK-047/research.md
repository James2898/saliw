# Research — YouTube Link Field & Collapsible Embed Player (TASK-047)

## Open Questions

- **Pending Reconciliation** — Does the existing `songs` table SELECT RLS policy allow public (unauthenticated) reads, or is it restricted to `authenticated` users only? This determines whether `youtube_url` is visible to unauthenticated visitors without a policy change. (suggested resolution source: `supabase/migrations/` — grep for `songs` + `SELECT` policy; or `src/app/actions/songActions.ts` — check if it guards with session before querying)

- **Pending Reconciliation** — What is the exact name and file path of the Server Action(s) that update song fields (e.g. `updateSong`)? Needed to determine whether `youtube_url` can be added to an existing action or requires a new dedicated action. (suggested resolution source: `src/app/actions/songActions.ts`)

- **Pending Reconciliation** — What is the exact component file path for the setlist viewer song card (the component that renders a single song row/card in the setlist view)? Needed to locate where the toggle button and embed must be injected. (suggested resolution source: `src/app/setlists/[id]/` directory — explorer to identify the correct component)

- **Pending Reconciliation** — What is the exact component file path for the song viewer page (individual song detail view)? (suggested resolution source: `src/app/library/[id]/` or similar — explorer to confirm)

- **Pending Reconciliation** — Does the auto-scroll feature expose a hook or context value (e.g. `isScrolling`, `isActive`) that a new embed component can consume to implement AC-23–26? Or must the embed component subscribe to a different mechanism? (suggested resolution source: `src/hooks/useAutoScroll.ts` or equivalent; also check `src/components/client/AutoScrollToolbar.tsx`)

- **Pending Reconciliation** — What existing modal component (if any) is used for other add/edit flows (e.g. setlist settings modal)? The new YouTube link modal should reuse the same modal primitive to stay consistent with the Artisan design system. (suggested resolution source: `src/components/` — grep for modal/dialog components used in TASK-040 setlist settings)

- **Pending Reconciliation** — What is the exact string/value used to identify the `music_director` role in role-check guards throughout the codebase? Must match the existing convention exactly to avoid a repeat of the TASK-018 code-string mismatch. (suggested resolution source: `src/app/actions/` or `src/hooks/` — grep for role check patterns; `MEMORY.md` does not specify the exact string)
