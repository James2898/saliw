import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/services/supabase/server'
import { listMusicians } from '@/app/actions/musicianActions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Musicians',
  description: 'Browse and manage the musicians roster.',
}

export default async function MusiciansPage() {
  const supabase = await createClient()

  // ── Auth check ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Fetch user role for RBAC ─────────────────────────────────────────────
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

  // ── Fetch musicians ───────────────────────────────────────────────────────
  const { data: musicians, error: musiciansError } = await listMusicians()

  // ── Error branch — BUG-003: full layout shell required ───────────────────
  if (musiciansError) {
    return (
      <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-6">
            Musicians
          </h1>
          <div
            className="rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center"
            role="alert"
          >
            <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan">
              {musiciansError}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const musicianList = musicians ?? []

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream">
            Musicians
          </h1>
          {isMusicDirector && (
            <Link
              href="/musicians/new"
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso',
                'text-sm font-semibold font-sans',
                'border border-brand-tan dark:border-brand-tan',
                'hover:bg-brand-brown hover:text-brand-cream hover:border-brand-brown',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
              ].join(' ')}
            >
              New Musician
            </Link>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-6">
          {musicianList.length} {musicianList.length === 1 ? 'musician' : 'musicians'}
        </p>

        {/* ── Musician list ─────────────────────────────────────────────────── */}
        <div className="mt-2">
          {musicianList.length === 0 ? (
            /* ── Empty state ─────────────────────────────────────────────────── */
            <div
              className="rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-brand-brown dark:text-brand-tan">
                No musicians yet.
              </p>
              {isMusicDirector && (
                <p className="text-xs text-brand-brown/70 dark:text-brand-tan/70 mt-1">
                  Add your first musician using the button above.
                </p>
              )}
            </div>
          ) : (
            /* ── Musician rows ───────────────────────────────────────────────── */
            <ul className="flex flex-col gap-2" role="list">
              {musicianList.map((musician) => (
                <li key={musician.id} className="relative">
                  <div
                    className={[
                      'flex flex-col md:flex-row md:items-center md:justify-between gap-2',
                      'bg-brand-cream dark:bg-brand-espresso',
                      'rounded-xl border-l-4 border-brand-tan p-4',
                      isMusicDirector ? 'pr-10' : '',
                    ].join(' ')}
                  >
                    {/* Musician name */}
                    <p className="font-extrabold text-brand-espresso dark:text-brand-cream truncate min-w-0 md:flex-1 md:mr-4">
                      {musician.name}
                    </p>

                    {/* Notes preview */}
                    {musician.notes && (
                      <p className="text-xs text-brand-espresso/60 dark:text-brand-cream/50 truncate md:max-w-xs md:shrink-0">
                        {musician.notes}
                      </p>
                    )}
                  </div>

                  {/* Edit link — music directors only */}
                  {isMusicDirector && (
                    <Link
                      href={`/musicians/${musician.id}/edit`}
                      aria-label={`Edit musician: ${musician.name}`}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-brand-brown/50 dark:text-brand-tan/50 hover:text-brand-brown dark:hover:text-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1"
                    >
                      <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
