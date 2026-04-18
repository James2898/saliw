import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import SearchBar from '@/components/client/SearchBar'
import NewSongButton from '@/components/library/NewSongButton'
import PaginationControls from '@/components/client/PaginationControls'

export const metadata = {
  title: 'Song Library — Saliw',
  description: 'Browse and search the full worship song library.',
}

const PAGE_SIZE = 10

type SongRow = {
  id: string
  title: string
  artist: string
  original_key: string
}

interface LibraryPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
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
  // Strip PostgREST filter metacharacters to prevent filter-clause injection
  const q = (params.q?.trim() ?? '').slice(0, 100).replace(/[(),%]/g, '')

  // Parse page param — clamp to 1 as a lower bound; upper bound applied after count is known
  const rawPage = parseInt(params.page ?? '1', 10)
  const parsedPage = isNaN(rawPage) ? 1 : rawPage
  const requestedPage = Math.max(1, parsedPage)

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

  // ── Fetch songs (paginated, single round-trip) ──────────────────────────────
  // SELECT only metadata columns — content (lyrics/chords) is intentionally excluded
  let songs: SongRow[] = []
  let fetchError = false
  let count: number | null = null

  try {
    let query = supabase
      .from('songs')
      .select('id, title, artist, original_key', { count: 'exact', head: false })
      .order('title', { ascending: true })

    if (q) {
      query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
    }

    const offset = (requestedPage - 1) * PAGE_SIZE
    const { data, error, count: rowCount } = await query.range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      fetchError = true
    } else {
      songs = (data ?? []) as SongRow[]
      count = rowCount
    }
  } catch {
    fetchError = true
  }

  // ── Derive pagination values ────────────────────────────────────────────────
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  // Clamp currentPage to [1, totalPages] — handles out-of-bounds ?page params
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1

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
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso">
            Song Library
          </h1>
          {/* Desktop New Song button — mobile FAB renders at fixed viewport position */}
          <NewSongButton isMusicDirector={isMusicDirector} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-6">
          {totalCount} {totalCount === 1 ? 'song' : 'songs'}{q ? ` matching "${q}"` : ' in library'}
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

        {/* ── Pagination controls ───────────────────────────────────────────── */}
        {!fetchError && totalCount > 0 && (
          <div className="mt-6">
            <PaginationControls
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              q={q || undefined}
            />
          </div>
        )}
      </div>
    </main>
  )
}
