import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import { preProcessChords } from "@/utils/musicLogic";
import {
  getSetlistById,
  getSetlistWithSongs,
} from "@/app/actions/setlistActions";
import Card from "@/components/server/card";
import SetlistViewerClient from "./SetlistViewerClient";

export const dynamic = "force-dynamic";

interface SetlistViewerPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetlistViewerPage({
  params,
}: SetlistViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth check (no redirect — page is public; user drives isLeader below) ──
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Resolve music director role ─────────────────────────────────────────────
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

  // ── Fetch setlist header ────────────────────────────────────────────────────
  const { data: setlist, error: setlistError } = await getSetlistById({ id });

  if (setlistError || !setlist) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/setlists"
            className={[
              "inline-flex items-center gap-1.5 mb-6",
              "text-sm font-medium text-brand-brown dark:text-brand-tan",
              "hover:text-brand-espresso dark:hover:text-brand-cream",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
            ].join(" ")}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlists
          </Link>
          <Card>
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
              Unable to load setlist. Please try again.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // ── Fetch songs ─────────────────────────────────────────────────────────────
  const { data: songsRaw, error: songsError } = await getSetlistWithSongs({
    setlist_id: id,
  });

  if (songsError) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/setlists"
            className={[
              "inline-flex items-center gap-1.5 mb-6",
              "text-sm font-medium text-brand-brown dark:text-brand-tan",
              "hover:text-brand-espresso dark:hover:text-brand-cream",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
            ].join(" ")}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlists
          </Link>
          <Card>
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
              Unable to load setlist. Please try again.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // ── Compute leader status ───────────────────────────────────────────────────
  const isLeader = isMusicDirector;
  const isAuthenticated = user != null;

  // ── Sort songs by order_index ascending ────────────────────────────────────
  const songs = (songsRaw ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  // ── Pre-process chord sheets server-side ───────────────────────────────────
  const processedSongs = songs.map((entry) => ({
    junctionId: entry.id,
    setlistId: id,
    title: entry.songs.title,
    artist: entry.songs.artist,
    originalKey: entry.songs.original_key,
    performanceKey: entry.performance_key,
    processedLines: preProcessChords(entry.songs.content),
  }));

  // ── Navigator song list ─────────────────────────────────────────────────────
  const navigatorSongs = processedSongs.map((s) => ({
    junctionId: s.junctionId,
    title: s.title,
  }));

  // ── Format date for display ─────────────────────────────────────────────────
  const formattedDate = setlist.date
    ? new Date(setlist.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darker font-sans">
      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="pt-4">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-8">
          {/* ── Back link ───────────────────────────────────────────────────── */}
          <Link
            href="/setlists"
            className={[
              "inline-flex items-center gap-1.5 mb-6",
              "text-sm font-medium text-brand-brown dark:text-brand-tan",
              "hover:text-brand-espresso dark:hover:text-brand-cream",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
            ].join(" ")}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlists
          </Link>

          {/* ── Setlist header ───────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
              {setlist.name}
            </h1>
            <div className="flex items-center gap-3">
              {formattedDate && (
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
                  {formattedDate}
                </p>
              )}
              {isLeader && (
                <Link
                  href={`/setlists/${id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-brown/30 text-brand-brown hover:bg-brand-brown/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-2"
                >
                  <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                  Edit Setlist
                </Link>
              )}
            </div>
          </div>

          {/* ── Empty state ──────────────────────────────────────────────────── */}
          {processedSongs.length === 0 ? (
            <>
              {/* Still render the navigator so it appears even for empty setlists */}
              <SetlistViewerClient
                songs={[]}
                navigatorSongs={navigatorSongs}
                setlistId={id}
                isLeader={isLeader}
                isAuthenticated={isAuthenticated}
              />
              <Card>
                <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
                  No songs in this setlist yet.
                </p>
              </Card>
            </>
          ) : (
            /* ── Song sections (via SetlistViewerClient for realtime wiring) ── */
            <SetlistViewerClient
              songs={processedSongs}
              navigatorSongs={navigatorSongs}
              setlistId={id}
              isLeader={isLeader}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </main>
    </div>
  );
}
