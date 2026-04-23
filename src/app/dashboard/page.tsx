import type { Metadata } from 'next'
import { createClient } from '@/services/supabase/server'
import GreetingStrip from '@/components/dashboard/GreetingStrip'
import NextUpCard, { type NextUpSetlist } from '@/components/dashboard/NextUpCard'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentSongs, { type RecentSong } from '@/components/dashboard/RecentSongs'
import UpcomingSetlists, {
  type UpcomingSetlist,
} from '@/components/dashboard/UpcomingSetlists'
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

export default async function DashboardPage() {
  const supabase = await createClient()

  // ── Auth check — unauthenticated visitors see the public marketing view ────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const todayISO = new Date().toISOString().slice(0, 10)

  if (!user) {
    // Guest path: fetch only public upcoming setlists (RLS limits to is_public rows).
    let guestUpcoming: UpcomingSetlist[] = []
    try {
      const { data, error } = await supabase
        .from('setlists')
        .select('id, name, date, setlist_songs(count)')
        .gte('date', todayISO)
        .order('date', { ascending: true })
        .limit(5)

      if (!error && data) {
        guestUpcoming = (data as UpcomingRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          date: row.date,
          songCount: row.setlist_songs[0]?.count ?? 0,
        }))
      }
    } catch {
      // Swallow — render with empty upcoming list.
    }
    return <PublicDashboardView upcomingSetlists={guestUpcoming} />
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
  const [upcomingRes, recentSongsRes, upcomingListRes] = await Promise.all([
    // Next Up hero — single nearest upcoming setlist
    supabase
      .from('setlists')
      .select('id, name, date, setlist_songs(count)')
      .gte('date', todayISO)
      .order('date', { ascending: true })
      .limit(1),

    // Recent Songs widget
    supabase
      .from('songs')
      .select('id, title, artist, original_key')
      .order('created_at', { ascending: false })
      .limit(5),

    // Upcoming Setlists widget — up to 5 upcoming
    supabase
      .from('setlists')
      .select('id, name, date, setlist_songs(count)')
      .gte('date', todayISO)
      .order('date', { ascending: true })
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

  // ── Upcoming Setlists ───────────────────────────────────────────────────────
  const upcomingSetlists: UpcomingSetlist[] = upcomingListRes.error
    ? []
    : ((upcomingListRes.data ?? []) as UpcomingRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        date: row.date,
        songCount: row.setlist_songs[0]?.count ?? 0,
      }))

  return (
    <div className="flex flex-col gap-6">
      <GreetingStrip fullName={fullName} isMusicDirector={isMusicDirector} />

      <NextUpCard setlist={nextUp} isMusicDirector={isMusicDirector} />

      {isMusicDirector && <QuickActions />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentSongs songs={recentSongs} />
        <UpcomingSetlists setlists={upcomingSetlists} />
      </div>
    </div>
  )
}
