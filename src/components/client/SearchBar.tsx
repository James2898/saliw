'use client'

import { useRouter } from 'next/navigation'
import { useRef, useCallback } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  defaultValue: string
  basePath?: string
}

/**
 * SearchBar — Client Component for the Song Library.
 *
 * Accepts the current search query as `defaultValue` (passed from the Server Component
 * via the URL `?q` param) and debounces URL updates at 300ms to avoid firing a
 * navigation on every keystroke.
 *
 * Uses `router.replace` to avoid polluting browser history on every keypress.
 * Does NOT call Supabase or any Server Action.
 */
export default function SearchBar({ defaultValue, basePath = '/library' }: SearchBarProps) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value.trim()

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        if (term) {
          router.replace(`${basePath}?q=${encodeURIComponent(term)}`)
        } else {
          router.replace(basePath)
        }
      }, 300)
    },
    [router, basePath]
  )

  return (
    <div className="relative w-full max-w-md">
      {/* Search icon — decorative, positioned inside the input */}
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
        aria-hidden="true"
      >
        <Search
          size={16}
          strokeWidth={2}
          className="text-brand-tan"
        />
      </span>

      <input
        type="search"
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder="Search by title or artist…"
        aria-label="Search songs by title or artist"
        className={[
          'w-full pl-9 pr-4 py-2 rounded-xl',
          'bg-brand-cream',
          'border border-brand-tan',
          'font-sans text-sm text-brand-espresso',
          'placeholder:text-brand-tan',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-2',
          'transition-colors duration-200',
        ].join(' ')}
      />
    </div>
  )
}
