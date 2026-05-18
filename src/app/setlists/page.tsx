import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import SearchBar from "@/components/client/SearchBar";
import PaginationControls from "@/components/client/PaginationControls";
import NewSetlistButton from "@/components/setlists/NewSetlistButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setlists",
  description: "Browse and manage worship setlists.",
};

const PAGE_SIZE = 10;

type SetlistRow = {
  id: string;
  name: string;
  date: string | null;
  leader_id: string | null;
  is_public: boolean | null;
  setlist_songs: { order_index: number; songs: { title: string } | null }[];
};

interface SetlistsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
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

    const offset = (requestedPage - 1) * PAGE_SIZE;
    const {
      data,
      error,
      count: rowCount,
    } = await query.range(offset, offset + PAGE_SIZE - 1);

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
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  // Clamp currentPage to [1, totalPages] — handles out-of-bounds ?page params
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  // ── Derived empty-state message ─────────────────────────────────────────────
  const emptyMessage = fetchError
    ? "Unable to load setlists. Please try again."
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
            {q ? ` matching "${q}"` : ""}
          </p>

          {/* ── Search bar ─────────────────────────────────────────────────── */}
          <SearchBar defaultValue={q} basePath="/setlists" />
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
        {!fetchError && totalCount > 0 && (
          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              q={q || undefined}
              basePath="/setlists"
            />
          </div>
        )}
      </div>
    </main>
  );
}
