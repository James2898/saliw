# Endpoint Contracts — Setlist Archive & Index Hub (TASK-020)

> Saliw uses Next.js Server Components + Supabase SSR, not REST endpoints.
> All "endpoints" below are Supabase client queries executed inline in `src/app/setlists/page.tsx`
> or as Server Actions. Format follows `docs/api-discovery.md`.

---

## 1. List Setlists (Paginated + Filtered) — MISSING

- **Action:** Inline Supabase query in `src/app/setlists/page.tsx` (does not yet exist)
- **Supabase Table(s):** `setlists`, `setlist_songs` (embedded count)
- **RLS Role Required:** Public (`is_public = true`) OR authenticated (`auth.role() = 'authenticated'`)
- **RLS Evidence:** Migration `20260418000002_allow_public_read_setlists.sql` — policy `setlists_select_public_or_authenticated` confirmed.

**Recommended Query:**
```typescript
let query = supabase
  .from('setlists')
  .select('id, name, date, leader_id, is_public, setlist_songs(count)', {
    count: 'exact',
    head: false,
  })
  .order('date', { ascending: false })

if (q) {
  query = query.ilike('name', `%${q}%`)
}

const offset = (requestedPage - 1) * PAGE_SIZE
const { data, error, count: rowCount } = await query.range(offset, offset + PAGE_SIZE - 1)
```

**Return Shape (per row):**
```typescript
{
  id: string
  name: string
  date: string           // timestamptz — format client-side as needed
  leader_id: string      // UUID; display name NOT resolvable via join (see contract #3)
  is_public: boolean
  setlist_songs: [{ count: number }]   // PostgREST aggregate syntax
}
```

**Error States:**
| Condition | UI Behavior |
|-----------|-------------|
| Supabase query error | Set `fetchError = true`; show "Unable to load setlists. Please try again." in place of list |
| Empty result (no setlists) | Show empty-state card: "No setlists yet." |
| Empty result (search miss) | Show empty-state card: `No setlists match "${q}".` |

**Gap Strategy:** Query must be written inline in the page. Pattern is identical to `src/app/library/page.tsx`. No Server Action required — this is a read-only Server Component query.

---

## 2. Search Setlists by Name — MISSING

- **Action:** `.ilike('name', '%q%')` filter applied to query #1 above
- **Supabase Table(s):** `setlists`
- **RLS Role Required:** Same as query #1 (public/authenticated)
- **Column:** `name text NOT NULL` — confirmed in `DbSetlist` type and migration

**Index Note:** No explicit index on `setlists.name` is defined in any migration. `.ilike` will use a sequential scan. For a small worship portal dataset this is acceptable, but a GIN/ILIKE index could be added if performance degrades. Mark as a known limitation, not a blocker.

**Input Sanitization (required — same pattern as library/page.tsx):**
```typescript
const q = (params.q?.trim() ?? '').slice(0, 100).replace(/[(),%]/g, '')
```

**Gap Strategy:** Implemented inline in the page query. No separate action needed.

---

## 3. Leader Display Name (Profiles JOIN) — MISSING (blocked by RLS)

- **Action:** Would be `supabase.from('profiles').select('full_name').eq('id', leader_id)`
- **Supabase Table(s):** `profiles`
- **RLS Role Required:** `profiles_select_own` — each user may only read their own row

**Critical Constraint:**
- `setlists.leader_id` is `uuid REFERENCES auth.users(id)` — NOT a FK to `public.profiles`.
- PostgREST cannot traverse the `auth` schema boundary for automatic embedding.
- Even if attempted as a separate query, `profiles_select_own` RLS policy (`USING (auth.uid() = id)`) means querying profiles for another user's `leader_id` will return 0 rows.
- A service-role bypass is not permitted in frontend code per project rules.

**Available Column in `profiles`:** `full_name text` (nullable). `email text` is present but exposing it on a public page is a privacy risk.

**Recommended Gap Strategy:**
- Do NOT attempt the profiles join or cross-user profiles query.
- Display leader name field as absent (omit from card entirely), OR
- If a "leader" label is desired: display the current authenticated user's own `full_name` only when `setlist.leader_id === user.id`, and show nothing for other leaders.
- Do not display `leader_id` UUID on the public card — it is an internal identifier.

**Future Resolution:** A new `profiles_select_public` RLS policy granting SELECT on `full_name` for all authenticated users (not just own row) would unblock this. That policy change is outside the current task scope.

---

## 4. Song Count per Setlist (Embedded PostgREST Count) — EXISTS

- **Action:** `setlist_songs(count)` embedded in the main `setlists` select
- **Supabase Table(s):** `setlist_songs`
- **FK Evidence:** `setlist_songs.setlist_id uuid NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE` — confirmed in migration `20260415000003_create_setlist_songs_table.sql`
- **RLS Evidence:** Policy `setlist_songs_select_public_or_authenticated` confirmed in migration `20260418000002_allow_public_read_setlists.sql`

**PostgREST Syntax:**
```
select('...setlist_songs(count)', { count: 'exact' })
```
PostgREST returns the count as `[{ count: number }]` — access as `row.setlist_songs[0]?.count ?? 0`.

