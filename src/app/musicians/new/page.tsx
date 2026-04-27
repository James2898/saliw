import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import Card from '@/components/server/card'
import MusicianForm from '@/components/client/MusicianForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'New Musician',
}

export default async function NewMusicianPage() {
  const supabase = await createClient()

  // ── Auth guard ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── RBAC guard — music_director only ─────────────────────────────────────
  let isMusicDirector = false
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isMusicDirector = profile?.role === 'music_director'
  } catch {
    isMusicDirector = false
  }

  if (!isMusicDirector) {
    redirect('/musicians')
  }

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <Link
          href="/musicians"
          className={[
            'inline-flex items-center gap-1.5 mb-6',
            'text-sm font-medium text-brand-brown dark:text-brand-tan',
            'hover:text-brand-espresso dark:hover:text-brand-cream',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
          ].join(' ')}
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to Musicians
        </Link>

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
            New Musician
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
            Add a musician to the roster
          </p>
        </div>

        {/* ── Create form — Client island ───────────────────────────────────── */}
        <Card padding="lg">
          <MusicianForm mode="create" />
        </Card>
      </div>
    </main>
  )
}
