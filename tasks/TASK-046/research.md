# Research — Worship Leader & Lineup Assignment on New Setlist Form

## Open Questions

- **Pending Reconciliation** — Does `SetlistBuilderClient.handleSave` perform the redirect via Next.js `router.push()` or `redirect()` from `next/navigation`? The answer determines whether the change is a string literal replacement or requires a different call. (Suggested resolution source: `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — search for `router.push` or `redirect(` in the CREATE branch of `handleSave`)
- **Pending Reconciliation** — Does the edit page at `src/app/setlists/[id]/edit/page.tsx` perform an auth guard that would send a non-music-director back to the view page or a 404? If so, AC-7 should reference that redirect behavior explicitly. (Suggested resolution source: `src/app/setlists/[id]/edit/page.tsx` — check for role guard near top of component)
- **Pending Reconciliation** — Does `SetlistBuilderClient` await song additions sequentially or in parallel before redirecting? AC-10 assumes they complete before redirect; confirm the implementation matches. (Suggested resolution source: `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — `handleSave` CREATE branch, look for `await` on song add calls)
