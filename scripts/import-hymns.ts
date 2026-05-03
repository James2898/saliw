/**
 * import-hymns.ts
 *
 * One-shot bulk seeder for the English Hymnal (TASK-036).
 *
 * Usage:
 *   npm run import:hymns -- --dry-run    # parse + log first 3 records, no DB
 *   npm run import:hymns                 # real import using SUPABASE_SERVICE_ROLE_KEY
 *
 * The npm script uses `tsx --env-file=.env.local`, so process.env is populated
 * with the variables in `.env.local` before this file runs. We additionally
 * call `dotenv.config({ path: '.env.local' })` defensively so the script also
 * works when invoked via `tsx` directly without the `--env-file` flag.
 *
 * MEMORY.md guards applied:
 *   - BUG-008: separate guards for `error` vs `data` after every Supabase call.
 *   - BUG-009: `value !== undefined` instead of the `in` operator when building
 *     payload records (none of our optional fields are conditional, but the
 *     pattern is documented in `buildRecord` for future extension).
 *   - BUG-011: see supabase/migrations/20260503000001_songs_title_artist_unique_index.sql
 *     — the new unique index does not change RLS surface area.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { parseHymns, type Hymn } from "./parsers/hymnsMarkdownParser";
import { chordRegex, NOTES } from "../src/utils/musicLogic";

// ── Configuration constants ──────────────────────────────────────────────────

const SOURCE_PATH = "/Users/adish/Downloads/English Hymns.md";
const ARTIST = "English Hymnal";
const DEFAULT_KEY = "C";
const BATCH_SIZE = 50;
const KEY_SCAN_LINE_COUNT = 30;
const HYMNS_WITH_REAL_KEYS = new Set(["01", "02", "03"]);

// ── Types ────────────────────────────────────────────────────────────────────

type SongInsertRecord = {
  title: string;
  artist: string;
  original_key: string;
  content: string;
  created_by: null;
};

// ── Key extraction (AC6) ─────────────────────────────────────────────────────

/**
 * Anchored chord pattern derived from src/utils/musicLogic.ts.
 *
 * We re-anchor the shared `chordRegex` source with `^...$` so it only matches
 * tokens whose entire string is a valid chord (e.g. "G", "A7", "Gm", "F#m",
 * "Bbmaj7"). Without anchors, `chordRegex` would match the leading "G" inside
 * the lyric token "God" — which would corrupt key extraction.
 */
const ANCHORED_CHORD_REGEX = new RegExp(`^${chordRegex.source}$`);

const VALID_KEYS = new Set<string>(NOTES);

/**
 * Pulls the root letter (and optional accidental) from a chord token.
 *
 * Examples:
 *   "G"       → "G"
 *   "Gm"      → "G"
 *   "A7"      → "A"
 *   "F#m"     → "F#"
 *   "Bbmaj7"  → "Bb"
 *   "G/B"     → "G"   (we use the prefix, not the bass note)
 *
 * Returns null if no valid root prefix exists (defensive — should not happen
 * after ANCHORED_CHORD_REGEX has matched).
 */
function extractRoot(chord: string): string | null {
  const match = chord.match(/^[A-G][#b]?/);
  return match ? match[0] : null;
}

/**
 * Scans the first KEY_SCAN_LINE_COUNT lines of `body` for the first standalone
 * chord token. Returns its validated root, or DEFAULT_KEY if none is found or
 * the root falls outside the canonical NOTES set.
 *
 * Per AC6 the key set is the 12-note chromatic series defined in NOTES.
 */
function extractOriginalKey(body: string): string {
  const lines = body.split("\n").slice(0, KEY_SCAN_LINE_COUNT);

  for (const line of lines) {
    // Whitespace-delimited tokens. We deliberately skip section headers like
    // "[VERSE 1]" because the brackets are non-chord characters and would not
    // pass ANCHORED_CHORD_REGEX in any case.
    const tokens = line.trim().split(/\s+/);
    for (const token of tokens) {
      if (token === "") continue;
      if (!ANCHORED_CHORD_REGEX.test(token)) continue;

      const root = extractRoot(token);
      if (root === null) continue;

      if (VALID_KEYS.has(root)) {
        return root;
      }
      // Out-of-set root (e.g. "Ab" enharmonic): fall through and keep scanning.
      // If no valid root is found we default at the end.
    }
  }

  return DEFAULT_KEY;
}

// ── Record building (AC7) ────────────────────────────────────────────────────

/**
 * Builds the insert record for a single hymn.
 *
 * BUG-009 guard: this function uses `!== undefined` semantics implicitly —
 * every field is always assigned. There are no optional fields here. If the
 * schema is extended later (e.g. an optional `notes` field), use
 * `if (notes !== undefined) record.notes = notes` rather than `'notes' in src`.
 */
function buildRecord(hymn: Hymn): SongInsertRecord {
  const original_key = HYMNS_WITH_REAL_KEYS.has(hymn.number)
    ? extractOriginalKey(hymn.content)
    : DEFAULT_KEY;

  return {
    title: hymn.title,
    artist: ARTIST,
    original_key,
    content: hymn.content,
    created_by: null,
  };
}

// ── Supabase client (AC5, AC7) ───────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local or your shell.`
    );
  }
  return value;
}

function makeAdminClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  // The service-role client bypasses RLS by design. Auth is also skipped
  // because there is no user session — the script runs as a Node.js process.
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ── Batch upsert (AC7, AC10) ─────────────────────────────────────────────────

type UpsertOutcome = {
  inserted: number;
  updated: number;
};

/**
 * Upserts a batch of records and returns separate counts of new inserts vs.
 * updates of existing rows.
 *
 * Idempotency strategy (AC10):
 *   1. Pre-fetch the existing (title, artist) pairs in this batch with a
 *      single `.in('title', ...)` query, then check artist locally.
 *   2. Issue the upsert with `onConflict: 'title,artist'`.
 *   3. Compute `inserted = batch.length - existing.length`, `updated = existing.length`.
 *
 * This costs one extra round-trip per batch (50 rows) and avoids relying on
 * Supabase to return distinct insert/update counts (it returns a single rows
 * array regardless). Acceptable for a one-shot seed of 173 rows.
 *
 * BUG-008 guard: every Supabase response check uses two distinct guards —
 * an `if (error)` branch followed by an `if (!data)` branch. They are NEVER
 * collapsed into `if (error || !data)`.
 */
async function upsertBatch(
  client: SupabaseClient,
  batch: SongInsertRecord[]
): Promise<UpsertOutcome> {
  const titles = batch.map((r) => r.title);

  // Pre-fetch existing rows in this batch. We need to scope by both title
  // and artist; a single `.in('title', titles)` followed by an artist filter
  // returns only the rows we care about.
  const { data: existingRows, error: existingError } = await client
    .from("songs")
    .select("title, artist")
    .in("title", titles)
    .eq("artist", ARTIST);

  // BUG-008: explicit error guard FIRST.
  if (existingError) {
    throw new Error(
      `Failed to pre-fetch existing rows: ${existingError.message}`
    );
  }
  // BUG-008: explicit data-presence guard SECOND, never combined.
  if (existingRows === null) {
    throw new Error(
      "Pre-fetch returned null data with no error. Aborting batch."
    );
  }

  const existingTitles = new Set(existingRows.map((r) => r.title));

  // Now execute the upsert. We do not need the returned rows for counting.
  const { error: upsertError } = await client
    .from("songs")
    .upsert(batch, { onConflict: "title,artist" });

  if (upsertError) {
    throw new Error(`Upsert failed: ${upsertError.message}`);
  }

  let inserted = 0;
  let updated = 0;
  for (const record of batch) {
    if (existingTitles.has(record.title)) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }
  return { inserted, updated };
}

// ── Dry-run output (AC5) ─────────────────────────────────────────────────────

function logDryRun(records: SongInsertRecord[]): void {
  console.log(
    `[dry-run] Parsed ${records.length} hymns. Showing first 3 records:`
  );
  console.log("");
  const sample = records.slice(0, 3);
  for (const r of sample) {
    const snippet = r.content.slice(0, 200);
    console.log(`── ${r.title} ──`);
    console.log(`  artist:        ${r.artist}`);
    console.log(`  original_key:  ${r.original_key}`);
    console.log(`  content[0..200]:`);
    console.log(
      snippet
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")
    );
    console.log("");
  }
  console.log(
    `[dry-run] No database writes performed. Re-run without --dry-run to apply.`
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Defensive load — npm script already passes --env-file, but invoking the
  // file directly via `tsx scripts/import-hymns.ts` should still work.
  dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

  const dryRun = process.argv.includes("--dry-run");

  console.log(`[import-hymns] reading: ${SOURCE_PATH}`);
  const markdown = readFileSync(SOURCE_PATH, "utf-8");

  const hymns = parseHymns(markdown);
  console.log(`[import-hymns] parsed ${hymns.length} hymns from source.`);

  const records = hymns.map(buildRecord);

  if (dryRun) {
    logDryRun(records);
    return;
  }

  const client = makeAdminClient();
  console.log(`[import-hymns] connected to Supabase. Beginning upsert...`);

  let totalInserted = 0;
  let totalUpdated = 0;

  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);
    const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    console.log(
      `[import-hymns] batch ${batchNumber}/${totalBatches} (${batch.length} records)...`
    );

    const { inserted, updated } = await upsertBatch(client, batch);
    totalInserted += inserted;
    totalUpdated += updated;

    console.log(
      `  → inserted: ${inserted}, updated: ${updated} (running totals: ${totalInserted} / ${totalUpdated})`
    );
  }

  console.log("");
  console.log(`[import-hymns] DONE.`);
  console.log(`  inserted: ${totalInserted}`);
  console.log(`  updated:  ${totalUpdated}`);
  console.log(`  total processed: ${records.length}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[import-hymns] FAILED: ${message}`);
  process.exit(1);
});
