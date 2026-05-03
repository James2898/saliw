"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavigatorSong {
  junctionId: string;
  title: string;
}

/**
 * Sync object passed from the parent SetlistViewerClient via useSetlistSync.
 * Only stable refs should be passed here to avoid destabilising the IntersectionObserver (RF-3).
 */
interface ServiceNavigatorSync {
  isLive: boolean;
  onActiveSongChange: (junctionId: string) => void;
}

interface ServiceNavigatorProps {
  songs: NavigatorSong[];
  isLeader: boolean;
  setlistId: string;
  isAuthenticated: boolean;
  sync: ServiceNavigatorSync;
  /**
   * Called on pointerdown of a song-title button — before the click fires.
   * Use this to pause any ongoing auto-scroll so the page is stationary by
   * the time the browser resolves the click. Without this, an in-flight
   * window.scrollBy from the auto-scroll rAF moves the button out from under
   * the cursor between mousedown and mouseup, and the browser suppresses the
   * click entirely.
   */
  onBeforeNavigate?: () => void;
  /**
   * Called once the navigator's IntersectionObserver reports the just-clicked
   * song as the active one — i.e. the smooth scroll has landed and the
   * highlighted background has moved to the target title. Use this to resume
   * auto-scroll automatically after a title click.
   */
  onAfterNavigate?: () => void;
}

/**
 * ServiceNavigator — Sticky top navbar for setlist song navigation.
 *
 * Always renders as a full-width sticky top bar on all screen sizes.
 * Song titles are displayed horizontally in a scrollable row.
 *
 * Uses IntersectionObserver to highlight the currently visible song section.
 * The observer is disconnected in the cleanup function to prevent memory leaks.
 *
 * Go Live, Follow Leader, and Hide Chords controls render in the setlist header
 * (SetlistViewerClient), not here.
 *
 * No server-side data fetching is added here (RF-6).
 *
 * RF-3: sync.onActiveSongChange is stored in a ref to prevent the
 * IntersectionObserver from reconnecting on every render.
 */
