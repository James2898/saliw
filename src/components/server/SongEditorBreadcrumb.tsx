import Link from 'next/link'

interface SongEditorBreadcrumbProps {
  songId: string
  songTitle?: string
}

export default function SongEditorBreadcrumb({ songId, songTitle }: SongEditorBreadcrumbProps) {
  const linkClass = [
    'text-sm font-medium text-brand-brown dark:text-brand-tan',
    'hover:text-brand-espresso dark:hover:text-brand-cream',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
  ].join(' ')

  const separatorClass = 'text-sm text-brand-brown/40 dark:text-brand-tan/40 mx-1.5 select-none'

  const currentClass = 'text-sm font-medium text-brand-brown/50 dark:text-brand-tan/50'

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap mb-6">
      <Link href="/library" className={linkClass}>
        Song Library
      </Link>

      <span className={separatorClass} aria-hidden="true">/</span>

      {songTitle ? (
        <>
          <Link href={`/library/${songId}`} className={linkClass}>
            {songTitle}
          </Link>
          <span className={separatorClass} aria-hidden="true">/</span>
          <span className={currentClass} aria-current="page">Edit</span>
        </>
      ) : (
        <span className={currentClass} aria-current="page">Edit</span>
      )}
    </nav>
  )
}
