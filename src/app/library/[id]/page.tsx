import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import { preProcessChords } from "@/utils/musicLogic";
import {
  groupSongPerformanceHistory,
  type RawSongPerformanceRow,
  type SongPerformanceHistoryItem,
} from "@/utils/worshipLeaderHistory";
import Card from "@/components/server/card";
import SongDetailClient from "./SongDetailClient";
import SongYouTubeSection from "@/components/client/SongYouTubeSection";
import SongTagBadge from "@/components/SongTags/SongTagBadge";

export const dynamic = "force-dynamic";

interface SongViewerPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generates page-level metadata from the song title.
 * Falls back gracefully if the song cannot be fetched (e.g. unauthenticated).
 */
export async function generateMetadata({ params }: SongViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("songs")
    .select("title, artist")
    .eq("id", id)
    .single();

  if (!data) {
    return { title: "Song" };
  }

  return {
    title: data.title,
    description: `Chord sheet for ${data.title} by ${data.artist}.`,
  };
}

export default async function SongViewerPage({ params }: SongViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth check (no redirect — page is public; used only for RBAC below) ───
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // ── Parallel SSR Fetch: song + performance history (AC-1..AC-4) ───────────
  // BUG-018: Format today as YYYY-MM-DD in UTC convention to compare against timestamptz
  const todayStr = new Date().toISOString().slice(0, 10);

  const [initialSongResult, historyQueryResult] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, original_key, content, youtube_url, tags")
      .eq("id", id)
      .single(),
    supabase
      .from("setlist_songs")
      .select(
        "song_id, performance_key, setlists!inner(id, name, date, worship_leader_id, is_public, musicians:worship_leader_id(id, name))"
      )
      .eq("song_id", id)
      .not("setlists.worship_leader_id", "is", null)
      .lt("setlists.date", todayStr)
      .then(
        (res) => res,
        () => ({ data: null, error: { message: "History query failed" } })
      ),
  ]);

  let songResult = initialSongResult;

  if (songResult.error && songResult.error.code === "42703") {
    songResult = (await supabase
      .from("songs")
      .select("id, title, artist, original_key, content, youtube_url")
      .eq("id", id)
      .single()) as typeof songResult;
  }

  const song = songResult.data;
  const songError = songResult.error;
  const songErrorCode = songError?.code ?? null;

  // ── Error states ────────────────────────────────────────────────────────────
  const isNotFound = !song || songErrorCode === "PGRST116";
  if (songError || !song) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/library"
            className={[
              "inline-flex items-center gap-1.5 mb-6",
              "text-sm font-medium text-brand-brown dark:text-brand-tan",
              "hover:text-brand-espresso dark:hover:text-brand-cream",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
            ].join(" ")}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Library
          </Link>

          <Card>
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
              {isNotFound
                ? "Song not found."
                : "Unable to load song. Please try again."}
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // ── Aggregate song performance history safely (AM-1 / BUG-017) ─────────────
  let historyItems: SongPerformanceHistoryItem[] = [];
  if (!historyQueryResult.error && historyQueryResult.data) {
    const rawHistoryRows =
      historyQueryResult.data as unknown as RawSongPerformanceRow[];
    historyItems = groupSongPerformanceHistory(rawHistoryRows, {
      today: todayStr,
    });
  }

  // ── Pre-process chord sheet (SSR) ───────────────────────────────────────────
  const processedLines = preProcessChords(song.content);

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <Link
          href="/library"
          className={[
            "inline-flex items-center gap-1.5 mb-6",
            "text-sm font-medium text-brand-brown dark:text-brand-tan",
            "hover:text-brand-espresso dark:hover:text-brand-cream",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
          ].join(" ")}
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to Library
        </Link>

        {/* ── Song header ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
              {song.title}
            </h1>
            {/* Edit button — music_director only */}
            {isMusicDirector && (
              <Link
                href={`/library/${id}/edit`}
                className={[
                  "shrink-0 flex items-center justify-center w-9 h-9 rounded-lg",
                  "text-brand-brown hover:text-brand-espresso hover:bg-brand-brown/10",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-1",
                ].join(" ")}
                aria-label="Edit song"
              >
                <Pencil size={15} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
              {song.artist}
            </p>
            {/* Original key badge */}
            <span className="text-xs font-semibold text-brand-brown dark:text-brand-tan bg-brand-cream dark:bg-brand-espresso rounded-lg px-2 py-0.5 border border-brand-brown/20 dark:border-brand-tan/20">
              Key of {song.original_key}
            </span>
            {/* Active tag badges */}
            {song.tags && song.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {song.tags.map((tag: string) => (
                  <SongTagBadge key={tag} tag={tag} size="md" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── YouTube section — embed toggle, add/edit (music_director), empty state ── */}
        <SongYouTubeSection
          songId={id}
          initialYoutubeUrl={song.youtube_url ?? null}
          isMusicDirector={isMusicDirector}
        />

        {/* ── Chord sheet & Chord Drawer — Client island ─────────────────────── */}
        <Card padding="lg">
          <SongDetailClient
            processedLines={processedLines}
            originalKey={song.original_key}
            historyItems={historyItems}
          />
        </Card>
      </div>
    </main>
  );
}
