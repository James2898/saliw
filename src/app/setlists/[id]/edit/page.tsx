import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import {
  getSetlistById,
  getSetlistWithSongs,
  getSetlistLineup,
} from "@/app/actions/setlistActions";
import { getAllSongs } from "@/app/actions/songActions";
import { listMusicians } from "@/app/actions/musicianActions";
import Card from "@/components/server/card";
import SetlistBuilderClient from "@/components/client/SetlistBuilder/SetlistBuilderClient";
import SetlistPeopleSection from "@/components/client/SetlistBuilder/SetlistPeopleSection";
import type {
  SortableSong,
  SongLibraryItem,
} from "@/components/client/SetlistBuilder/SetlistBuilderClient";

export const dynamic = "force-dynamic";

interface EditSetlistPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditSetlistPageProps) {
  const { id } = await params;
  const { data: setlist } = await getSetlistById({ id });
  if (!setlist) return { title: "Edit Setlist" };
  return { title: `Edit ${setlist.name}` };
}

export default async function EditSetlistPage({
  params,
}: EditSetlistPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth check ─────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Role check ─────────────────────────────────────────────────────────────
  let isMusicDirector = false;
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

  if (!isMusicDirector) {
    redirect(`/setlists/${id}`);
  }

  // ── Back link shared style ──────────────────────────────────────────────────
  const backLinkClass = [
    "inline-flex items-center gap-1.5 mb-6",
    "text-sm font-medium text-brand-brown dark:text-brand-tan",
    "hover:text-brand-espresso dark:hover:text-brand-cream",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
  ].join(" ");

  // ── Fetch setlist header ────────────────────────────────────────────────────
  const { data: setlist, error: setlistError } = await getSetlistById({ id });

  if (setlistError || !setlist) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <Link href={`/setlists/${id}`} className={backLinkClass}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlist
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

  // ── Parallel fetch: setlist songs + all songs + musicians + lineup ──────────
  const [
    { data: songsRaw, error: songsError },
    { data: allSongsRaw, error: libraryError },
    { data: musiciansRaw },
    { data: initialLineupRaw },
  ] = await Promise.all([
    getSetlistWithSongs({ setlist_id: id }),
    getAllSongs(),
    listMusicians(),
    getSetlistLineup({ setlist_id: id }),
  ]);

  if (songsError) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <Link href={`/setlists/${id}`} className={backLinkClass}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlist
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

  // ── Sort by order_index ascending ──────────────────────────────────────────
  const sortedSongs = (songsRaw ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  // ── Map to SortableSong[] ──────────────────────────────────────────────────
  const initialSongs: SortableSong[] = sortedSongs.map((entry, i) => ({
    junctionId: entry.id,
    songId: entry.song_id,
    title: entry.songs.title,
    artist: entry.songs.artist,
    originalKey: entry.songs.original_key,
    performanceKey: entry.performance_key,
    orderIndex: i,
  }));

  // ── Map allSongs to SongLibraryItem[] ──────────────────────────────────────
  const allSongs: SongLibraryItem[] = (allSongsRaw ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    original_key: s.original_key,
  }));

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darker font-sans">
      <main className="pt-4">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-8">
          <Link href={`/setlists/${id}`} className={backLinkClass}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlist
          </Link>

          {/* People section — worship leader + lineup */}
          <div className="mb-6">
            <Card>
              <SetlistPeopleSection
                setlistId={id}
                initialWorshipLeaderId={setlist.worship_leader_id}
                allMusicians={(musiciansRaw ?? []).map((m) => ({
                  id: m.id,
                  name: m.name,
                  notes: m.notes,
                }))}
                initialLineup={initialLineupRaw ?? []}
                isMusicDirector={true}
              />
            </Card>
          </div>

          <SetlistBuilderClient
            setlistId={id}
            setlistName={setlist.name}
            initialSongs={initialSongs}
            allSongs={allSongs}
            libraryError={libraryError}
            initialDate={setlist.date ? setlist.date.slice(0, 10) : ""}
            initialIsPublic={setlist.is_public}
          />
        </div>
      </main>
    </div>
  );
}
