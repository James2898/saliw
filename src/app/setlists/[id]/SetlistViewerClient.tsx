"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Pencil, Settings } from "lucide-react";
import ServiceNavigator from "@/components/client/ServiceNavigator";
import SetlistSongSection from "@/components/client/SetlistSongSection";
import GoLiveButton from "@/components/client/GoLiveButton";
import FollowLeaderButton from "@/components/client/FollowLeaderButton";
import AutoScrollToolbar from "@/components/client/AutoScrollToolbar";
import AppendSongsButton from "@/components/client/AppendSongsButton";
import SetlistSettingsModal from "@/components/client/SetlistSettingsModal";
import SectionNavDeck, {
  deriveSections,
} from "@/components/client/SectionNavDeck";
import { useSetlistSync } from "@/hooks/useSetlistSync";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useFontSize } from "@/hooks/useFontSize";
import { useChordFontSize } from "@/hooks/useChordFontSize";
import { useChordColor } from "@/hooks/useChordColor";
import type { ProcessedLine } from "@/utils/musicLogic";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSong {
  junctionId: string;
  /** The songs table PK — used by AppendSongsButton to prevent duplicate additions. */
  songId: string;
  setlistId: string;
  title: string;
  artist: string;
  originalKey: string;
  processedLines: ProcessedLine[];
  performanceKey: string;
}

interface NavigatorSong {
  junctionId: string;
  title: string;
}

interface SetlistViewerClientProps {
  songs: ClientSong[];
  navigatorSongs: NavigatorSong[];
  setlistId: string;
  isLeader: boolean;
  isAuthenticated: boolean;
  setlistName: string;
  formattedDate: string | null;
  worshipLeaderName: string | null;
  lineup: Array<{ name: string; instrument: string }>;
}

/**
 * SetlistViewerClient — Client wrapper that instantiates useSetlistSync and
 * wires all realtime props down to ServiceNavigator and SetlistSongSection.
 *
 * This wrapper exists so the Server Component (page.tsx) can remain async
 * while all realtime state lives in a Client Component boundary.
 *
 * RF-3: useSetlistSync is instantiated here (not inside ServiceNavigator) so
 * state changes don't destabilise the IntersectionObserver.
 * RF-6: setlistId and isLeader are passed as props from the Server Component.
 */
