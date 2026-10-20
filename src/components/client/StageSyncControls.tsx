"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Users, Radio, Disc } from "lucide-react";
import type { UseSetlistSyncFullReturn } from "@/hooks/useSetlistSync";

export interface StageSyncControlsProps {
  sync: UseSetlistSyncFullReturn;
  isLeader: boolean;
  isMusicDirector?: boolean;
}

// ── Focus ring helper meeting WCAG AA standards (BUG-005) ──
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2";

/**
 * StageSyncControls — Compact touch pill (min 44px touch targets) for multi-device stage sync.
 *
 * Provides:
 * - Current mode indicator ('Leader' | 'Follower' | 'Solo')
 * - Active stage count ("Live: N connected" / "N online")
 * - Connection lifecycle dot ('CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING')
 * - Role authorization: Only setlist owner or music director can switch to 'leader' mode.
 *   Non-leaders attempting to lead see an accessible tooltip.
 * - Full compliance with Artisan color palette, explicit dark: variants, and WCAG AA contrast.
 */
export default function StageSyncControls({
  sync,
  isLeader,
  isMusicDirector = false,
}: StageSyncControlsProps) {
  // AC-1 SSR hydration safety guard (BUG-020)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const canLead = isLeader || isMusicDirector;

  const handleLeaderToggle = useCallback(() => {
    if (!canLead) {
      setTooltipOpen(true);
      setTimeout(() => setTooltipOpen(false), 3000);
      return;
    }
    sync.toggleLive();
  }, [canLead, sync]);

  const handleFollowerToggle = useCallback(() => {
    sync.toggleFollow();
  }, [sync]);

  if (!mounted) {
    return (
      <div
        className="h-11 min-h-[44px] min-w-[140px] rounded-full border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream/60 dark:bg-brand-espresso/60 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  // Derive connection color & dot status
  let statusDotColor = "bg-brand-brown/40 dark:bg-brand-tan/40"; // disconnected
  let statusText = "Solo";

  if (sync.connectionState === "CONNECTING") {
    statusDotColor = "bg-amber-500 animate-pulse";
    statusText = "Connecting…";
  } else if (sync.connectionState === "CONNECTED") {
    statusDotColor = "bg-emerald-500 shadow-sm";
    statusText = sync.isLive
      ? "Live"
      : sync.isFollowing
        ? "Following"
        : "Online";
  } else if (sync.connectionState === "RECONNECTING") {
    statusDotColor = "bg-amber-500 animate-ping";
    statusText = "Reconnecting…";
  }

  return (
    <div
      ref={pillRef}
      className="relative inline-flex items-center gap-1 p-1 rounded-full border border-brand-brown/30 dark:border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso shadow-sm"
      role="region"
      aria-label="Stage synchronization controls"
    >
      {/* ── Status Indicator & Connected Count Pill ── */}
      <div
        className="flex items-center gap-1.5 px-2.5 h-9 min-h-[36px] rounded-full text-xs font-semibold text-brand-espresso dark:text-brand-cream select-none shrink-0"
        title={
          sync.connectionState === "DISCONNECTED"
            ? "Stage sync disconnected. Operating in offline solo mode."
            : `Connected devices: ${sync.connectedDeviceCount}`
        }
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-200 ${statusDotColor}`}
          aria-hidden="true"
        />
        <span className="font-mono text-xs">{statusText}</span>

        {sync.connectedDeviceCount > 0 && (
          <span className="flex items-center gap-1 ml-1 pl-1.5 border-l border-brand-brown/20 dark:border-brand-tan/20 font-mono text-[11px] text-brand-brown/80 dark:text-brand-tan/80">
            <Users size={12} className="shrink-0" aria-hidden="true" />
            <span>{sync.connectedDeviceCount}</span>
          </span>
        )}
      </div>

      {/* ── Mode action buttons (Min 44px touch targets) ── */}
      <div className="flex items-center gap-1">
        {/* Leader Toggle Button */}
        <button
          type="button"
          onClick={handleLeaderToggle}
          disabled={sync.isLiveConnecting}
          aria-pressed={sync.isLive}
          aria-label={
            sync.isLive
              ? "End broadcast session"
              : canLead
                ? "Broadcast as band leader"
                : "Leader mode restricted to setlist owner"
          }
          className={[
            "min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-all duration-200",
            focusRing,
            sync.isLive
              ? "bg-red-600 text-white shadow-sm animate-pulse hover:bg-red-700"
              : canLead
                ? "bg-brand-brown/10 text-brand-brown hover:bg-brand-brown/20 dark:bg-brand-tan/10 dark:text-brand-tan dark:hover:bg-brand-tan/20"
                : "opacity-40 cursor-not-allowed bg-brand-brown/5 text-brand-brown/50 dark:bg-brand-tan/5 dark:text-brand-tan/50",
          ].join(" ")}
        >
          {sync.isLiveConnecting ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Radio size={14} aria-hidden="true" />
          )}
          <span>{sync.isLive ? "Live" : "Lead"}</span>
        </button>

        {/* Follower Toggle Button */}
        <button
          type="button"
          onClick={handleFollowerToggle}
          disabled={sync.isStateChecking || sync.isLive}
          aria-pressed={sync.isFollowing}
          aria-label={
            sync.isFollowing
              ? "Leave live session and return to solo"
              : "Follow band leader in real-time"
          }
          className={[
            "min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-all duration-200",
            focusRing,
            sync.isFollowing
              ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              : sync.isLive
                ? "opacity-30 cursor-not-allowed text-brand-brown/40 dark:text-brand-tan/40"
                : "bg-brand-brown/10 text-brand-brown hover:bg-brand-brown/20 dark:bg-brand-tan/10 dark:text-brand-tan dark:hover:bg-brand-tan/20",
          ].join(" ")}
        >
          {sync.isStateChecking ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Disc size={14} aria-hidden="true" />
          )}
          <span>{sync.isFollowing ? "Following" : "Follow"}</span>
        </button>
      </div>

      {/* ── Authorization Tooltip for non-leaders attempting Leader mode ── */}
      {tooltipOpen && !canLead && (
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-50 px-2.5 py-1 rounded bg-brand-darker text-brand-cream text-xs shadow-md border border-brand-tan/20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
        >
          Only setlist owner or music director can lead stage sync.
        </div>
      )}
    </div>
  );
}