export default function ServiceNavigator({
  songs,
  sync,
  onBeforeNavigate,
  onAfterNavigate,
}: ServiceNavigatorProps) {
  const [activeSongId, setActiveSongId] = useState<string | null>(
    songs.length > 0 ? songs[0].junctionId : null
  );
  const ratiosRef = useRef<Map<string, number>>(new Map());

  // Latest onAfterNavigate stored in a ref so the settle detector doesn't
  // re-arm when the parent's callback identity changes between renders.
  const onAfterNavigateRef = useRef(onAfterNavigate);
  useEffect(() => {
    onAfterNavigateRef.current = onAfterNavigate;
  });

  // rAF id for the current smooth-scroll settle detector, so a new title
  // click can cancel an in-flight detector before starting a fresh one.
  const settleRafIdRef = useRef<number | null>(null);

  // Cleanup: cancel any pending settle detector on unmount.
  useEffect(() => {
    return () => {
      if (settleRafIdRef.current !== null) {
        cancelAnimationFrame(settleRafIdRef.current);
      }
    };
  }, []);

  // RF-3: store onActiveSongChange in a ref so the IntersectionObserver callback
  // always calls the latest version without reconnecting the observer on re-renders.
  const onActiveSongChangeRef = useRef(sync.onActiveSongChange);
  // RF-3: stable ref for isLive to avoid reconnecting the observer on every render
  const isLiveRef = useRef(sync.isLive);

  // Update refs inside effects only (never during render — per React ref rules)
  useEffect(() => {
    onActiveSongChangeRef.current = sync.onActiveSongChange;
  });
  useEffect(() => {
    isLiveRef.current = sync.isLive;
  });

  useEffect(() => {
    if (songs.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Update the ratio map for each observed entry
        entries.forEach((entry) => {
          const sectionId = entry.target.id; // e.g. "song-<junctionId>"
          const junctionId = sectionId.replace(/^song-/, "");
          ratiosRef.current.set(junctionId, entry.intersectionRatio);
        });

        // Find the junctionId with the highest intersection ratio.
        // On tie, prefer the one that appears earlier in the songs array (lower order_index).
        let winningId: string | null = null;
        let winningRatio = -1;

        for (const song of songs) {
          const ratio = ratiosRef.current.get(song.junctionId) ?? 0;
          if (ratio > winningRatio) {
            winningRatio = ratio;
            winningId = song.junctionId;
          }
        }

        if (winningId !== null && winningRatio > 0) {
          setActiveSongId(winningId);

          // AC-7: broadcast SONG_CHANGE when Go Live is active
          // Read isLive from ref to avoid reconnecting the observer on every render (RF-3)
          if (isLiveRef.current) {
            onActiveSongChangeRef.current(winningId);
          }
        }
      },
      {
        // Track visibility with fine-grained thresholds for smooth highlighting
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    // Observe all matching section elements
    const sections = document.querySelectorAll<HTMLElement>(
      'section[id^="song-"]'
    );
    sections.forEach((section) => observer.observe(section));

    // Cleanup: disconnect observer on unmount to prevent memory leaks
    return () => {
      observer.disconnect();
    };
  }, [songs]);

  const navRef = useRef<HTMLDivElement>(null);

  // Watch window.scrollY each frame; once it stops changing for STABLE_FRAMES
  // consecutive frames the browser's smooth-scroll has landed → fire onAfterNavigate.
  // Using IntersectionObserver "active song" as the trigger doesn't work because
  // the target can enter the viewport (and become "active") long before scrollTo
  // finishes — resuming the rAF mid-flight makes window.scrollBy fight the
  // in-progress scrollTo and the page stops short of the target.
  const startSettleDetector = () => {
    if (settleRafIdRef.current !== null) {
      cancelAnimationFrame(settleRafIdRef.current);
    }
    let lastY = window.scrollY;
    let stableFrames = 0;
    const STABLE_FRAMES = 3; // ~50ms at 60fps — enough to confirm scrollTo settled
    const TIMEOUT_MS = 2000; // safety cap so the detector cannot run forever
    const startedAt = performance.now();

    const tick = () => {
      const y = window.scrollY;
      if (y === lastY) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastY = y;
      }
      if (stableFrames >= STABLE_FRAMES) {
        settleRafIdRef.current = null;
        onAfterNavigateRef.current?.();
        return;
      }
      if (performance.now() - startedAt > TIMEOUT_MS) {
        // Safety bail-out — fire anyway so the user isn't stranded paused.
        settleRafIdRef.current = null;
        onAfterNavigateRef.current?.();
        return;
      }
      settleRafIdRef.current = requestAnimationFrame(tick);
    };
    settleRafIdRef.current = requestAnimationFrame(tick);
  };

  const handleScrollToSong = (junctionId: string) => {
    const element = document.getElementById(`song-${junctionId}`);
    if (!element) return;
    // onBeforeNavigate is fired earlier on pointerdown so the page is already
    // stationary by the time the click fires; calling it here would be redundant.

    const navbarHeight = 64; // sticky top-16 = 4rem = 64px
    const toolbarHeight = navRef.current
      ? navRef.current.getBoundingClientRect().height
      : 0;
    const top =
      element.getBoundingClientRect().top +
      window.scrollY -
      navbarHeight -
      toolbarHeight -
      8;
    window.scrollTo({ top, behavior: "smooth" });
    if (onAfterNavigateRef.current) {
      startSettleDetector();
    }
  };

  return (
    <div
      ref={navRef}
      className={[
        "sticky top-16 z-40 w-full",
        "bg-brand-espresso",
        "border-b border-brand-tan/20",
      ].join(" ")}
      aria-label="Setlist song navigator"
    >
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Horizontally scrollable song list */}
        {songs.length === 0 ? (
          <span className="text-xs text-brand-cream/50">No songs</span>
        ) : (
          <nav
            className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
            aria-label="Song list"
          >
            {songs.map((song) => {
              const isActive = song.junctionId === activeSongId;
              return (
                <button
                  key={song.junctionId}
                  type="button"
                  onPointerDown={() => onBeforeNavigate?.()}
                  onClick={() => handleScrollToSong(song.junctionId)}
                  className={[
                    "shrink-0 px-3 py-1.5 rounded-lg",
                    "text-xs font-medium whitespace-nowrap",
                    "transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tan focus-visible:ring-offset-1 focus-visible:ring-offset-brand-espresso",
                    isActive
                      ? "bg-brand-tan text-brand-espresso font-semibold"
                      : "text-brand-cream hover:bg-brand-espresso/60",
                  ].join(" ")}
                  aria-current={isActive ? "location" : undefined}
                >
                  {song.title}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
