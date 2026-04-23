import type { Metadata } from 'next'
import { createClient } from '@/services/supabase/server'
import GreetingStrip from '@/components/dashboard/GreetingStrip'
import NextUpCard, { type NextUpSetlist } from '@/components/dashboard/NextUpCard'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentSongs, { type RecentSong } from '@/components/dashboard/RecentSongs'
import ActivityFeed, { type ActivityItem } from '@/components/dashboard/ActivityFeed'
import PublicDashboardView from '@/components/dashboard/PublicDashboardView'

export const metadata: Metadata = {
  title: 'Dashboard — Saliw',
}

type UpcomingRow = {
  id: string
  name: string
  date: string
  setlist_songs: { count: number }[]
}

type ActivitySongRow = {
  id: string
  title: string
  updated_at: string
}

type ActivitySetlistRow = {
  id: string
  name: string
  updated_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // ── Auth check — unauthenticated visitors see the public marketing view ────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <PublicDashboardView />
  }

  // ── Profile (role + full name) ──────────────────────────────────────────────
  let isMusicDirector = false
  let fullName = ''
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    isMusicDirector = profile?.role === 'music_director'
    fullName = profile?.full_name ?? ''
  } catch {
    // Fall through with default empty profile; page still renders.
  }

  // ── Parallel data block — all widget data in a single Promise.all ──────────
  const todayISO = new Date().toISOString().slice(0, 10)

  const [upcomingRes, recentSongsRes, activitySongsRes, activitySetlistsRes] =
    await Promise.all([
      supabase
        .from('setlists')
        .select('id, name, date, setlist_songs(count)')
        .gte('date', todayISO)
        .order('date', { ascending: true })
        .limit(1),

      supabase
        .from('songs')
        .select('id, title, artist, original_key')
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('songs')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5),

      supabase
        .from('setlists')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5),
    ])

  // ── Resolve Next Up setlist (upcoming first, then most recent past) ────────
  let nextUp: NextUpSetlist | null = null
  const upcomingRow = (upcomingRes.data as UpcomingRow[] | null)?.[0] ?? null
  if (upcomingRow) {
    nextUp = {
      id: upcomingRow.id,
      name: upcomingRow.name,
      date: upcomingRow.date,
      songCount: upcomingRow.setlist_songs[0]?.count ?? 0,
    }
  } else if (!upcomingRes.error) {
    // Fallback — only run a second query when the upcoming query came back empty (not errored).
    try {
      const pastRes = await supabase
        .from('setlists')
        .select('id, name, date, setlist_songs(count)')
        .lt('date', todayISO)
        .order('date', { ascending: false })
        .limit(1)

      const pastRow = (pastRes.data as UpcomingRow[] | null)?.[0] ?? null
      if (pastRow) {
        nextUp = {
          id: pastRow.id,
          name: pastRow.name,
          date: pastRow.date,
          songCount: pastRow.setlist_songs[0]?.count ?? 0,
        }
      }
    } catch {
      // Fall through — render empty-state hero.
    }
  }

  // ── Recent Songs ────────────────────────────────────────────────────────────
  const recentSongs: RecentSong[] = recentSongsRes.error
    ? []
    : (recentSongsRes.data ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        original_key: s.original_key,
      }))

  // ── Activity Feed (merge + sort + top 6) ───────────────────────────────────
  const activitySongs: ActivityItem[] = activitySongsRes.error
    ? []
    : ((activitySongsRes.data ?? []) as ActivitySongRow[]).map((s) => ({
        type: 'song' as const,
        id: s.id,
        name: s.title,
        updated_at: s.updated_at,
      }))

  const activitySetlists: ActivityItem[] = activitySetlistsRes.error
    ? []
    : ((activitySetlistsRes.data ?? []) as ActivitySetlistRow[]).map((s) => ({
        type: 'setlist' as const,
        id: s.id,
        name: s.name,
        updated_at: s.updated_at,
      }))

  const feed: ActivityItem[] = [...activitySongs, ...activitySetlists]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6)

  // Render-time timestamp for relative time computation in the Activity Feed.
  const serverNow = new Date()

  return (
    <div className="flex flex-col gap-6">
      <GreetingStrip fullName={fullName} isMusicDirector={isMusicDirector} />

      <NextUpCard setlist={nextUp} isMusicDirector={isMusicDirector} />

      {isMusicDirector && <QuickActions />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentSongs songs={recentSongs} />
        <ActivityFeed items={feed} now={serverNow} />
      </div>
    </div>
  )
}
