import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/services/supabase/server";
import { getAllSongs } from "@/app/actions/songActions";
import { listMusicians } from "@/app/actions/musicianActions";
import Card from "@/components/server/card";
import SetlistBuilderClient from "@/components/client/SetlistBuilder/SetlistBuilderClient";
import type { SongLibraryItem } from "@/components/client/SetlistBuilder/SetlistBuilderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Setlist",
};

export default async function NewSetlistPage() {
  const supabase = await createClient();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── RBAC guard — music_director only ───────────────────────────────────────
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
    redirect("/setlists");
  }

  // ── Parallel fetch: all songs + musicians ──────────────────────────────────
  const [{ data: allSongsRaw, error: libraryError }, { data: musiciansRaw }] =
    await Promise.all([getAllSongs(), listMusicians()]);

  const allSongs: SongLibraryItem[] = (allSongsRaw ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    original_key: s.original_key,
  }));

  // Map musicians to { id, name } only — notes excluded (BUG-011 guard)
  const allMusicians = (musiciansRaw ?? []).map((m) => ({
    id: m.id,
    name: m.name,
  }));

  const backLinkClass = [
    "inline-flex items-center gap-1.5 mb-6",
    "text-sm font-medium text-brand-brown dark:text-brand-tan",
    "hover:text-brand-espresso dark:hover:text-brand-cream",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
  ].join(" ");

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <Link href="/setlists" className={backLinkClass}>
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to Setlists
        </Link>

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
            New Setlist
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
            Create a new setlist
          </p>
        </div>

        {/* ── Setlist builder — Client island ───────────────────────────────── */}
        <Card padding="lg">
          <SetlistBuilderClient
            setlistId={null}
            setlistName=""
            initialSongs={[]}
            allSongs={allSongs}
            libraryError={libraryError}
            initialDate=""
            allMusicians={allMusicians}
            isMusicDirector={isMusicDirector}
          />
        </Card>
      </div>
    </main>
  );
}
