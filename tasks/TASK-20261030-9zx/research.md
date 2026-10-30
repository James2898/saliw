<Research — Navbar Auth State Synchronization After Login>
## Open Questions
- What is the exact fallback greeting text used in `src/components/client/navbar.tsx` when user profile is loading or missing (`"Hi, there!"` vs other format)? → Resolved from context: [Pending Reconciliation — codebase-explorer to inspect `src/components/client/navbar.tsx`]
- How is role gating for `/musicians` currently evaluated in `src/components/client/navbar.tsx` (e.g., `profile?.role === 'music_director'` or user app metadata)? → Resolved from context: [Pending Reconciliation — codebase-explorer to inspect `src/components/client/navbar.tsx`]
- Are there any blocking questions requiring user decision? → Resolved from context: None. All product scope decisions resolved via `/design-grill` (Q1.1–Q1.7).