**Error States:**
| Condition | UI Behavior |
|-----------|-------------|
| `setlist_songs` returns null for a row | Treat as 0 songs — display "0 songs" on the card |

**Gap Strategy:** N/A — EXISTS and safe to use.

---

## 5. Role Check (music_director Gate) — EXISTS

- **Action:** Inline query in `src/app/setlists/page.tsx` (identical pattern to `library/page.tsx`)
- **Supabase Table(s):** `profiles`
- **RLS Role Required:** `profiles_select_own` — user reads their own row only

**Query:**
```typescript
let isMusicDirector = false
if (user) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isMusicDirector = profile?.role === 'music_director'
  } catch {
    isMusicDirector = false
  }
}
```

**Column Evidence:** `profiles.role text NOT NULL DEFAULT 'music_director'` — confirmed in migration `20260415000000_create_profiles_table.sql` and `Profile.ts` type.

**Error States:**
| Condition | UI Behavior |
|-----------|-------------|
| User not authenticated | `isMusicDirector = false`; New Setlist button not rendered |
| Profile query fails | `isMusicDirector = false`; New Setlist button not rendered (safe default) |

**Gap Strategy:** N/A — EXISTS.

---

## 6. Navigate to Setlist Detail (Link) — EXISTS

- **Action:** `<Link href={`/setlists/${id}`}>` — static Next.js navigation, no data action
- **Route Evidence:** `src/app/setlists/[id]/page.tsx` confirmed in filesystem
- **RLS:** Public read confirmed (policy `setlists_select_public_or_authenticated`)

**Gap Strategy:** N/A — EXISTS.

---

## 7. New Setlist Button / FAB Navigation — MISSING

- **Action:** `router.push('/setlists/new')` from a `NewSetlistButton` component (does not exist yet)
- **Route Evidence:** `src/app/setlists/new/` directory does NOT exist (confirmed via glob)
- **RLS Role Required:** `music_director` only (client-side gate; server-side enforced in `createSetlist()`)

**Gap Strategy:**
- A `NewSetlistButton` component modeled on `NewSongButton` must be created at `src/components/setlists/NewSetlistButton.tsx`.
- The button navigates to `/setlists/new` — this route must be built as part of TASK-020 scope or a follow-on task.
- If the `/setlists/new` route is deferred: render the button as disabled with `aria-disabled="true"` and a tooltip/hint: "Creating setlists coming soon."
- If the route is in scope: build `src/app/setlists/new/page.tsx` with the `createSetlist()` Server Action (already EXISTS in `src/app/actions/setlistActions.ts`).

---

## 8. PaginationControls — basePath Prop Required — MISSING

- **Component:** `src/components/client/PaginationControls.tsx`
- **Current Behavior:** `buildUrl()` hardcodes `/library` — e.g. `return \`/library?${params.toString()}\``
- **Required Change:** Add `basePath: string` prop to `PaginationControlsProps` and substitute in `buildUrl`:

```typescript
// Before
function buildUrl(page: number, q?: string): string {
  ...
  return `/library?${params.toString()}`
}

// After
function buildUrl(page: number, q: string | undefined, basePath: string): string {
  ...
  return `${basePath}?${params.toString()}`
}
```

**Impact:** This is a **breaking change** to the component's public API. `library/page.tsx` must be updated to pass `basePath="/library"` to preserve existing behavior.

**Gap Strategy:** Developer must add `basePath` prop before `PaginationControls` can be used on the setlists page.

---

## 9. SearchBar — basePath Prop Required — MISSING

- **Component:** `src/components/client/SearchBar.tsx`
- **Current Behavior:** `router.replace` hardcodes `/library` — e.g. `router.replace(\`/library?q=...\`)`
- **Required Change:** Add `basePath: string` prop to `SearchBarProps` and substitute:

```typescript
// Before
router.replace(`/library?q=${encodeURIComponent(term)}`)
router.replace('/library')

// After
router.replace(`${basePath}?q=${encodeURIComponent(term)}`)
router.replace(basePath)
```

**Impact:** Breaking change — `library/page.tsx` must pass `basePath="/library"` to preserve existing behavior.

**Gap Strategy:** Developer must add `basePath` prop before `SearchBar` can be used on the setlists page.

---

## Cross-Cutting Constraints

### Input Sanitization
All `?q=` params must be sanitized identically to the library pattern:
```typescript
const q = (params.q?.trim() ?? '').slice(0, 100).replace(/[(),%]/g, '')
```
This strips PostgREST filter metacharacters. Required for `.ilike()` safety.

### Pagination searchParams Type
`searchParams` must be typed as `Promise<{ q?: string; page?: string }>` (Next.js App Router async searchParams pattern). Match `library/page.tsx` exactly.

### Date Formatting
`setlists.date` is `timestamptz` in the database. `DbSetlist.date` is typed as `string` (ISO 8601). Format for display using `new Date(date).toLocaleDateString()` or a utility — do not display the raw ISO string on the card.

### Public vs. Authenticated Visibility
The `is_public` flag affects RLS visibility. When a user is NOT authenticated, only `is_public = true` setlists are returned. The page must handle this gracefully — do not assume all setlists are always visible.
