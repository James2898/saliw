"use client";

import { STANDARD_SONG_TAGS } from "@/types/Song";
import { Check, Plus } from "lucide-react";

interface SongTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const ACTIVE_TAG_ACCENTS: Record<string, string> = {
  joyful:
    "bg-amber-600 text-white border-amber-600 shadow-xs dark:bg-amber-500 dark:border-amber-500 dark:text-brand-darker",
  solemn:
    "bg-purple-600 text-white border-purple-600 shadow-xs dark:bg-purple-500 dark:border-purple-500 dark:text-white",
  hymn:
    "bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-500 dark:border-emerald-500 dark:text-white",
};

const DEFAULT_ACTIVE_ACCENT =
  "bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso";

const INACTIVE_ACCENT =
  "bg-transparent text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:border-brand-brown dark:hover:border-brand-tan hover:bg-brand-brown/5 dark:hover:bg-brand-tan/10";

export default function SongTagSelector({
  selectedTags,
  onChange,
  disabled = false,
}: SongTagSelectorProps) {
  const normalizedSelected = new Set(
    selectedTags.map((t) => t.trim().toLowerCase())
  );

  const toggleTag = (tagValue: string) => {
    if (disabled) return;
    const norm = tagValue.trim().toLowerCase();
    if (normalizedSelected.has(norm)) {
      onChange(selectedTags.filter((t) => t.trim().toLowerCase() !== norm));
    } else {
      onChange([...selectedTags, norm]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Song tags">
      {STANDARD_SONG_TAGS.map(({ value, label }) => {
        const isSelected = normalizedSelected.has(value);
        const activeClass = ACTIVE_TAG_ACCENTS[value] ?? DEFAULT_ACTIVE_ACCENT;

        return (
          <button
            key={value}
            type="button"
            role="switch"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => toggleTag(value)}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              disabled ? "opacity-50 cursor-not-allowed" : "",
              isSelected ? activeClass : INACTIVE_ACCENT,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isSelected ? (
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
            )}
            <span>{label}</span>
          </button>
        );
      })}

      {/* Render any non-standard custom tags if previously assigned */}
      {selectedTags
        .filter(
          (t) =>
            !STANDARD_SONG_TAGS.some(
              (std) => std.value === t.trim().toLowerCase()
            )
        )
        .map((customTag) => {
          const norm = customTag.trim().toLowerCase();
          const label = norm.charAt(0).toUpperCase() + norm.slice(1);
          return (
            <button
              key={norm}
              type="button"
              role="switch"
              aria-checked={true}
              disabled={disabled}
              onClick={() => toggleTag(norm)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none",
                DEFAULT_ACTIVE_ACCENT,
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
    </div>
  );
}
