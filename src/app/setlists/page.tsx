import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import SearchBar from "@/components/client/SearchBar";
import PaginationControls from "@/components/client/PaginationControls";
import PageSizeSelect from "@/components/client/PageSizeSelect";
import NewSetlistButton from "@/components/setlists/NewSetlistButton";
import AlphabetFilter from "@/components/client/AlphabetFilter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setlists",
  description: "Browse and manage worship setlists.",
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;

type SetlistRow = {
  id: string;
  name: string;
  date: string | null;
  leader_id: string | null;
  is_public: boolean | null;
  setlist_songs: { order_index: number; songs: { title: string } | null }[];
};

interface SetlistsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    letter?: string;
  }>;
}

export default async function SetlistsPage({
  searchParams,
}: SetlistsPageProps) {
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

  // ── Fetch setlists (paginated, single round-trip) ──────────────────────────
  let setlists: SetlistRow[] = [];
  let fetchError = false;
  let count: number | null = null;

  try {
    let query = supabase
      .from("setlists")
      .select(
        "id, name, date, leader_id, is_public, setlist_songs(order_index, songs(title))",
        {
          count: "exact",
          head: false,
        }
      )
      .order("date", { ascending: false });

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    // Letter filter: prefix match on name column (AC-16), AND-composed with q filter (AC-7)
    if (letter) {
      query = query.ilike("name", `${letter}%`);
    }

    const offset = (requestedPage - 1) * pageSize;
    const {
      data,
      error,
      count: rowCount,
    } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      fetchError = true;
    } else {
      setlists = (data ?? []) as unknown as SetlistRow[];
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
    ? "Unable to load setlists. Please try again."
    : letter && q
      ? `No setlists starting with '${letter}' matching "${q}".`
      : letter
        ? `No setlists starting with '${letter}'.`
        : q
          ? "No setlists match your search."
          : "No setlists yet.";

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* ── Sticky header ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 bg-brand-cream dark:bg-brand-darker pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream">
              Setlists
            </h1>
            {/* Desktop New Setlist button — mobile FAB renders at fixed viewport position */}
            <NewSetlistButton isMusicDirector={isMusicDirector} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-4">
            {totalCount} {totalCount === 1 ? "setlist" : "setlists"}
            {letter ? ` starting with '${letter}'` : ""}
            {q ? ` matching "${q}"` : ""}
          </p>

          {/* ── Search bar + page size ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <SearchBar
                defaultValue={q}
                basePath="/setlists"
                pageSize={pageSize}
                letter={letter ?? undefined}
              />
            </div>
            <PageSizeSelect
              pageSize={pageSize}
              q={q || undefined}
              basePath="/setlists"
              letter={letter ?? undefined}
            />
          </div>

          {/* ── Alphabet filter bar ─────────────────────────────────────────── */}
          <AlphabetFilter
            activeLetter={letter}
            basePath="/setlists"
            q={q || undefined}
            pageSize={pageSize}
          />
        </div>

        {/* ── Setlist list ─────────────────────────────────────────────────── */}
        <div className="mt-6">
          {setlists.length === 0 ? (
            /* ── Empty state ───────────────────────────────────────────────── */
            <div
              className="rounded-2xl border border-brand-brown/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan">
                {emptyMessage}
              </p>
            </div>
          ) : (
            /* ── Setlist cards ─────────────────────────────────────────────── */
            <ul className="flex flex-col gap-2" role="list">
              {setlists.map((setlist) => {
                const songTitles = [...setlist.setlist_songs]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((ss) => ss.songs?.title)
                  .filter(Boolean) as string[];
                const formattedDate = setlist.date
                  ? (() => {
                      const dt = new Date(setlist.date);
                      return new Date(
                        dt.getUTCFullYear(),
                        dt.getUTCMonth(),
                        dt.getUTCDate()
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()
                  : null;

                return (
                  <li key={setlist.id} className="relative">
                    <Link
                      href={`/setlists/${setlist.id}`}
                      className={[
                        "flex flex-col md:flex-row md:items-center md:justify-between gap-2",
                        "bg-[--brand-cream] dark:bg-brand-espresso",
                        "rounded-xl border border-brand-tan/25 dark:border-brand-tan/15 border-l-4 border-l-[var(--brand-tan)] p-4",
                        isMusicDirector ? "pr-10" : "",
                        "shadow-sm hover:shadow-md transition-shadow duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-2",
                      ].join(" ")}
                      aria-label={`View setlist: ${setlist.name}${formattedDate ? `, ${formattedDate}` : ""}${songTitles.length > 0 ? `, songs: ${songTitles.join(", ")}` : ""}`}
                    >
                      {/* ── Setlist name + song titles ────────────────────── */}
                      <div className="min-w-0 md:flex-1 md:mr-4">
                        <p className="font-extrabold text-brand-espresso dark:text-brand-cream truncate whitespace-nowrap">
                          {setlist.name}
                        </p>
                        {songTitles.length > 0 && (
                          <p className="text-[10px] text-brand-espresso/55 dark:text-brand-cream/45 truncate mt-0.5">
                            {songTitles.join(" · ")}
                          </p>
                        )}
                      </div>

                      {/* ── Metadata row ─────────────────────────────────── */}
                      <div className="flex flex-row items-center gap-3 md:shrink-0">
                        {/* Date */}
                        {formattedDate && (
                          <span className="text-xs text-brand-espresso/70 dark:text-brand-cream/60">
                            {formattedDate}
                          </span>
                        )}
                      </div>
                    </Link>
                    {isMusicDirector && (
                      <Link
                        href={`/setlists/${setlist.id}/edit`}
                        aria-label={`Edit setlist: ${setlist.name}`}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-brand-brown/50 hover:text-brand-brown hover:bg-brand-brown/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-1"
                      >
                        <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Pagination controls ───────────────────────────────────────────── */}
        {!fetchError && (
          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              q={q || undefined}
              basePath="/setlists"
              letter={letter ?? undefined}
            />
          </div>
        )}
      </div>
    </main>
  );
}