export default function SetlistViewerClient({
  songs,
  navigatorSongs,
  setlistId,
  isLeader,
  isAuthenticated,
  setlistName,
  formattedDate,
  worshipLeaderName,
  lineup,
}: SetlistViewerClientProps) {
  // Prepare the songs array expected by useSetlistSync.
  // Wrapped in useMemo so syncSongs keeps a stable reference between renders,
  // preventing validJunctionIds inside useSetlistSync from recomputing unnecessarily.
  const syncSongs = useMemo(
    () =>
      songs.map((s) => ({
        junctionId: s.junctionId,
        performanceKey: s.performanceKey,
      })),
    [songs]
  );

  // Set of song IDs (songs table PK) already present in the setlist — passed to
  // AppendSongsButton so the modal pre-checks and disables existing songs (AC-20, AC-24).
  // Wrapped in useMemo so the Set reference stays stable across renders.
  const existingSongIds = useMemo(
    () => new Set(songs.map((s) => s.songId)),
    [songs]
  );

  const sync = useSetlistSync({
    setlistId,
    isLeader,
    songs: syncSongs,
  });

  const [globalChordsHidden, setGlobalChordsHidden] = useState(false);
  const toggleGlobalChords = useCallback(
    () => setGlobalChordsHidden((prev) => !prev),
    []
  );

  // ── Settings modal state ───────────────────────────────────────────────────

  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSettings = useCallback(
    () => setSettingsOpen((prev) => !prev),
    []
  );

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // ── Lifted font size hooks (AM-1: single source of truth for the setlist viewer) ──

  const fontSizeControls = useFontSize();
  const chordFontSizeControls = useChordFontSize();
  const chordColorControls = useChordColor();

  const autoScroll = useAutoScroll();

  // ── Section Navigator Deck — derive section targets from processedLines ───────
  // deriveSections is a pure function at module scope (no closure), so the
  // useMemo dep is just `songs`. Recomputes only when songs array changes.
  const navSections = useMemo(() => deriveSections(songs), [songs]);

  return (
    <>
      {/* ── Auto-scroll toolbar — fixed bottom-right (AC 1) ─────────────────── */}
      <AutoScrollToolbar scroll={autoScroll} />

      {/* ── Section Navigator Deck — fixed floating badge column (TASK-045) ──── */}
      {/* BUG-014: passes shared autoScroll instance, does not call useAutoScroll() */}
      <SectionNavDeck sections={navSections} autoScroll={autoScroll} />

      {/* ── Append Songs FAB — desktop-only, fixed bottom-left (TASK-038 AC-1–7) */}
      {isLeader && (
        <AppendSongsButton
          setlistId={setlistId}
          existingSongIds={existingSongIds}
        />
      )}

      {/* ── Setlist header (name + date + Go Live/Follow Leader + Hide Chords) ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
          {setlistName}
        </h1>
        <div className="flex items-center gap-3">
          {formattedDate && (
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
              {formattedDate}
            </p>
          )}
          {isLeader && (
            <Link
              href={`/setlists/${setlistId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-brown/30 dark:border-brand-tan/30 text-brand-brown dark:text-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2"
            >
              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
              Edit Setlist
            </Link>
          )}
          <GoLiveButton
            sync={{
              isLive: sync.isLive,
              isLiveConnecting: sync.isLiveConnecting,
              liveError: sync.liveError,
              toggleLive: sync.toggleLive,
            }}
            isLeader={isLeader}
          />
          <FollowLeaderButton
            sync={{
              isFollowing: sync.isFollowing,
              isStateChecking: sync.isStateChecking,
              followError: sync.followError,
              followSyncStatus: sync.followSyncStatus,
              toggleFollow: sync.toggleFollow,
            }}
            isLeader={isLeader}
          />
          <button
            type="button"
            onClick={toggleGlobalChords}
            aria-pressed={globalChordsHidden}
            aria-label={
              globalChordsHidden
                ? "Show chords for all songs"
                : "Hide chords for all songs"
            }
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "text-xs font-semibold",
              "border transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
              globalChordsHidden
                ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan"
                : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
            ].join(" ")}
          >
            {globalChordsHidden ? "Show Chords" : "Hide Chords"}
          </button>

          {/* ── Settings gear button (AC-1/AC-2) ──────────────────────────── */}
          <button
            ref={gearButtonRef}
            type="button"
            onClick={toggleSettings}
            aria-pressed={settingsOpen}
            aria-label="Open display settings"
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "text-xs font-semibold",
              "border transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
              settingsOpen
                ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan"
                : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
            ].join(" ")}
          >
            <Settings size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Settings modal (AC-3–8) ───────────────────────────────────────── */}
      <SetlistSettingsModal
        isOpen={settingsOpen}
        onClose={closeSettings}
        gearButtonRef={gearButtonRef}
        fontSizeControls={fontSizeControls}
        chordFontSizeControls={chordFontSizeControls}
        chordColorControls={chordColorControls}
      />

      {/* ── People block (worship leader + lineup) — read-only (AC-32) ──────── */}
      {(worshipLeaderName || lineup.length > 0) && (
        <div className="mb-6 flex flex-col gap-1">
          {worshipLeaderName && (
            <p className="text-sm">
              <span className="font-semibold text-brand-brown dark:text-brand-tan">
                Worship Leader:{" "}
              </span>
              <span className="font-bold text-brand-espresso dark:text-brand-cream">
                {worshipLeaderName}
              </span>
            </p>
          )}
          {lineup.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold text-brand-brown dark:text-brand-tan">
                Lineup:{" "}
              </span>
              <span className="font-bold text-brand-espresso dark:text-brand-cream">
                {lineup.map((e) => `${e.name} — ${e.instrument}`).join(", ")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Service Navigator ──────────────────────────────────────────────── */}
      <ServiceNavigator
        songs={navigatorSongs}
        isLeader={isLeader}
        setlistId={setlistId}
        isAuthenticated={isAuthenticated}
        sync={{
          isLive: sync.isLive,
          onActiveSongChange: sync.onActiveSongChange,
        }}
        onBeforeNavigate={autoScroll.isActive ? autoScroll.pause : undefined}
        onAfterNavigate={autoScroll.isActive ? autoScroll.resume : undefined}
      />

      {/* ── Song sections ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-10">
        {songs.map((song) => {
          const overrideKey = sync.overrideKeys.get(song.junctionId);
          const liveSyncState = sync.songSyncStates.get(song.junctionId);

          return (
            <SetlistSongSection
              key={song.junctionId}
              junctionId={song.junctionId}
              setlistId={song.setlistId}
              title={song.title}
              artist={song.artist}
              originalKey={song.originalKey}
              processedLines={song.processedLines}
              performanceKey={song.performanceKey}
              isLeader={isLeader}
              overrideKey={overrideKey}
              onKeyChangeLive={
                isLeader && sync.isLive ? sync.notifyKeyChange : undefined
              }
              liveSyncState={liveSyncState}
              externalChordsHidden={globalChordsHidden}
              autoScroll={autoScroll}
              fontSize={fontSizeControls.fontSize}
              onIncreaseFont={fontSizeControls.increase}
              onDecreaseFont={fontSizeControls.decrease}
              onResetFont={fontSizeControls.reset}
              chordFontSize={chordFontSizeControls.chordFontSize}
              chordBg={chordColorControls.chordBg}
              chordColor={chordColorControls.chordColor}
            />
          );
        })}
      </div>

      {/* ── Bottom spacer — prevents toolbar from obscuring last song content (AC 20) */}
      {autoScroll.isActive && (
        <div className="h-24 w-full" aria-hidden="true" />
      )}
    </>
  );
}
