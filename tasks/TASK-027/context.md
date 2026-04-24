# Context Bundle — Move Follow Leader to Header + Restore Original Go Live Styling

> Follow-up to TASK-026. Task ID: pending (Tier 0 skips task-logger).

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/ServiceNavigator.tsx` | Current location of the Follow Leader button (lines 395–457) and its state/handlers (lines 260–287). Also the source, via `git show 1877123^:`, of the ORIGINAL pre-TASK-026 Go Live styling. |
| `src/components/client/GoLiveButton.tsx` | Component created in TASK-026 (lines 218–265) containing the new cream-header styling that must be reverted to the original toolbar palette. |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Header flex row (lines 80–105) where `GoLiveButton` was moved; target landing zone for the Follow Leader button. Owns `useSetlistSync` and already passes both `sync.isFollowing` / `toggleFollow` / `isStateChecking` / `followError` / `followSyncStatus` down to `ServiceNavigator` (lines 113–124). |
| `src/app/setlists/[id]/page.tsx` | Server Component; delegates header to `SetlistViewerClient`. `isLeader` and `isAuthenticated` are already threaded in via props — no change needed there. |
| `tasks/TASK-026/context.md` | Prior bundle with line refs and patterns to follow. |

## Reuse Candidates

### Follow Leader move — lift from ServiceNavigator, mirror GoLiveButton pattern
- `src/components/client/ServiceNavigator.tsx` lines 260–287 — Complete Follow Leader interaction unit to lift:
  - State: `const [showFollowDialog, setShowFollowDialog] = useState(false)` (line 260)
  - Ref: `const followButtonRef = useRef<HTMLButtonElement>(null)` (line 263)
  - Handlers: `handleFollowClick` (266–272), `handleFollowConfirm` (274–278), `handleFollowCancel` (280–284)
  - Direction-aware content: `const followDialogContent = sync.isFollowing ? followOffDialog : followOnDialog` (line 287)
  - Dialog content map: `followOnDialog` / `followOffDialog` (lines 197–209)
- `src/components/client/ServiceNavigator.tsx` lines 395–457 — Follow Leader JSX block (guarded by `{!isLeader && (…)}`), including the synced-dot indicator (434–438), `followError` alert (444–448), and "Lost connection" hint (451–455). Lift wholesale.
- `src/components/client/ServiceNavigator.tsx` lines 463–473 — `<ConfirmDialog>` instance for Follow Leader. Lift alongside handlers.
- `src/components/client/GoLiveButton.tsx` — Exact structural precedent. A new `FollowLeaderButton.tsx` component sibling to `GoLiveButton.tsx` is the lowest-risk shape: same `'use client'`, same `ConfirmDialog` copy, same `flex flex-col items-end gap-1` wrapper, same focus-restore pattern. Inverse gate: return `null` when `isLeader === true`.
- `src/app/setlists/[id]/SetlistViewerClient.tsx` lines 95–103 — Drop-in slot next to `<GoLiveButton>` in the header flex row. Needed sync shape for Follow: `isFollowing`, `isStateChecking`, `followError`, `followSyncStatus`, `toggleFollow`.

### Go Live styling restore — recovered from git history
Source: `git show 1877123^:src/components/client/ServiceNavigator.tsx` (i.e. the parent of commit `1877123 feat(setlist): move Go Live button from sticky toolbar to setlist header`).

The ORIGINAL Go Live button lived in the dark `bg-brand-espresso` toolbar, so its classes were designed for a dark background. The structural shell (size, border-radius, font, focus ring) is identical to the current `GoLiveButton.tsx`; only the three state-branch class strings differ.

Original (pre-TASK-026) state class strings, copied verbatim from the recovered file:

- **Disabled / connecting state** (old line ~458):
  ```
  text-brand-cream/60 border-brand-cream/20 cursor-not-allowed
  ```
  Current (TASK-026) replacement to revert:
  ```
  text-brand-espresso/40 dark:text-brand-cream/40 border-brand-espresso/20 dark:border-brand-cream/20 cursor-not-allowed
  ```

- **Active / LIVE state** (old line ~460):
  ```
  bg-red-600 text-white border-red-600 animate-pulse
  ```
  Current (TASK-026) replacement to revert:
  ```
  bg-brand-espresso text-brand-cream dark:bg-brand-cream dark:text-brand-espresso border-transparent animate-pulse
  ```
  Note: the original was a hard red `bg-red-600` + white text — a deliberate "broadcasting" signal that stood out on the espresso toolbar. This is the styling the user wants back.

- **Inactive / "Go Live" state** (old line ~461):
  ```
  [toggleInactiveClass, 'text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10 dark:text-brand-cream dark:border-brand-cream/30'].join(' ')
  ```
  Where `toggleInactiveClass` (old line ~43, module-level) was:
  ```
  text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10
  ```
  Current (TASK-026) replacement to revert:
  ```
  bg-brand-espresso/10 text-brand-espresso border-brand-espresso/30 hover:bg-brand-espresso/20 dark:bg-brand-cream/10 dark:text-brand-cream dark:border-brand-cream/30 dark:hover:bg-brand-cream/20
  ```
  WARNING — anti-pattern flagged in TASK-026 context (line 25 of `tasks/TASK-026/context.md`): the original concatenation of `toggleInactiveClass` with the cream overrides produces conflicting utilities (`text-brand-brown` vs `text-brand-cream`, `border-brand-brown/30` vs `border-brand-cream/30`, etc.). Tailwind's cascade resolves these by source order but the result is fragile. See the "Anti-Patterns Flagged" section below for recommendation.

- **Error `<p>`** (`sync.liveError`, old line ~480) — original className:
  ```
  text-xs text-red-500
  ```
  Current:
  ```
  text-xs text-red-500 dark:text-red-400
  ```
  Minor — original had no `dark:` variant. Restoring literally means dropping `dark:text-red-400`, but per BUG-004/BUG-005 prevention, keeping the `dark:` variant is safer. Recommend keeping `dark:text-red-400` unless user specifically wants bit-exact revert.

- **Label**: unchanged — `'Go Live'` (inactive), `'LIVE'` (active), `'Starting…'` (connecting). Icon for connecting state is `Loader2` with `size={12} className="animate-spin"` — identical in both versions.

- **Ref / a11y**: `goLiveButtonRef`, `aria-pressed`, `aria-label` branches — all identical between original and current. No change needed.

## Patterns to Follow
- **Header flex row:** See `src/app/setlists/[id]/SetlistViewerClient.tsx` lines 80–104 — `div className="flex items-center gap-3"` holds date, Edit Setlist link, and `GoLiveButton`. Drop `FollowLeaderButton` as the next sibling of `<GoLiveButton />` (line 103). Gate ordering: because `GoLiveButton` returns `null` when `!isLeader` and `FollowLeaderButton` should return `null` when `isLeader`, exactly one of the two will render — so placement order inside the flex row doesn't visually matter.
- **Inverse role gating:** Follow Leader is the MIRROR of Go Live. `GoLiveButton` early-returns `if (!isLeader) return null`. The new `FollowLeaderButton` must early-return `if (isLeader) return null`. Do NOT additionally gate on `isAuthenticated` at the button level — the current ServiceNavigator Follow block only checks `!isLeader` (line 396), and the prop is already plumbed if needed later.
- **Confirmation dialog:** Follow Leader already has a 2-branch `ConfirmDialog` (follow-on vs follow-off) identical in shape to Go Live's. It is NOT a one-tap toggle — the user is prompted "Follow the Leader?" / "Stop Following?" before `sync.toggleFollow()` fires. Preserve this behavior. See `ServiceNavigator.tsx` lines 197–209 (content map) and 463–473 (dialog instance).
- **Focus restoration:** `followButtonRef.current?.focus()` is called in both `handleFollowConfirm` (line 277) and `handleFollowCancel` (line 283). Replicate exactly as in `GoLiveButton.tsx` lines 206, 211.
- **Synced indicator:** Line 434–438 — green dot (`bg-green-500`, 2x2 rounded-full) rendered only when `sync.isFollowing && sync.followSyncStatus === 'synced'`. This is a Follow-specific indicator with no Go Live analog — carry it over.
- **Follow-specific hint lines:** `followError` alert (444–448) and "Lost connection." paragraph (451–455). Both live inside the same `flex flex-col items-end gap-1` wrapper as the button. Preserve this stacked layout.
- **React Compiler dep rule (BUG-002):** Any new `useCallback` in the extracted `FollowLeaderButton` component MUST depend on the whole `sync` object, never on `sync.toggleFollow` / `sync.isStateChecking` / `sync.isFollowing` individually. `GoLiveButton.tsx` lines 201, 207 already exemplify this.
- **Dark-mode pairing (BUG-004/005):** Because Follow Leader moves from the dark `bg-brand-espresso` toolbar onto the cream setlist header, every named Tailwind utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) needs an explicit `dark:` variant. The existing Follow classes were written for the dark toolbar (e.g. line 418 `text-brand-cream/60 border-brand-cream/20`, line 421 `text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10`) — these are cream-on-dark and will be near-invisible on the cream header. They must be rewritten in the header palette, mirroring the `toggleInactiveClass` convention: `text-brand-brown dark:text-brand-tan`, `border-brand-brown/30 dark:border-brand-tan/30`, `hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10` for the idle state; `toggleActiveClass` (line 41–42) `bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan` for the active (following) state.

## Shared style constants between Follow Leader and Go Live
- `toggleActiveClass` (module-level, `ServiceNavigator.tsx` lines 41–42) — currently used ONLY by Follow Leader active state (line 420). After TASK-026 the Go Live button was extracted and no longer uses `toggleActiveClass`. If Follow Leader also leaves `ServiceNavigator.tsx`, the constant will become dead code there — either move it with Follow Leader or promote to a shared module if the setlist/library/elsewhere reuses it. Quick audit via Grep suggests it is local to `ServiceNavigator.tsx`.
- `focusRing` (module-level, lines 44–45) — identical literal string exists in both `ServiceNavigator.tsx` (line 44) and `GoLiveButton.tsx` (lines 36–37). If extracting `FollowLeaderButton.tsx`, duplicate it there or promote all three to a shared `src/components/client/toggle-styles.ts` module (out of scope for Tier 0 unless user asks).
- `dialogPanelClass`, `dialogTitleClass`, `dialogBodyClass`, and the `ConfirmDialog` sub-component are literally duplicated between the two files today. Tier 0 scope: accept the duplication and move on. Flag for a future refactor.

## Follow Leader dependencies (exhaustive list for the move)
From `src/components/client/ServiceNavigator.tsx`:
1. Imports: `useState`, `useEffect`, `useRef`, `useCallback` from 'react'; `Loader2` from 'lucide-react'; `Button` from '@/components/client/button' (used inside ConfirmDialog).
2. Constants: `toggleActiveClass` (41–42), `focusRing` (44–45), `dialogPanelClass` (49–54), `dialogTitleClass` (56–57), `dialogBodyClass` (59–60).
3. Sub-component: `ConfirmDialog` (86–193) with its `ConfirmDialogProps` type (64–72).
4. Dialog content: `followOnDialog` (197–202), `followOffDialog` (204–209).
5. State: `showFollowDialog` (260).
6. Ref: `followButtonRef` (263).
7. Handlers (all three depend on `sync` as a whole per BUG-002): `handleFollowClick` (266–272), `handleFollowConfirm` (274–278), `handleFollowCancel` (280–284).
8. Derived: `followDialogContent` (287).
9. JSX: button block (398–441), `followError` alert (444–448), lost-connection hint (451–455), `<ConfirmDialog>` instance (463–473).
10. Props needed from parent (`sync` shape): `isFollowing: boolean`, `isStateChecking: boolean`, `followError: string | null`, `followSyncStatus: 'synced' | 'lost' | 'idle'`, `toggleFollow: () => void`. Plus `isLeader: boolean` for the inverse gate.

## Anti-Patterns Flagged
- `src/components/client/ServiceNavigator.tsx` line 420: Follow Leader active state reuses `toggleActiveClass` module constant, which is fine. But line 421 inactive state `'text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10'` has NO `dark:` variants — it was written for the dark `bg-brand-espresso` toolbar only. When moved to the cream header, this class string will render cream text on a cream background (invisible in light mode) and cream on espresso (visible in dark mode but inverted from the rest of the header). Do not port this string verbatim — rewrite in header palette (`text-brand-brown dark:text-brand-tan`, etc.) as described under "Dark-mode pairing".
- `src/components/client/ServiceNavigator.tsx` line 444: `<p role="alert" className="text-xs text-red-500">` has no `dark:` variant. Porting to the header should add `dark:text-red-400` (matching `GoLiveButton.tsx` line 261). BUG-004/005 prevention.
- Recovered original Go Live inactive state (old ServiceNavigator line ~461) concatenates `toggleInactiveClass` with cream overrides producing conflicting `text-brand-brown` vs `text-brand-cream` utilities in the same className. This was already flagged in `tasks/TASK-026/context.md` line 25. Recommendation: when restoring the original styling, do NOT literally copy the conflicting `[toggleInactiveClass, 'text-brand-cream border-brand-cream/30 ...'].join(' ')` shape — instead use only the cream toolbar overrides that were actually winning the cascade: `text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10` (dropping `toggleInactiveClass` from the join). Confirm with user if they want literal-bit-exact revert or cleaned-up revert. Recommended (⭐4/5): cleaned-up revert — same visual result, no cascade ambiguity.
- User's stated intent is "restore the original color/styling that existed BEFORE TASK-026". Since that original styling was designed for a dark `bg-brand-espresso` toolbar background and the button now lives on a cream `bg-brand-background` header, a LITERAL restore will produce cream-on-cream (invisible) text in light mode. Recommendation (⭐4/5): confirm with user whether they want (a) bit-exact revert — which implies also moving Go Live back to the toolbar, or (b) "original red-on-active, brown-on-inactive visual character" ported to the header palette. Option (b) is more consistent with TASK-026's explicit intent of "button lives in header". Most likely the user wants (b): red `bg-red-600 text-white` LIVE state preserved (it reads well on cream too) and the inactive state retuned to header palette (`toggleInactiveClass`).

## MEMORY.md Notes
- **BUG-002 (React Compiler):** Any new `useCallback` in a lifted `FollowLeaderButton` component MUST use `[sync]` / `[sync, showFollowDialog]`, never `[sync.toggleFollow]` or `[sync.isStateChecking]`. Vercel build will fail otherwise.
- **BUG-004 / BUG-005 (dark mode pairing):** Every `text-brand-*`, `bg-brand-*`, `border-brand-*` utility in the header-relocated Follow Leader button needs an explicit `dark:` variant. The existing cream-on-dark classes (e.g. `text-brand-cream/60`, `border-brand-cream/20`) are NOT header-safe — they must be rewritten in the header palette.
- **BUG-001 (lazy init):** Not directly relevant — `showFollowDialog` initializes to `false`, no storage read involved.
- **BUG-006 (Tailwind wildcard):** Not directly relevant — no `.md` class patterns added.
