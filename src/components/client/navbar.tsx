'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Music,
  LayoutDashboard,
  Library,
  List,
  Moon,
  Sun,
  LogIn,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/services/supabase/client'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/library', label: 'Library', Icon: Library },
  { href: '/setlists', label: 'Setlists', Icon: List },
] as const

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [isDark, setIsDark] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Initialise theme from localStorage on mount (client-only).
  // DOM class update is kept in a separate effect that runs whenever isDark changes.
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    const dark = stored === 'dark'
    if (dark !== isDark) {
      setIsDark(dark)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep document.documentElement in sync with isDark state
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  async function handleAuthAction() {
    if (user) {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Sign out failed:', error.message)
          return
        }
        router.refresh()
      } catch (err) {
        console.error('Unexpected sign out error:', err)
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-[var(--brand-background)] border-b border-brand-brown/20 text-brand-espresso dark:text-brand-cream">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-4">

        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 rounded-lg"
          aria-label="Saliw home"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-brown text-brand-cream">
            <Music size={16} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream">
            Saliw
          </span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-1 ml-4">
          {navLinks.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold font-sans',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan'
                    : 'text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 hover:text-brand-brown dark:hover:bg-brand-tan/10 dark:hover:text-brand-tan',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={[
            'flex items-center justify-center w-9 h-9 rounded-lg',
            'text-brand-espresso dark:text-brand-cream',
            'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2',
          ].join(' ')}
        >
          {isDark ? (
            <Sun size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Moon size={18} strokeWidth={2} aria-hidden="true" />
          )}
        </button>

        {/* Auth action */}
        <button
          type="button"
          onClick={handleAuthAction}
          aria-label={user ? 'Sign out' : 'Sign in'}
          className={[
            'flex items-center justify-center w-9 h-9 rounded-lg',
            'text-brand-espresso dark:text-brand-cream',
            'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2',
          ].join(' ')}
        >
          {user ? (
            <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          )}
        </button>

      </div>
    </nav>
  )
}
