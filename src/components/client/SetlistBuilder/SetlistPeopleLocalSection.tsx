"use client";

import { useState } from "react";
import Button from "@/components/client/button";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PendingLineupEntry = {
  tempId: string; // crypto.randomUUID() — React key only
  musician_id: string;
  instrument: string;
  name: string; // display name, resolved from allMusicians at add-time
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface LocalMusician {
  id: string;
  name: string;
}

interface SetlistPeopleLocalSectionProps {
  allMusicians: LocalMusician[];
  worshipLeaderId: string | null;
  lineup: PendingLineupEntry[];
  onWorshipLeaderChange: (id: string | null) => void;
  onLineupChange: (lineup: PendingLineupEntry[]) => void;
  isMusicDirector: boolean;
}

// ── Class constants — mirror SetlistPeopleSection (BUG-004: dark: pairs kept) ─

const selectClass =
  "text-sm font-medium px-4 py-2.5 rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso";

const inputClass = [
  "w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso",
  "px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/40 dark:placeholder:text-brand-tan/40",
  "focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1",
].join(" ");

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5";

const sectionHeadingClass =
  "text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest mb-4";

const rowClass =
  "flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10 dark:border-brand-tan/10";

// ── Component ─────────────────────────────────────────────────────────────────

export default function SetlistPeopleLocalSection({
  allMusicians,
  worshipLeaderId,
  lineup,
  onWorshipLeaderChange,
  onLineupChange,
  isMusicDirector,
}: SetlistPeopleLocalSectionProps) {
  // ── Add-row local state — lazy initializers (BUG-001) ────────────────────────
  // Handlers declared below; useState seeded before any JSX references them.
  const [addMusicianId, setAddMusicianId] = useState<string>(() => "");
  const [addInstrument, setAddInstrument] = useState<string>(() => "");

  // ── Handlers — declared before any JSX that references them (BUG-007) ────────

  function handleWorshipLeaderSelectChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const val = e.target.value;
    onWorshipLeaderChange(val || null);
  }

  function handleAddMusicianSelectChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    setAddMusicianId(e.target.value);
  }

  function handleAddInstrumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddInstrument(e.target.value);
  }

  function handleAdd() {
    if (!addMusicianId || !addInstrument.trim()) return;

    const musician = allMusicians.find((m) => m.id === addMusicianId);
    if (!musician) return;

    const newEntry: PendingLineupEntry = {
      tempId: crypto.randomUUID(),
      musician_id: addMusicianId,
      instrument: addInstrument.trim(),
      name: musician.name,
    };

    onLineupChange([...lineup, newEntry]);
    // Reset add-row inputs after successful add
    setAddMusicianId("");
    setAddInstrument("");
  }

  function handleRemove(tempId: string) {
    onLineupChange(lineup.filter((e) => e.tempId !== tempId));
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const hasNoMusicians = allMusicians.length === 0;
  const addButtonDisabled =
    !addMusicianId || !addInstrument.trim() || hasNoMusicians;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!isMusicDirector) return null;

  return (
    <div className="flex flex-col gap-8 mt-6 pt-6 border-t border-brand-brown/10 dark:border-brand-tan/10">
      {/* ── Worship Leader subsection ──────────────────────────────────────── */}
      <div>
        <p className={sectionHeadingClass}>Worship Leader</p>
        <div>
          <label className={labelClass}>Assign Worship Leader</label>
          <select
            value={worshipLeaderId ?? ""}
            onChange={handleWorshipLeaderSelectChange}
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
        </div>
      </div>

      {/* ── Lineup subsection ─────────────────────────────────────────────── */}
      <div>
        <p className={sectionHeadingClass}>
          Lineup ({lineup.length}{" "}
          {lineup.length === 1 ? "musician" : "musicians"})
        </p>

        {/* Lineup entries or empty state */}
        {lineup.length === 0 ? (
          <p className="text-sm text-brand-brown/60 dark:text-brand-tan/60 mb-4">
            No musicians added yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {lineup.map((entry) => (
              <div key={entry.tempId} className={rowClass}>
                {/* Musician name and instrument */}
                <p className="flex-1 text-sm text-brand-espresso dark:text-brand-cream">
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-brand-brown/60 dark:text-brand-tan/60">
                    {" "}
                    — {entry.instrument}
                  </span>
                </p>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(entry.tempId)}
                  aria-label={`Remove ${entry.name} from lineup`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add musician row */}
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
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
