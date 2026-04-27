"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMusician, updateMusician, deleteMusician } from "@/app/actions/musicianActions";

const inputBaseClass = [
  "w-full px-3 py-2 rounded-xl",
  "bg-brand-cream dark:bg-brand-espresso",
  "text-brand-espresso dark:text-brand-cream",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "text-sm font-sans",
  "placeholder:text-brand-brown/50 dark:placeholder:text-brand-tan/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5";

interface MusicianFormProps {
  mode: "create" | "edit";
  musician?: {
    id: string;
    name: string;
    notes: string | null;
  };
}

/**
 * MusicianForm — Controlled form for creating and editing musicians.
 *
 * mode="create": calls createMusician on submit, navigates to /musicians on success.
 * mode="edit":   calls updateMusician on submit, deleteMusician on delete confirm,
 *                navigates to /musicians on success.
 */
export default function MusicianForm({ mode, musician }: MusicianFormProps) {
  const router = useRouter();

  const [name, setName] = useState(musician?.name ?? "");
  const [notes, setNotes] = useState(musician?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAnyPending = isSaving || isDeleting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isAnyPending) return;

    // Client-side validation
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const notesValue = notes.trim() || undefined;

      let result: { data: unknown; error: string | null };

      if (mode === "create") {
        result = await createMusician({ name: name.trim(), notes: notesValue });
      } else {
        result = await updateMusician({
          id: musician!.id,
          name: name.trim(),
          notes: notesValue,
        });
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/musicians");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isAnyPending) return;
    if (!window.confirm("Delete this musician?")) return;

    setError(null);
    setIsDeleting(true);

    try {
      const result = await deleteMusician({ id: musician!.id });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/musicians");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-5">
        {/* ── Name ─────────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="musician-name" className={labelClass}>
            Name
          </label>
          <input
            id="musician-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Musician name"
            required
            className={inputBaseClass}
          />
        </div>

        {/* ── Notes ────────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="musician-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="musician-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (instruments, voice part, availability…)"
            rows={4}
            className={[inputBaseClass, "resize-y"].join(" ")}
          />
        </div>

        {/* ── Error message ─────────────────────────────────────────────────────── */}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          {/* Delete button — edit mode only */}
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isAnyPending}
              className={[
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "text-sm font-semibold font-sans",
                "border border-red-300 dark:border-red-700",
                "text-red-700 dark:text-red-400",
                "hover:bg-red-50 dark:hover:bg-red-900/20",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1",
                isAnyPending ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {isDeleting ? "Deleting…" : "Delete Musician"}
            </button>
          )}

          {/* Spacer to push Save to the right when no Delete button */}
          {mode === "create" && <div />}

          {/* Save button */}
          <button
            type="submit"
            disabled={isAnyPending}
            className={[
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso",
              "text-sm font-semibold font-sans",
              "border border-brand-tan dark:border-brand-tan",
              "hover:bg-brand-brown hover:text-brand-cream hover:border-brand-brown",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              isAnyPending ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
