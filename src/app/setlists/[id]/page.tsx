import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import { preProcessChords } from "@/utils/musicLogic";
import {
  getSetlistById,
  getSetlistWithSongs,
  getSetlistLineup,
} from "@/app/actions/setlistActions";
import { listMusicians } from "@/app/actions/musicianActions";
import Card from "@/components/server/card";
import SetlistViewerClient from "./SetlistViewerClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SetlistViewerPageProps) {
  const { id } = await params;
  const [
    { data: setlist },
    { data: songsRaw },
    { data: lineupRaw },
    { data: musiciansRaw },
  ] = await Promise.all([
    getSetlistById({ id }),
    getSetlistWithSongs({ setlist_id: id }),
    getSetlistLineup({ setlist_id: id }),
    listMusicians(),
  ]);

  if (!setlist) return { title: "Setlist" };

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

  const worshipLeaderName =
    musiciansRaw?.find((m) => m.id === setlist.worship_leader_id)?.name ?? null;

  const songs = (songsRaw ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const songList = songs.map((s) => s.songs.title).join(", ");

  const lineupParts = (lineupRaw ?? []).map(
    (entry) => `${entry.musicians.name} (${entry.instrument})`
  );

  const descriptionParts: string[] = [];
  if (formattedDate) descriptionParts.push(formattedDate);
  if (worshipLeaderName)
    descriptionParts.push(`Worship Leader: ${worshipLeaderName}`);
  if (lineupParts.length)
    descriptionParts.push(`Musicians: ${lineupParts.join(", ")}`);
  if (songList) descriptionParts.push(`Songs: ${songList}`);

  const description = descriptionParts.join(" · ") || "View setlist on Saliw.";
  const pageUrl = `https://saliw.vercel.app/setlists/${id}`;

  return {
    title: setlist.name,
    description,
    openGraph: {
      title: `${setlist.name} | Saliw`,
      description,
      url: pageUrl,
      siteName: "Saliw",
      images: [
        {
          url: `/setlists/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${setlist.name} setlist`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${setlist.name} | Saliw`,
      description,
      images: [`/setlists/${id}/opengraph-image`],
    },
  };
}

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

  // ── Parallel fetch: songs + musicians + lineup ──────────────────────────────
  const [
    { data: songsRaw, error: songsError },
    { data: musiciansRaw },
    { data: lineupRaw },
  ] = await Promise.all([
    getSetlistWithSongs({ setlist_id: id }),
    listMusicians(),
    getSetlistLineup({ setlist_id: id }),
  ]);

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

  // ── Resolve worship leader name server-side (AC-29) ────────────────────────
  const worshipLeaderName =
    musiciansRaw?.find((m) => m.id === setlist.worship_leader_id)?.name ?? null;

  // ── Build simplified lineup for viewer (AC-30) ─────────────────────────────
  const lineup: Array<{ name: string; instrument: string }> = (
    lineupRaw ?? []
  ).map((entry) => ({
    name: entry.musicians.name,
    instrument: entry.instrument,
  }));

  // ── Sort songs by order_index ascending ────────────────────────────────────
  const songs = (songsRaw ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  // ── Pre-process chord sheets server-side ───────────────────────────────────
  const processedSongs = songs.map((entry) => ({
    junctionId: entry.id,
    songId: entry.song_id,
    setlistId: id,
    title: entry.songs.title,
    artist: entry.songs.artist,
    originalKey: entry.songs.original_key,
    performanceKey: entry.performance_key,
    processedLines: preProcessChords(entry.songs.content),
    youtubeUrl: entry.songs.youtube_url ?? null,
  }));

  // ── Navigator song list ─────────────────────────────────────────────────────
  const navigatorSongs = processedSongs.map((s) => ({
    junctionId: s.junctionId,
    title: s.title,
  }));

  // ── Format date for display ─────────────────────────────────────────────────
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
                isMusicDirector={isMusicDirector}
                setlistName={setlist.name}
                formattedDate={formattedDate}
                worshipLeaderName={worshipLeaderName}
                lineup={lineup}
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
              isMusicDirector={isMusicDirector}
              setlistName={setlist.name}
              formattedDate={formattedDate}
              worshipLeaderName={worshipLeaderName}
              lineup={lineup}
            />
          )}
        </div>
      </main>
    </div>
  );
}
