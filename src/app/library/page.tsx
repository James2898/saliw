import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import SearchBar from '@/components/client/SearchBar'

export const metadata = {
  title: 'Song Library — Saliw',
  description: 'Browse and search the full worship song library.',
}

type SongRow = {
  id: string
  title: string
  artist: string
  original_key: string
}

interface LibraryPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const supabase = await createClient()

  // ── Auth check ─────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Resolve search params ───────────────────────────────────────────────────
  const params = await searchParams
  const q = (params.q?.trim() ?? '').slice(0, 100)

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
    // Degrade gracefully — no Edit links shown if profile fetch fails
    isMusicDirector = false
  }

  // ── Fetch songs ─────────────────────────────────────────────────────────────
  // SELECT only metadata columns — content (lyrics/chords) is intentionally excluded
  let songs: SongRow[] = []
  let fetchError = false

  try {
    let query = supabase
      .from('songs')
      .select('id, title, artist, original_key')
      .order('title', { ascending: true })

    if (q) {
      query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      fetchError = true
    } else {
      songs = (data ?? []) as SongRow[]
    }
  } catch {
    fetchError = true
  }

  // ── Derived empty-state message ─────────────────────────────────────────────
  const emptyMessage = fetchError
    ? 'Unable to load songs. Please try again.'
    : q
    ? 'No songs match your search.'
    : 'No songs in the library yet.'

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-8 font-sans">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso mb-1">
          Song Library
        </h1>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-6">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}{q ? ` matching "${q}"` : ' in library'}
        </p>

        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <SearchBar defaultValue={q} />
        </div>

        {/* ── Song list ────────────────────────────────────────────────────── */}
        {songs.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <div
            className="rounded-2xl border border-brand-brown/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-brand-brown">
              {emptyMessage}
            </p>
          </div>
        ) : (
          /* ── Song rows ───────────────────────────────────────────────────── */
          <ul className="flex flex-col gap-2" role="list">
            {songs.map((song) => (
              <li key={song.id}>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-tan-alpha)] border border-brand-brown/10 hover:border-brand-tan transition-colors duration-200">
                  {/* Row hit-area — navigates to viewer */}
                  <Link
                    href={`/library/${song.id}`}
                    className={[
                      'flex-1 flex items-center justify-between px-4 py-3 rounded-xl',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-1',
                      'min-w-0',
                    ].join(' ')}
                    aria-label={`View ${song.title} by ${song.artist}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-espresso leading-snug">
                        {song.title}
                      </p>
                      <p className="truncate text-xs font-medium text-brand-brown mt-0.5">
                        {song.artist}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-xs font-semibold text-brand-brown bg-brand-cream rounded-lg px-2 py-0.5 border border-brand-brown/20">
                      {song.original_key}
                    </span>
                  </Link>

                  {/* Edit shortcut — music_director only */}
                  {isMusicDirector && (
                    <Link
                      href={`/library/${song.id}/edit`}
                      className={[
                        'shrink-0 flex items-center justify-center w-9 h-9 mr-2 rounded-lg',
                        'text-brand-brown hover:text-brand-espresso hover:bg-brand-brown/10',
                        'transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-1',
                      ].join(' ')}
                      aria-label={`Edit ${song.title}`}
                    >
                      <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
