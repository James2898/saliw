import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'

export const metadata = {
  title: 'Song Library — Saliw',
  description: 'Browse and search the full worship song library.',
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'var(--font-plus-jakarta-sans, sans-serif)',
        backgroundColor: 'var(--brand-background)',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--brand-espresso)',
          marginBottom: '0.5rem',
        }}
      >
        Song Library
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--brand-tan)',
        }}
      >
        {user.email}
      </p>
    </main>
  )
}
