import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'
import Card from '@/components/server/card'
import SongEditorClient from '@/components/client/SongEditorClient'
import SongEditorBreadcrumb from '@/components/server/SongEditorBreadcrumb'
import type { Song } from '@/types/Song'

export const dynamic = 'force-dynamic'

interface SongEditPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: SongEditPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('songs')
    .select('title')
    .eq('id', id)
    .single()

  if (!data) {
    return { title: 'Edit Song' }
  }

  return {
    title: `Edit ${data.title}`,
  }
}

export default async function SongEditPage({ params }: SongEditPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── RBAC guard — music_director only ───────────────────────────────────────
  let isMusicDirector = false
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isMusicDirector = profile?.role === 'music_director'
  } catch {
    // Degrade gracefully — treat as non-director on profile fetch failure
    isMusicDirector = false
  }

  if (!isMusicDirector) {
    redirect(`/library/${id}`)
  }

  // ── Fetch song ──────────────────────────────────────────────────────────────
  const songResult = await supabase
    .from('songs')
    .select('id, title, artist, original_key, content, singer')
    .eq('id', id)
    .single()

  const songData = songResult.data
  const songError = songResult.error
  const songErrorCode = songError?.code ?? null

  const isNotFound = !songData || songErrorCode === 'PGRST116'

  if (isNotFound || songError) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <SongEditorBreadcrumb songId={id} />

          <Card>
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan text-center py-6">
              {isNotFound ? 'Song not found.' : 'Unable to load song. Please try again.'}
            </p>
          </Card>
        </div>
      </main>
    )
  }

  const song: Song = {
    id: songData.id,
    title: songData.title,
    artist: songData.artist,
    original_key: songData.original_key,
    content: songData.content,
    singer: songData.singer ?? undefined,
  }

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
        <SongEditorBreadcrumb songId={id} songTitle={song.title} />

        {/* ── Song header ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
            {song.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
              {song.artist}
            </p>
            <span className="text-xs font-semibold text-brand-brown dark:text-brand-tan bg-brand-cream dark:bg-brand-espresso rounded-lg px-2 py-0.5 border border-brand-brown/20 dark:border-brand-tan/20">
              Key of {song.original_key}
            </span>
          </div>
        </div>

        {/* ── Editor — Client island ────────────────────────────────────────── */}
        <SongEditorClient song={song} />
      </div>
    </main>
  )
}
