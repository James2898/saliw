import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import { preProcessChords } from '@/utils/musicLogic'
import Card from '@/components/server/card'
import ChordSheetClient from '@/components/SongViewer/ChordSheetClient'

export const dynamic = 'force-dynamic'

interface SongViewerPageProps {
  params: Promise<{ id: string }>
}

/**
 * Generates page-level metadata from the song title.
 * Falls back gracefully if the song cannot be fetched (e.g. unauthenticated).
 */
export async function generateMetadata({ params }: SongViewerPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('songs')
    .select('title, artist')
    .eq('id', id)
    .single()

  if (!data) {
    return { title: 'Song — Saliw' }
  }

  return {
    title: `${data.title} — Saliw`,
    description: `Chord sheet for ${data.title} by ${data.artist}.`,
  }
}

export default async function SongViewerPage({ params }: SongViewerPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Fetch user role for RBAC ────────────────────────────────────────────────
  let isMusicDirector = false
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isMusicDirector = profile?.role === 'music_director'
  } catch {
    // Degrade gracefully — edit button hidden if profile fetch fails
    isMusicDirector = false
  }

  // ── Fetch song ──────────────────────────────────────────────────────────────
  const songResult = await supabase
    .from('songs')
    .select('id, title, artist, original_key, content')
    .eq('id', id)
    .single()

  const song = songResult.data
  const songError = songResult.error
  const songErrorCode = songError?.code ?? null

  // ── Error states ────────────────────────────────────────────────────────────
  const isNotFound = !song || songErrorCode === 'PGRST116'
  if (songError || !song) {

    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/library"
            className={[
              'inline-flex items-center gap-1.5 mb-6',
              'text-sm font-medium text-brand-brown dark:text-brand-tan',
              'hover:text-brand-espresso dark:hover:text-brand-cream',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
            ].join(' ')}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to Library
          </Link>

          <Card>
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
              {isNotFound
                ? 'Song not found.'
                : 'Unable to load song. Please try again.'}
            </p>
          </Card>
        </div>
      </main>
    )
  }

  // ── Pre-process chord sheet (SSR) ───────────────────────────────────────────
  const processedLines = preProcessChords(song.content)

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <Link
          href="/library"
          className={[
            'inline-flex items-center gap-1.5 mb-6',
            'text-sm font-medium text-brand-brown dark:text-brand-tan',
            'hover:text-brand-espresso dark:hover:text-brand-cream',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
          ].join(' ')}
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
                  'shrink-0 flex items-center justify-center w-9 h-9 rounded-lg',
                  'text-brand-brown hover:text-brand-espresso hover:bg-brand-brown/10',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-1',
                ].join(' ')}
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
          </div>
        </div>

        {/* ── Chord sheet — Client island ───────────────────────────────────── */}
        <Card padding="lg">
          <ChordSheetClient
            processedLines={processedLines}
            originalKey={song.original_key}
          />
        </Card>
      </div>
    </main>
  )
}
