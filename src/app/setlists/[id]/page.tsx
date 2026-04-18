import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import { preProcessChords } from '@/utils/musicLogic'
import { getSetlistById, getSetlistWithSongs } from '@/app/actions/setlistActions'
import Card from '@/components/server/card'
import ServiceNavigator from '@/components/client/ServiceNavigator'
import SetlistSongSection from '@/components/client/SetlistSongSection'

export const dynamic = 'force-dynamic'

interface SetlistViewerPageProps {
  params: Promise<{ id: string }>
}

export default async function SetlistViewerPage({ params }: SetlistViewerPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Fetch setlist header ────────────────────────────────────────────────────
  const { data: setlist, error: setlistError } = await getSetlistById({ id })

  if (setlistError || !setlist) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/setlists"
            className={[
              'inline-flex items-center gap-1.5 mb-6',
              'text-sm font-medium text-brand-brown dark:text-brand-tan',
              'hover:text-brand-espresso dark:hover:text-brand-cream',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
            ].join(' ')}
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
    )
  }

  // ── Fetch songs ─────────────────────────────────────────────────────────────
  const { data: songsRaw, error: songsError } = await getSetlistWithSongs({ setlist_id: id })

  if (songsError) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/setlists"
            className={[
              'inline-flex items-center gap-1.5 mb-6',
              'text-sm font-medium text-brand-brown dark:text-brand-tan',
              'hover:text-brand-espresso dark:hover:text-brand-cream',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
            ].join(' ')}
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
    )
  }

  // ── Compute leader status ───────────────────────────────────────────────────
  const isLeader = user.id === setlist.leader_id

  // ── Sort songs by order_index ascending ────────────────────────────────────
  const songs = (songsRaw ?? []).slice().sort((a, b) => a.order_index - b.order_index)

  // ── Pre-process chord sheets server-side ───────────────────────────────────
  const processedSongs = songs.map((entry) => ({
    junctionId: entry.id,
    setlistId: id,
    title: entry.songs.title,
    artist: entry.songs.artist,
    performanceKey: entry.performance_key,
    processedLines: preProcessChords(entry.songs.content),
  }))

  // ── Navigator song list ─────────────────────────────────────────────────────
  const navigatorSongs = processedSongs.map((s) => ({
    junctionId: s.junctionId,
    title: s.title,
  }))

  // ── Format date for display ─────────────────────────────────────────────────
  const formattedDate = setlist.date
    ? new Date(setlist.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darker font-sans">
      {/* ── Service Navigator ──────────────────────────────────────────────── */}
      <ServiceNavigator songs={navigatorSongs} />

      {/* ── Main content — offset for sidebar on large screens ─────────────── */}
      <main className="lg:pl-64">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-8">
          {/* ── Back link ───────────────────────────────────────────────────── */}
          <Link
            href="/setlists"
            className={[
              'inline-flex items-center gap-1.5 mb-6',
              'text-sm font-medium text-brand-brown dark:text-brand-tan',
              'hover:text-brand-espresso dark:hover:text-brand-cream',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
            ].join(' ')}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Setlists
          </Link>

          {/* ── Setlist header ───────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
              {setlist.name}
            </h1>
            {formattedDate && (
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
                {formattedDate}
              </p>
            )}
          </div>

          {/* ── Empty state ──────────────────────────────────────────────────── */}
          {processedSongs.length === 0 ? (
            <Card>
              <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
                No songs in this setlist yet.
              </p>
            </Card>
          ) : (
            /* ── Song sections ──────────────────────────────────────────────── */
            <div className="flex flex-col gap-10">
              {processedSongs.map((song) => (
                <SetlistSongSection
                  key={song.junctionId}
                  junctionId={song.junctionId}
                  setlistId={song.setlistId}
                  title={song.title}
                  artist={song.artist}
                  processedLines={song.processedLines}
                  performanceKey={song.performanceKey}
                  isLeader={isLeader}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
