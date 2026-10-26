import React from "react";
import { NOTES } from "@/utils/musicLogic";

interface SongKeySelectProps {
  value: string;
  onChange: (key: string) => void;
  songTitle?: string;
  className?: string;
}

export default function SongKeySelect({
  value,
  onChange,
  songTitle,
  className = "",
}: SongKeySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={songTitle ? `Performance key for ${songTitle}` : "Select key"}
      className={`text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso dark:focus:ring-brand-tan shrink-0 ${className}`}
    >
      {NOTES.map((note) => (
        <option key={note} value={note}>
          {note}
        </option>
      ))}
    </select>
  );
}
