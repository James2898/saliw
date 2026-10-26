"use client";

import React, { type ReactNode } from "react";

export interface SongCardProps {
  title: string;
  artist?: string | null;
  leftSlot?: ReactNode;
  badgeSlot?: ReactNode;
  actionsSlot?: ReactNode;
  footerSlot?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  onClick?: () => void;
}

/**
 * SongCard — Shared, composable song card component used across
 * SetlistBuilder, Library, Dashboard, and Liturgy Assistant.
 *
 * Implements the slot pattern:
 * - leftSlot: Drag handle, Vibe tag, or index number
 * - badgeSlot: Song tags, original key badge
 * - actionsSlot: Performance key dropdown, Add/Remove/Swap buttons
 * - footerSlot: Transition note pill, harmonic modulation detail
 */
export default function SongCard({
  title,
  artist,
  leftSlot,
  badgeSlot,
  actionsSlot,
  footerSlot,
  className = "",
  style,
  ref,
  onClick,
}: SongCardProps) {
  return (
    <div
      ref={ref}
      style={style}
      onClick={onClick}
      className={[
        "flex flex-col gap-2 p-3 rounded-xl",
        "bg-brand-cream dark:bg-brand-espresso",
        "border border-brand-brown/10 dark:border-brand-tan/15",
        "transition-colors",
        onClick ? "cursor-pointer hover:border-brand-brown/30 dark:hover:border-brand-tan/30" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top / Main Row */}
      <div className="flex items-center gap-3">
        {leftSlot && <div className="shrink-0 flex items-center">{leftSlot}</div>}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-brand-espresso dark:text-brand-cream font-medium text-sm truncate">
              {title}
            </p>
            {badgeSlot}
          </div>
          {artist && (
            <p className="text-brand-brown/70 dark:text-brand-tan/70 text-xs truncate">
              {artist}
            </p>
          )}
        </div>

        {actionsSlot && (
          <div className="flex items-center gap-2 shrink-0">
            {actionsSlot}
          </div>
        )}
      </div>

      {/* Footer / Transition Row */}
      {footerSlot && (
        <div className="pt-1 border-t border-brand-brown/10 dark:border-brand-tan/10">
          {footerSlot}
        </div>
      )}
    </div>
  );
}
