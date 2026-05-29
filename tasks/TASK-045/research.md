# Research — One-Click Section Navigator Deck

## Open Questions

- **Pending Reconciliation** — What is the exact DOM structure and CSS selector for the top boundary of the visible song card? Is the scroll container `window` or a specific scrollable `div` inside the song viewer? (suggested resolution source: `src/app/songs/[id]/page.tsx` or the song viewer component, and any scroll container refs)

- **Pending Reconciliation** — Is there a fixed/sticky navbar or header that creates a pixel offset that `scrollTo` must subtract when anchoring a section header at the "top edge"? If so, what is the navbar height (px or CSS variable)? (suggested resolution source: `src/components/client/navbar.tsx` and any sticky layout wrappers in the song viewer route)

- **Pending Reconciliation** — What is the canonical format for section headers in the song body stored in the database? Specifically: are they `[Verse 1]`, `[VERSE 1]`, `[verse]`, or another format? Is there an existing regex or parser in `src/utils/musicLogic.ts` that already matches section headers, or must a new one be written? (suggested resolution source: `src/utils/musicLogic.ts` and the song body rendering component)

- **Pending Reconciliation** — Does the auto-scroll feature expose a `pause()` and `resume()` API via a React context? If so, what is the context name and import path? (suggested resolution source: `src/hooks/useAutoScroll.ts` or `src/contexts/AutoScrollContext.tsx` — see TASK-041/042 artifacts)

- **Pending Reconciliation** — On desktop, does the chord drawer (TASK-043/044) occupy a fixed right-hand width when open? What is its open width in px or as a CSS variable, and does it use `position: fixed` or flow layout? (suggested resolution source: `src/components/client/ChordDrawer.tsx` or equivalent from TASK-043/044)

- **Pending Reconciliation** — Is there an edit mode on the song viewer page that would suppress the Navigator Deck? If so, how is it signalled — via a URL parameter (e.g., `?mode=edit`), a React context, or a prop passed down from a parent layout? (suggested resolution source: `src/app/songs/[id]/page.tsx` or the song viewer component tree)

- **Pending Reconciliation** — Where exactly should the mobile horizontal banner be positioned relative to the auto-scroll FAB? Does the FAB have a fixed bottom offset that conflicts with a bottom-anchored banner? (suggested resolution source: `src/components/client/AutoScrollToolbar.tsx` and the song viewer layout)
