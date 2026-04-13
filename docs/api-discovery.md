# API Discovery — Supabase SSR & Actions

> **Read when:** handling Tier 2 tasks to verify data structures and RLS policies.

---

## Discovery Protocol

Since Saliw uses Next.js + Supabase SSR, agents must verify existence via:

1. **Types:** Check `src/types/supabase.ts` for database schema definitions.
2. **Server Actions:** Check `src/app/actions/` for mutation logic.
3. **Fetching:** Check page-level `page.tsx` for direct Supabase Server Component queries.

---

## EXISTS / MISSING Protocol (Server-Side)

Document each data requirement before implementation:

| Action         | Path/Action           | RLS Status | Requirement                    |
| -------------- | --------------------- | ---------- | ------------------------------ |
| View Setlist   | `app/setlists/[id]`   | EXISTS     | Public SELECT allowed          |
| Edit Setlist   | `updateSetlistAction` | EXISTS     | Role `music_director` required |
| Add Song       | `createSongAction`    | EXISTS     | Role `music_director` required |
| Delete Setlist | `deleteSetlistAction` | MISSING    | TBD (music_director only)      |

- **EXISTS** — Table found in schema, RLS policy verified in Supabase dashboard or SQL migrations.
- **MISSING** — Table or policy not found. Flag as a gap in `tasks/TASK-NNN.md`.

---

## Gap-Handling Default

When a data action or policy is `MISSING`:

- Log the gap in `tasks/TASK-NNN.md`.
- Disable the relevant UI control with a "Permissions Required" hint.
- Do not attempt to bypass RLS via service roles in frontend code.

---

## Technical Schema Format (for @integration-contract)

Saliw uses **Next.js Server Actions + Supabase**, not REST endpoints. The `@integration-contract` agent must use this schema format — not HTTP method/path tables.

### Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| [action]  | `actionName()` | `src/app/actions/<feature>Actions.ts` | `music_director` / public | EXISTS / MISSING | N/A or [strategy] |

### Server Action Detail Block

For each action, document:

```
#### [UI Action] — EXISTS / MISSING

- **Action:** `actionName()` in `src/app/actions/<feature>Actions.ts`
- **Input Type:**
  { field: type }
- **Return Type:**
  { field: type } | { error: string }
- **RLS Role Required:** `music_director` / public read
- **Supabase Table(s) Affected:** `table_name`
- **Error States:**
  | Condition             | UI Behavior        |
  |-----------------------|--------------------|
  | Unauthorized (RLS)    | [what to show]     |
  | Record not found      | [what to show]     |
  | Server error          | [what to show]     |
- **Gap Strategy:** [If MISSING — exact UI disable behavior + hint text to display]
```
