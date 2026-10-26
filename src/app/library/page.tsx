import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import SearchBar from "@/components/client/SearchBar";
import NewSongButton from "@/components/library/NewSongButton";
import PaginationControls from "@/components/client/PaginationControls";
import PageSizeSelect from "@/components/client/PageSizeSelect";
import AlphabetFilter from "@/components/client/AlphabetFilter";
import TagFilterBar from "@/components/SongTags/TagFilterBar";
import SongTagBadge from "@/components/SongTags/SongTagBadge";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import {
  LibraryFilterTransitionProvider,
  LibrarySongListSlot,
} from "@/components/library/LibraryFilterTransition";
import type { SongSummary } from "@/types/Song";

export const metadata: Metadata = {
  title: "Song Library",
  description: "Browse and search the full worship song library.",
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;

type SongRow = SongSummary;

interface LibraryPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    letter?: string;
    tag?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const supabase = await createClient();

  // ── Auth check (no redirect — page is public; used only for RBAC below) ───
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Resolve search params ───────────────────────────────────────────────────
  const params = await searchParams;
  // Strip PostgREST filter metacharacters to prevent filter-clause injection
  const q = (params.q?.trim() ?? "").slice(0, 100).replace(/[(),%]/g, "");

  // Sanitize letter param — accept only a single uppercase A–Z letter
  const rawLetter = params.letter?.trim().toUpperCase() ?? "";
  const letter =
    rawLetter.length === 1 && rawLetter >= "A" && rawLetter <= "Z"
      ? rawLetter
      : null;

  // Sanitize tag param
  const rawTag = params.tag?.trim().toLowerCase() ?? "";
  const tag = rawTag.length > 0 ? rawTag : null;

  // Parse pageSize param — validate against allowed set, default to 10
  const rawPageSize = parseInt(params.pageSize ?? "10", 10);
  const pageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(
    rawPageSize
  )
    ? rawPageSize
    : 10;

  // Parse page param — clamp to 1 as a lower bound; upper bound applied after count is known
  const rawPage = parseInt(params.page ?? "1", 10);
  const parsedPage = isNaN(rawPage) ? 1 : rawPage;
  const requestedPage = Math.max(1, parsedPage);

  // ── Fetch user role for RBAC (only when authenticated) ────────────────────
  let isMusicDirector = false;
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      isMusicDirector = profile?.role === "music_director";
    } catch {
      isMusicDirector = false;
    }
  }

  // ── Fetch songs (paginated, single round-trip) ──────────────────────────────
  // SELECT only metadata columns — content (lyrics/chords) is intentionally excluded
  let songs: SongRow[] = [];
  let fetchError = false;
  let count: number | null = null;

  try {
    let query = supabase
      .from("songs")
      .select("id, title, artist, original_key, tags", {
        count: "exact",
        head: false,
      })
      .order("title", { ascending: true });

    if (q) {
      query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
    }

    // Letter filter: prefix match on title only (AC-14), AND-composed with q filter (AC-7)
    if (letter) {
      query = query.ilike("title", `${letter}%`);
    }

    // Tag filter: contains tag in text[] array
    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const offset = (requestedPage - 1) * pageSize;
    const {
      data,
      error,
      count: rowCount,
    } = await query.range(offset, offset + pageSize - 1);

    if (error && error.code === "42703") {
      let fallbackQuery = supabase
        .from("songs")
        .select("id, title, artist, original_key", {
          count: "exact",
          head: false,
        })
        .order("title", { ascending: true });

      if (q) {
        fallbackQuery = fallbackQuery.or(
          `title.ilike.%${q}%,artist.ilike.%${q}%`
        );
      }
      if (letter) {
        fallbackQuery = fallbackQuery.ilike("title", `${letter}%`);
      }

      const fallbackRes = await fallbackQuery.range(
        offset,
        offset + pageSize - 1
      );
      if (fallbackRes.error) {
        fetchError = true;
      } else {
        songs = ((fallbackRes.data ?? []) as SongRow[]).map((s) => ({
          ...s,
          tags: [],
        }));
        count = fallbackRes.count;
      }
    } else if (error) {
      fetchError = true;
    } else {
      songs = (data ?? []) as SongRow[];
      count = rowCount;
    }
  } catch {
    fetchError = true;
  }

  // ── Derive pagination values ────────────────────────────────────────────────
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  // Clamp currentPage to [1, totalPages] — handles out-of-bounds ?page params
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  // ── Derived empty-state message ─────────────────────────────────────────────
  const emptyMessage = fetchError
    ? "Unable to load songs. Please try again."
    : tag && letter && q
      ? `No songs tagged '${tag}' starting with '${letter}' matching "${q}".`
      : tag && q
        ? `No songs tagged '${tag}' matching "${q}".`
        : tag && letter
          ? `No songs tagged '${tag}' starting with '${letter}'.`
          : tag
            ? `No songs tagged '${tag}'.`
            : letter && q
              ? `No songs starting with '${letter}' matching "${q}".`
              : letter
                ? `No songs starting with '${letter}'.`
                : q
                  ? "No songs match your search."
                  : "No songs in the library yet.";

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream">
            Song Library
          </h1>
          {/* Desktop New Song button — mobile FAB renders at fixed viewport position */}
          <NewSongButton isMusicDirector={isMusicDirector} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-4">
          {totalCount} {totalCount === 1 ? "song" : "songs"}
          {tag ? ` tagged '${tag}'` : ""}
          {letter ? ` starting with '${letter}'` : ""}
          {q ? ` matching "${q}"` : !letter && !tag ? " in library" : ""}
        </p>

        <LibraryFilterTransitionProvider>
          {/* ── Search bar + page size ───────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <SearchBar
                defaultValue={q}
                basePath="/library"
                pageSize={pageSize}
                letter={letter ?? undefined}
                tag={tag ?? undefined}
              />
            </div>
            <PageSizeSelect
              pageSize={pageSize}
              q={q || undefined}
              basePath="/library"
              letter={letter ?? undefined}
              tag={tag ?? undefined}
            />
          </div>

          {/* ── Tag quick filter bar ─────────────────────────────────────────── */}
          <TagFilterBar
            activeTag={tag}
            basePath="/library"
            q={q || undefined}
            letter={letter ?? undefined}
            pageSize={pageSize}
          />

          {/* ── Alphabet filter bar ──────────────────────────────────────────── */}
          <AlphabetFilter
            activeLetter={letter}
            basePath="/library"
            q={q || undefined}
            pageSize={pageSize}
            tag={tag ?? undefined}
          />

          {/* ── Song list (swapped with skeleton during filter transitions) ─── */}
          <LibrarySongListSlot>
            {songs.length === 0 ? (
              /* ── Empty state ─────────────────────────────────────────────────── */
              <div
                className="rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              /* ── Song rows ───────────────────────────────────────────────────── */
              <ul className="flex flex-col gap-2" role="list">
                {songs.map((song) => (
                  <li key={song.id}>
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-tan-alpha)] border border-brand-brown/10 dark:border-brand-tan/10 hover:border-brand-tan dark:hover:border-brand-tan transition-colors duration-200">
                      {/* Row hit-area — navigates to viewer */}
                      <Link
                        href={`/library/${song.id}`}
                        className={[
                          "flex-1 flex items-center justify-between px-4 py-3 rounded-xl",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                          "min-w-0",
                        ].join(" ")}
                        aria-label={`View ${song.title} by ${song.artist}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-bold text-brand-espresso dark:text-brand-cream leading-snug">
                              {song.title}
                            </p>
                            {song.tags && song.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {song.tags.map((t) => (
                                  <SongTagBadge key={t} tag={t} size="sm" />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="truncate text-xs font-medium text-brand-brown dark:text-brand-tan mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                        <SongKeyBadge musicalKey={song.original_key} className="ml-4" />
                      </Link>

                      {/* Edit shortcut — music_director only */}
                      {isMusicDirector && (
                        <Link
                          href={`/library/${song.id}/edit`}
                          className={[
                            "shrink-0 flex items-center justify-center w-9 h-9 mr-2 rounded-lg",
                            "text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                            "transition-colors duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                          ].join(" ")}
                          aria-label={`Edit ${song.title}`}
                        >
                          <Pencil
                            size={15}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </LibrarySongListSlot>

          {/* ── Pagination controls ───────────────────────────────────────────── */}
          {!fetchError && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                q={q || undefined}
                basePath="/library"
                letter={letter ?? undefined}
                tag={tag ?? undefined}
              />
            </div>
          )}
        </LibraryFilterTransitionProvider>
      </div>
    </main>
  );
}
