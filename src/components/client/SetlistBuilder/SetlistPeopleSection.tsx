'use client'

import { useState } from 'react'
import Button from '@/components/client/button'
import {
  setSetlistWorshipLeader,
  addSetlistMusician,
  removeSetlistMusician,
} from '@/app/actions/setlistActions'
import type { Musician, SetlistLineupEntry } from '@/types/Musician'

// ── Props ─────────────────────────────────────────────────────────────────────

interface SetlistPeopleSectionProps {
  setlistId: string
  initialWorshipLeaderId: string | null
  allMusicians: Musician[]
  initialLineup: SetlistLineupEntry[]
  isMusicDirector: boolean
}

// ── Class constants ───────────────────────────────────────────────────────────

const selectClass =
  'text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso'

const inputClass = [
  'w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso',
  'px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/40 dark:placeholder:text-brand-tan/40',
  'focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1',
].join(' ')

const labelClass =
  'block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5'

const sectionHeadingClass =
  'text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest mb-4'

const rowClass =
  'flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10 dark:border-brand-tan/10'

// ── Component ─────────────────────────────────────────────────────────────────

export default function SetlistPeopleSection({
  setlistId,
  initialWorshipLeaderId,
  allMusicians,
  initialLineup,
  isMusicDirector,
}: SetlistPeopleSectionProps) {
  // ── State — all lazy initializers (BUG-001) ──────────────────────────────────
  const [worshipLeaderId, setWorshipLeaderId] = useState<string | null>(
    () => initialWorshipLeaderId
  )
  const [wlLoading, setWlLoading] = useState(() => false)
  const [wlError, setWlError] = useState<string | null>(() => null)

  const [localLineup, setLocalLineup] = useState<SetlistLineupEntry[]>(
    () => initialLineup
  )

  // Per-row remove loading/error keyed by entry.id
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>(() => ({}))
  const [rowError, setRowError] = useState<Record<string, string | null>>(() => ({}))

  // Add-row state
  const [addMusicianId, setAddMusicianId] = useState(() => '')
  const [addInstrument, setAddInstrument] = useState(() => '')
  const [addLoading, setAddLoading] = useState(() => false)
  const [addError, setAddError] = useState<string | null>(() => null)

  // ── Handlers — declared before any useEffect/useCallback (BUG-007) ──────────

  async function handleWorshipLeaderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value
    setWlLoading(true)
    setWlError(null)

    const result = await setSetlistWorshipLeader({
      setlist_id: setlistId,
      worship_leader_id: selectedId || null,
    })

    // Split error check and data check (BUG-008)
    if (result.error) {
      setWlError(result.error)
      setWlLoading(false)
      return
    }

    // Server confirm — update local state only after success
    setWorshipLeaderId(selectedId || null)
    setWlLoading(false)
  }

  async function handleRemove(entry: SetlistLineupEntry) {
    setRowLoading((prev) => ({ ...prev, [entry.id]: true }))
    setRowError((prev) => ({ ...prev, [entry.id]: null }))

    const result = await removeSetlistMusician({
      id: entry.id,
      setlist_id: setlistId,
    })

    // Split error check (BUG-008)
    if (result.error) {
      setRowError((prev) => ({ ...prev, [entry.id]: result.error }))
      setRowLoading((prev) => ({ ...prev, [entry.id]: false }))
      return
    }

    // Server confirm — remove from local state only after success
    setLocalLineup((prev) => prev.filter((e) => e.id !== entry.id))
    setRowLoading((prev) => {
      const next = { ...prev }
      delete next[entry.id]
      return next
    })
    setRowError((prev) => {
      const next = { ...prev }
      delete next[entry.id]
      return next
    })
  }

  async function handleAdd() {
    if (!addMusicianId || !addInstrument.trim()) return

    setAddLoading(true)
    setAddError(null)

    const result = await addSetlistMusician({
      setlist_id: setlistId,
      musician_id: addMusicianId,
      instrument: addInstrument.trim(),
    })

    // Split error check (BUG-008)
    if (result.error) {
      setAddError(result.error)
      setAddLoading(false)
      return
    }

    // Separate data presence check (BUG-008)
    if (!result.data) {
      setAddError('Unable to add musician. Please try again.')
      setAddLoading(false)
      return
    }

    // Construct SetlistLineupEntry from returned DbSetlistMusician
    const returned = result.data
    const musician = allMusicians.find((m) => m.id === returned.musician_id)

    if (!musician) {
      setAddError('Unable to resolve musician details. Please refresh.')
      setAddLoading(false)
      return
    }

    const newEntry: SetlistLineupEntry = {
      id: returned.id,
      musician_id: returned.musician_id,
      instrument: returned.instrument,
      musicians: {
        id: musician.id,
        name: musician.name,
      },
    }

    // Server confirm — append to local state after success
    setLocalLineup((prev) => [...prev, newEntry])
    setAddMusicianId('')
    setAddInstrument('')
    setAddLoading(false)
  }

  function handleAddMusicianSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setAddMusicianId(e.target.value)
    // Clear add-row error when user modifies inputs (AC-19)
    if (addError) setAddError(null)
  }

  function handleAddInstrumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddInstrument(e.target.value)
    // Clear add-row error when user modifies inputs (AC-19)
    if (addError) setAddError(null)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const worshipLeaderName =
    allMusicians.find((m) => m.id === worshipLeaderId)?.name ?? null

  const hasNoMusicians = allMusicians.length === 0
  const addButtonDisabled =
    addLoading || !addMusicianId || !addInstrument.trim() || hasNoMusicians

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* ── Worship Leader subsection ──────────────────────────────────────── */}
      <div>
        <p className={sectionHeadingClass}>Worship Leader</p>

        {isMusicDirector ? (
          <div>
            <label className={labelClass}>Assign Worship Leader</label>
            <select
              value={worshipLeaderId ?? ''}
              onChange={handleWorshipLeaderChange}
              disabled={wlLoading}
              className={selectClass}
              aria-label="Select worship leader"
            >
              <option value="">— None —</option>
              {hasNoMusicians ? (
                <option value="" disabled>
                  No musicians in roster
                </option>
              ) : (
                allMusicians.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              )}
            </select>

            {wlError && (
              <span
                role="alert"
                className="block mt-1.5 text-xs text-red-600 dark:text-red-400"
              >
                {wlError}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-brand-espresso dark:text-brand-cream">
            {worshipLeaderName ?? 'Unassigned'}
          </span>
        )}
      </div>

      {/* ── Lineup subsection ─────────────────────────────────────────────── */}
      <div>
        <p className={sectionHeadingClass}>
          Lineup ({localLineup.length}{' '}
          {localLineup.length === 1 ? 'musician' : 'musicians'})
        </p>

        {/* Lineup entries */}
        {localLineup.length === 0 ? (
          isMusicDirector ? (
            <p className="text-sm text-brand-brown/60 dark:text-brand-tan/60 mb-4">
              No musicians added yet.
            </p>
          ) : null
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {localLineup.map((entry) => (
              <div key={entry.id} className={rowClass}>
                {/* Musician name and instrument */}
                <p className="flex-1 text-sm text-brand-espresso dark:text-brand-cream">
                  <span className="font-medium">{entry.musicians.name}</span>
                  <span className="text-brand-brown/60 dark:text-brand-tan/60">
                    {' '}— {entry.instrument}
                  </span>
                </p>

                {/* Remove button — MD only (AC-12) */}
                {isMusicDirector && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(entry)}
                      disabled={rowLoading[entry.id] ?? false}
                      aria-label={`Remove ${entry.musicians.name} from lineup`}
                    >
                      {rowLoading[entry.id] ? 'Removing…' : 'Remove'}
                    </Button>

                    {rowError[entry.id] && (
                      <span
                        role="alert"
                        className="text-xs text-red-600 dark:text-red-400"
                      >
                        {rowError[entry.id]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add musician row — MD only (AC-14) */}
        {isMusicDirector && (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-3 flex-wrap">
              {/* Musician select */}
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className={labelClass}>Musician</label>
                <select
                  value={addMusicianId}
                  onChange={handleAddMusicianSelectChange}
                  className={selectClass}
                  aria-label="Select musician to add"
                  disabled={addLoading}
                >
                  <option value="">— Select —</option>
                  {hasNoMusicians ? (
                    <option value="" disabled>
                      No musicians in roster
                    </option>
                  ) : (
                    allMusicians.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Instrument input */}
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className={labelClass}>Instrument</label>
                <input
                  type="text"
                  value={addInstrument}
                  onChange={handleAddInstrumentChange}
                  placeholder="e.g. Guitar, Piano"
                  className={inputClass}
                  disabled={addLoading}
                  aria-label="Instrument"
                />
              </div>

              {/* Add button */}
              <div className="pb-0.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAdd}
                  disabled={addButtonDisabled}
                  aria-label="Add musician to lineup"
                >
                  {addLoading ? 'Adding…' : 'Add'}
                </Button>
              </div>
            </div>

            {/* Add-row inline error (AC-18) */}
            {addError && (
              <span
                role="alert"
                className="text-xs text-red-600 dark:text-red-400"
              >
                {addError}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
