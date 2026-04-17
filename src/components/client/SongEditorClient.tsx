'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { preProcessChords, NOTES } from '@/utils/musicLogic'
import { updateSong } from '@/app/actions/songActions'
import ChordSheetClient from '@/components/SongViewer/ChordSheetClient'
import type { Song } from '@/types/Song'

const inputBaseClass = [
  'w-full px-3 py-2 rounded-xl',
  'bg-brand-cream dark:bg-brand-espresso',
  'text-brand-espresso dark:text-brand-cream',
  'border border-brand-brown/30 dark:border-brand-tan/30',
  'text-sm font-sans',
  'placeholder:text-brand-brown/50 dark:placeholder:text-brand-tan/50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
  'transition-colors duration-200',
].join(' ')

const labelClass =
  'block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5'

interface SongEditorClientProps {
  song: Song
}

type MobileTab = 'edit' | 'preview'

export default function SongEditorClient({ song }: SongEditorClientProps) {
  const router = useRouter()

  // ── Content state ───────────────────────────────────────────────────────────
  const [currentContent, setCurrentContent] = useState(song.content)
  const [savedBaseline, setSavedBaseline] = useState(song.content)

  // ── Singer and Default Key state — lazy initializers avoid setState-in-effect ──
  const [singer, setSinger] = useState(() => song.singer ?? '')
  const [defaultKey, setDefaultKey] = useState(() => song.defaultKey ?? '')

  // ── Saved baselines for singer and defaultKey (for dirty-tracking) ──────────
  const [savedSinger, setSavedSinger] = useState(() => song.singer ?? '')
  const [savedDefaultKey, setSavedDefaultKey] = useState(() => song.defaultKey ?? '')

  // isDirty: true if content, singer, or defaultKey diverge from last saved state
  const isDirty =
    currentContent !== savedBaseline ||
    singer !== savedSinger ||
    defaultKey !== savedDefaultKey

  // ── Mobile tab state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MobileTab>('edit')

  // ── Save state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ── Unsaved-changes modal state ─────────────────────────────────────────────
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null)
  const isModalOpen = pendingNavHref !== null

  // ── Focus trap refs for modal ───────────────────────────────────────────────
  const modalStayRef = useRef<HTMLButtonElement>(null)
  const modalLeaveRef = useRef<HTMLButtonElement>(null)

  // ── beforeunload — browser-level guard ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Focus trap + Escape key for modal ──────────────────────────────────────
  useEffect(() => {
    if (!isModalOpen) return

    // Focus the "Stay" button when modal opens
    modalStayRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingNavHref(null)
        return
      }
      // Focus trap: Tab cycles between Stay and Leave buttons only
      if (e.key === 'Tab') {
        e.preventDefault()
        const focusedEl = document.activeElement
        if (focusedEl === modalStayRef.current) {
          modalLeaveRef.current?.focus()
        } else {
          modalStayRef.current?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  // ── Navigation guard helper ─────────────────────────────────────────────────
  const handleGuardedNavigation = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (isDirty) {
        e.preventDefault()
        setPendingNavHref(href)
      }
    },
    [isDirty]
  )

  // ── Modal actions ───────────────────────────────────────────────────────────
  const handleStay = () => setPendingNavHref(null)

  const handleLeave = () => {
    const href = pendingNavHref
    setPendingNavHref(null)
    if (href) router.push(href)
  }

  // ── Paste & Clean ───────────────────────────────────────────────────────────
  const handleClean = () => {
    const cleaned = currentContent
      .split(/\r?\n|\r/)
      .map((line) => line.trimEnd())
      .join('\n')
    setCurrentContent(cleaned)
    setSaveError(null)
  }

  // ── Save action ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty || isSaving) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const result = await updateSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      original_key: song.original_key,
      content: currentContent,
      singer: singer || undefined,
      default_key: defaultKey || undefined,
    })

    setIsSaving(false)

    if (result.error) {
      setSaveError(result.error)
    } else {
      setSavedBaseline(currentContent)
      setSavedSinger(singer)
      setSavedDefaultKey(defaultKey)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  // ── Live preview data ───────────────────────────────────────────────────────
  const processedLines = preProcessChords(currentContent)

  // ── Shared panel styles ─────────────────────────────────────────────────────
  const panelClasses = [
    'rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20',
    'bg-brand-cream dark:bg-brand-espresso',
    'p-4',
  ].join(' ')

  const tabButtonBase = [
    'px-4 py-2 text-sm font-semibold transition-colors duration-200 border-b-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
  ].join(' ')

  // ── Shared textarea element (reused in both mobile and desktop views) ───────
  const textareaEl = (
    <textarea
      value={currentContent}
      onChange={(e) => {
        setCurrentContent(e.target.value)
        if (saveError) setSaveError(null)
      }}
      aria-label="Song chord sheet editor"
      spellCheck={false}
      className={[
        'w-full min-h-[480px] resize-y rounded-xl p-3',
        'font-mono text-sm leading-relaxed',
        'text-brand-espresso dark:text-brand-cream',
        'bg-brand-cream dark:bg-brand-espresso',
        'border border-brand-brown/20 dark:border-brand-tan/20',
        'focus:outline-none focus:ring-2 focus:ring-brand-espresso dark:focus:ring-brand-tan focus:ring-offset-1',
        'transition-colors duration-200',
      ].join(' ')}
      style={{ whiteSpace: 'pre' }}
    />
  )

  // ── Shared preview element ──────────────────────────────────────────────────
  const previewEl = (
    <div className="overflow-x-auto">
      <ChordSheetClient
        processedLines={processedLines}
        originalKey={song.original_key}
      />
    </div>
  )

  return (
    <>
      {/* ── Metadata fields — Singer and Default Key ────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:gap-6">
        {/* Singer */}
        <div className="flex-1">
          <label htmlFor="editor-singer" className={labelClass}>
            Singer
          </label>
          <input
            id="editor-singer"
            type="text"
            value={singer}
            onChange={(e) => setSinger(e.target.value)}
            placeholder="Vocalist name"
            className={inputBaseClass}
          />
        </div>

        {/* Default Key */}
        <div className="flex-1">
          <label htmlFor="editor-default-key" className={labelClass}>
            Default Key
          </label>
          <select
            id="editor-default-key"
            value={defaultKey}
            onChange={(e) => setDefaultKey(e.target.value)}
            className={[inputBaseClass, 'cursor-pointer', 'font-mono font-bold'].join(' ')}
          >
            <option value="">— select key —</option>
            {(NOTES as string[]).map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          aria-label="Save changes"
          className={[
            'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
            isDirty && !isSaving
              ? 'bg-brand-espresso text-brand-cream hover:bg-brand-brown cursor-pointer'
              : 'bg-brand-espresso/30 text-brand-cream/50 opacity-50 cursor-not-allowed',
          ].join(' ')}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleClean}
          aria-label="Strip trailing whitespace and normalize line endings"
          className={[
            'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
            'text-brand-espresso dark:text-brand-cream',
            'bg-brand-cream dark:bg-brand-espresso',
            'border border-brand-brown/30 dark:border-brand-tan/30',
            'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
          ].join(' ')}
        >
          Clean
        </button>

        {isDirty && (
          <span className="text-xs font-medium text-brand-brown dark:text-brand-tan" aria-live="polite">
            Unsaved changes
          </span>
        )}

        {saveSuccess && (
          <span className="text-xs font-medium text-green-700 dark:text-green-400" aria-live="polite">
            Saved!
          </span>
        )}
      </div>

      {/* ── Save error ──────────────────────────────────────────────────────── */}
      {saveError && (
        <p role="alert" className="mb-4 text-sm font-medium text-red-700 dark:text-red-400">
          {saveError}
        </p>
      )}

      {/* ── Mobile tab bar — hidden on lg+ ──────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Editor view"
        className="flex gap-0 mb-4 border-b border-brand-brown/20 dark:border-brand-tan/20 lg:hidden"
      >
        <button
          id="tab-edit"
          type="button"
          role="tab"
          aria-selected={activeTab === 'edit'}
          aria-controls="panel-edit"
          onClick={() => setActiveTab('edit')}
          className={[
            tabButtonBase,
            activeTab === 'edit'
              ? 'text-brand-espresso dark:text-brand-cream border-brand-espresso dark:border-brand-cream'
              : 'text-brand-brown dark:text-brand-tan border-transparent hover:text-brand-espresso dark:hover:text-brand-cream',
          ].join(' ')}
        >
          Edit
        </button>
        <button
          id="tab-preview"
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          aria-controls="panel-preview"
          onClick={() => setActiveTab('preview')}
          className={[
            tabButtonBase,
            activeTab === 'preview'
              ? 'text-brand-espresso dark:text-brand-cream border-brand-espresso dark:border-brand-cream'
              : 'text-brand-brown dark:text-brand-tan border-transparent hover:text-brand-espresso dark:hover:text-brand-cream',
          ].join(' ')}
        >
          Preview
        </button>
      </div>

      {/* ── Panels ──────────────────────────────────────────────────────────── */}
      {/*
        Desktop (lg+): two-column grid, both panels always visible.
        Mobile/tablet (<lg): only the active tab panel is rendered.
      */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Editor panel */}
        <div
          id="panel-edit"
          role="tabpanel"
          aria-labelledby="tab-edit"
          className={[
            panelClasses,
            activeTab === 'edit' ? 'block' : 'hidden',
            'lg:block',
          ].join(' ')}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-2">
            Editor
          </p>
          {textareaEl}
        </div>

        {/* Preview panel */}
        <div
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className={[
            panelClasses,
            activeTab === 'preview' ? 'block' : 'hidden',
            'lg:block',
          ].join(' ')}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-2">
            Preview
          </p>
          {previewEl}
        </div>
      </div>

      {/* ── Secondary back navigation with guard ────────────────────────────── */}
      <div className="mt-6">
        <a
          href={`/library/${song.id}`}
          onClick={(e) => handleGuardedNavigation(e, `/library/${song.id}`)}
          className={[
            'inline-flex items-center gap-1.5',
            'text-sm font-medium text-brand-brown dark:text-brand-tan',
            'hover:text-brand-espresso dark:hover:text-brand-cream',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
          ].join(' ')}
        >
          ← Back to Song View
        </a>
      </div>

      {/* ── Unsaved Changes Modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleStay()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-modal-title"
            className={[
              'w-full max-w-sm rounded-2xl p-6',
              'bg-brand-cream dark:bg-brand-espresso',
              'border border-brand-brown/20 dark:border-brand-tan/20',
              'shadow-2xl',
            ].join(' ')}
          >
            <h2
              id="unsaved-modal-title"
              className="text-lg font-extrabold text-brand-espresso dark:text-brand-cream mb-2"
            >
              Unsaved Changes
            </h2>
            <p className="text-sm text-brand-brown dark:text-brand-tan mb-6">
              You have unsaved changes to this song. If you leave now, your changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                ref={modalStayRef}
                type="button"
                onClick={handleStay}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
                  'text-brand-espresso dark:text-brand-cream',
                  'bg-brand-cream dark:bg-brand-espresso',
                  'border border-brand-brown/30 dark:border-brand-tan/30',
                  'hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
                ].join(' ')}
              >
                Stay
              </button>
              <button
                ref={modalLeaveRef}
                type="button"
                onClick={handleLeave}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
                  'bg-brand-espresso text-brand-cream',
                  'hover:bg-brand-brown',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
                ].join(' ')}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
