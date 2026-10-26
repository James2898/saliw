import React from "react";

interface SongKeyBadgeProps {
  musicalKey: string;
  prefix?: string;
  className?: string;
}

export default function SongKeyBadge({
  musicalKey,
  prefix,
  className = "",
}: SongKeyBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded shrink-0 bg-[var(--brand-tan-alpha)] text-brand-espresso dark:text-brand-cream border border-brand-brown/10 dark:border-brand-tan/20 ${className}`}
    >
      {prefix && <span className="opacity-70 mr-0.5">{prefix}</span>}
      {musicalKey}
    </span>
  );
}
