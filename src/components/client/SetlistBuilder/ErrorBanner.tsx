'use client'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-lg px-4 py-3 flex items-start gap-2"
    >
      <p className="text-sm text-brand-brown flex-1">{message}</p>
      <button
        type="button"
        aria-label="Dismiss error"
        onClick={onDismiss}
        className="text-brand-brown/60 hover:text-brand-brown transition-colors duration-200 shrink-0 leading-none"
      >
        ✕
      </button>
    </div>
  )
}
