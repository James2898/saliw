"use client";

import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  Pencil,
  Settings,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import ServiceNavigator from "@/components/client/ServiceNavigator";
import SetlistSongSection from "@/components/client/SetlistSongSection";
import GoLiveButton from "@/components/client/GoLiveButton";
import FollowLeaderButton from "@/components/client/FollowLeaderButton";
import AutoScrollToolbar from "@/components/client/AutoScrollToolbar";
import AppendSongsButton from "@/components/client/AppendSongsButton";
import SectionNavDeck, {
  deriveSections,
} from "@/components/client/SectionNavDeck";

import { useSetlistSync } from "@/hooks/useSetlistSync";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useFontSize } from "@/hooks/useFontSize";
import { useChordFontSize } from "@/hooks/useChordFontSize";
import { useChordColor } from "@/hooks/useChordColor";
import { useSetlistLayout } from "@/hooks/useSetlistLayout";
import type { ProcessedLine } from "@/utils/musicLogic";
import { NOTES, getSemitoneOffset, shiftChord } from "@/utils/musicLogic";
import type { SortableSong } from "@/components/client/SetlistBuilder/SetlistBuilderClient";

const ChordDrawer = dynamic(() => import("@/components/client/ChordDrawer"), {
  ssr: false,
});
const SetlistSettingsModal = dynamic(
  () => import("@/components/client/SetlistSettingsModal"),
  { ssr: false }
);

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
  /** YouTube embed URL stored on the library song (null if not set). */
  youtubeUrl: string | null;
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
  isMusicDirector: boolean;
  setlistName: string;
  formattedDate: string | null;
  worshipLeaderName: string | null;
  lineup: Array<{ name: string; instrument: string }>;
}

const ctrlBtnClass = [
  "flex items-center justify-center rounded-lg shrink-0",
  "font-mono font-bold text-sm",
  "text-brand-espresso dark:text-brand-cream",
  "bg-brand-cream dark:bg-brand-espresso",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

const CAPO_FRETS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export default function SetlistViewerClient({
  songs,
  navigatorSongs,
  setlistId,
  isLeader,
  isAuthenticated,
  isMusicDirector,
  setlistName,
  formattedDate,
  worshipLeaderName,
  lineup,
}: SetlistViewerClientProps) {
  // Prepare the songs array expected by useSetlistSync.
  const syncSongs = useMemo(
    () =>
      songs.map((s) => ({
        junctionId: s.junctionId,
        performanceKey: s.performanceKey,
      })),
    [songs]
  );

  const existingSongIds = useMemo(
    () => new Set(songs.map((s) => s.songId)),
    [songs]
  );

  const setlistSongs = useMemo<SortableSong[]>(
    () =>
      songs.map((s, index) => ({
        junctionId: s.junctionId,
        songId: s.songId,
        title: s.title,
        artist: s.artist,
        originalKey: s.originalKey,
        performanceKey: s.performanceKey,
        orderIndex: index,
      })),
    [songs]
  );

  const sync = useSetlistSync({
    setlistId,
    isLeader,
    songs: syncSongs,
  });

  const [isSectionNavOpen, setIsSectionNavOpen] = useState(true);

  const [globalChordsHidden, setGlobalChordsHidden] = useState(false);
  const toggleGlobalChords = useCallback(
    () => setGlobalChordsHidden((prev) => !prev),
    []
  );

  // ── Global chord drawer state (BUG-020: literal defaults) ───────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [focusedChord, setFocusedChord] = useState<string | null>(null);
  const [instrumentMode, setInstrumentMode] = useState<
    "guitar" | "piano" | "bass"
  >(() => {
    if (typeof window === "undefined") return "guitar";
    const stored = localStorage.getItem("saliw:instrumentMode");
    if (stored === "guitar" || stored === "piano" || stored === "bass")
      return stored;
    return "guitar";
  });

  const handleInstrumentChange = useCallback(
    (mode: "guitar" | "piano" | "bass") => {
      setInstrumentMode(mode);
      localStorage.setItem("saliw:instrumentMode", mode);
    },
    []
  );

  // Track per-song semitone offsets so transposed chord names can be computed.
  const [songOffsets, setSongOffsets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const song of songs) {
      initial[song.junctionId] = getSemitoneOffset(
        song.originalKey,
        song.performanceKey ?? song.originalKey
      );
    }
    return initial;
  });

  // Unique chords calculation
  const uniqueChords = useMemo(() => {
    const seen = new Set<string>();
    for (const song of songs) {
      const offset = songOffsets[song.junctionId] ?? 0;
      for (const line of song.processedLines) {
        if (line.type === "chord") {
          for (const token of line.tokens) {
            if (token.isChord && token.originalChord) {
              const transposed =
                offset === 0
                  ? token.originalChord
                  : shiftChord(token.originalChord, offset);
              seen.add(transposed);
            }
          }
        }
      }
    }
    return Array.from(seen);
  }, [songs, songOffsets]);

  const handleChordClick = useCallback((chordName: string) => {
    setFocusedChord(chordName);
    setIsDrawerOpen(true);
  }, []);

  const handleKeyChangeForDrawer = useCallback(
    (junctionId: string, newOffset: number) => {
      setSongOffsets((prev) => ({ ...prev, [junctionId]: newOffset }));
    },
    []
  );

  const handleDrawerToggle = useCallback(() => setIsDrawerOpen((v) => !v), []);

  // ── Settings modal state ───────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSettings = useCallback(
    () => setSettingsOpen((prev) => !prev),
    []
  );

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const fontSizeControls = useFontSize();
  const chordFontSizeControls = useChordFontSize();
  const chordColorControls = useChordColor();
  const layoutControls = useSetlistLayout();

  // Destructure primitive values to satisfy React Compiler and BUG-002 dependency array rules
  const {
    lineHeight,
    contentWidth,
    layoutMode,
    pageColumns,
    overflowBehavior,
  } = layoutControls;
  const { fontSize } = fontSizeControls;
  const { chordFontSize } = chordFontSizeControls;

  // SSR hydration mount guard (BUG-020): useSyncExternalStore avoids react-hooks/set-state-in-effect
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isPageMode = isMounted && layoutMode === "page";

  // When Page View mode is active, autoScroll toolbar and listeners are disabled (AC-9)
  const autoScroll = useAutoScroll({ enabled: !isPageMode });

  // ── Page View Navigation State (AC-7, AC-10, AC-12, AC-13) ─────────────────
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [subPageIndex, setSubPageIndex] = useState(0);
  const [totalSubPages, setTotalSubPages] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState(0);

  // Popover state for song controls (transpose/capo) in compact header (AC-15)
  const [isSongControlsPopoverOpen, setIsSongControlsPopoverOpen] =
    useState(false);

  // Current active song in Page View mode
  const currentSong = songs[activeSongIndex] ?? null;

  // Active song ID synchronization with ServiceNavigator & Go Live
  const activeSongId = currentSong?.junctionId ?? null;

  // Measure song height and calculate sub-pages or fit-to-screen scale (AC-13, AC-14)
  const songContainerRef = useRef<HTMLDivElement>(null);
  const songContentRef = useRef<HTMLDivElement>(null);

  // Measure dimensions asynchronously via ResizeObserver to avoid synchronous setState in effect
  useEffect(() => {
    if (!isPageMode) {
      return;
    }

    const containerEl = songContainerRef.current;
    const contentEl = songContentRef.current;
    if (!containerEl || !contentEl) {
      return;
    }

    const updateMeasurements = () => {
      const cHeight = containerEl.clientHeight;
      const sHeight = contentEl.scrollHeight;

      if (cHeight <= 0 || sHeight <= 0) return;

      setContainerHeight(cHeight);

      if (overflowBehavior === "fit") {
        if (sHeight > cHeight) {
          const scale = Math.max(0.6, cHeight / sHeight);
          setFitScale(scale);
        } else {
          setFitScale(1);
        }
        setTotalSubPages(1);
      } else {
        setFitScale(1);
        const pages = Math.max(1, Math.ceil(sHeight / cHeight));
        setTotalSubPages(pages);
      }
    };

    // Initial measurement
    const rafId = requestAnimationFrame(updateMeasurements);

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });

    observer.observe(containerEl);
    observer.observe(contentEl);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    isPageMode,
    activeSongIndex,
    overflowBehavior,
    lineHeight,
    fontSize,
    chordFontSize,
    pageColumns,
  ]);

  // Reset subPageIndex when changing song or when subPageIndex exceeds totalSubPages
  const selectSongByIndex = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(songs.length - 1, index));
      setActiveSongIndex(nextIndex);
      setSubPageIndex(0);
      setIsSongControlsPopoverOpen(false);
      const song = songs[nextIndex];
      if (song && sync.isLive) {
        sync.onActiveSongChange(song.junctionId);
      }
    },
    [songs, sync]
  );

  // Navigation stepping: next and previous (AC-10, AC-12, AC-13)
  const handleNext = useCallback(() => {
    if (overflowBehavior === "paginate" && subPageIndex < totalSubPages - 1) {
      setSubPageIndex((prev) => prev + 1);
    } else if (activeSongIndex < songs.length - 1) {
      selectSongByIndex(activeSongIndex + 1);
    }
  }, [
    overflowBehavior,
    subPageIndex,
    totalSubPages,
    activeSongIndex,
    songs.length,
    selectSongByIndex,
  ]);

  const handlePrev = useCallback(() => {
    if (overflowBehavior === "paginate" && subPageIndex > 0) {
      setSubPageIndex((prev) => prev - 1);
    } else if (activeSongIndex > 0) {
      selectSongByIndex(activeSongIndex - 1);
    }
  }, [overflowBehavior, subPageIndex, activeSongIndex, selectSongByIndex]);

  // Keyboard navigation listener (AC-10, AC-11, AM-2)
  useEffect(() => {
    if (!isPageMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.code !== "Space" &&
        e.key !== "ArrowRight" &&
        e.key !== "ArrowLeft"
      ) {
        return;
      }

      // Input guard: disable shortcuts when typing in inputs/textareas or when modals are open (AC-11)
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (settingsOpen || isDrawerOpen) {
        return;
      }

      e.preventDefault();

      if (e.code === "Space" || e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPageMode, settingsOpen, isDrawerOpen, handleNext, handlePrev]);

  // Section Navigator Deck target derivation
  const navSections = useMemo(() => deriveSections(songs), [songs]);

  const isPrevDisabled = activeSongIndex === 0 && subPageIndex === 0;
  const isNextDisabled =
    activeSongIndex === songs.length - 1 &&
    (overflowBehavior === "fit" || subPageIndex >= totalSubPages - 1);

  // Content width class: when 2 or 3 columns in page mode, full width is forced (AC-5)
  const containerWidthClass =
    contentWidth === "full" || (isPageMode && pageColumns > 1)
      ? "w-full px-4 sm:px-6 lg:px-8"
      : "max-w-3xl mx-auto px-4 sm:px-8";

  // Responsive column CSS classes (AC-8):
  // 3-column: columns-1 lg:columns-2 xl:columns-3
  // 2-column: columns-1 lg:columns-2
  // 1-column: columns-1
  const responsiveColumnsClass =
    pageColumns === 3
      ? "columns-1 lg:columns-2 xl:columns-3"
      : pageColumns === 2
        ? "columns-1 lg:columns-2"
        : "columns-1";

  return (
    <>
      {/* ── Auto-scroll toolbar — rendered only when Continuous Scroll is active (AC-9) ── */}
      {!isPageMode && <AutoScrollToolbar scroll={autoScroll} />}

      {/* ── Section Navigator Deck — fixed floating badge column ───────────── */}
      {!isPageMode && (
        <SectionNavDeck
          sections={navSections}
          autoScroll={autoScroll}
          onMobileOpenChange={setIsSectionNavOpen}
        />
      )}

      {/* ── Edit Songs FAB — desktop-only, fixed bottom-left ───────────────── */}
      {isLeader && !isPageMode && (
        <AppendSongsButton
          setlistId={setlistId}
          existingSongIds={existingSongIds}
          currentSongs={setlistSongs}
        />
      )}

      {/* ── Page content wrapper ───────────────────────────────────────────── */}
      <div
        className={`section-nav-content-wrapper ${
          !isPageMode && isSectionNavOpen ? " pr-14 md:pr-0" : ""
        }`}
      >
        <div className={containerWidthClass}>
          {/* ── Setlist header (name + date + actions) ───────────────────────── */}
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
              {setlistName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
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

              {/* ── Settings gear button (AC-1, AC-2) ────────────────────────── */}
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
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          {/* ── Settings modal (AC-1–6, AC-14, AC-18) ─────────────────────────── */}
          <SetlistSettingsModal
            isOpen={settingsOpen}
            onClose={closeSettings}
            gearButtonRef={gearButtonRef}
            fontSizeControls={fontSizeControls}
            chordFontSizeControls={chordFontSizeControls}
            chordColorControls={chordColorControls}
            layoutControls={layoutControls}
          />

          {/* ── People block ─────────────────────────────────────────────────── */}
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
                    {lineup
                      .map((e) => `${e.name} — ${e.instrument}`)
                      .join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ── Service Navigator ────────────────────────────────────────────── */}
          <ServiceNavigator
            songs={navigatorSongs}
            isLeader={isLeader}
            setlistId={setlistId}
            isAuthenticated={isAuthenticated}
            activeSongId={isPageMode && activeSongId ? activeSongId : undefined}
            onSelectSong={
              isPageMode
                ? (junctionId) => {
                    const idx = songs.findIndex(
                      (s) => s.junctionId === junctionId
                    );
                    if (idx !== -1) {
                      selectSongByIndex(idx);
                    }
                  }
                : undefined
            }
            sync={{
              isLive: sync.isLive,
              onActiveSongChange: sync.onActiveSongChange,
            }}
            onBeforeNavigate={
              autoScroll.isActive ? autoScroll.pause : undefined
            }
            onAfterNavigate={
              autoScroll.isActive ? autoScroll.resume : undefined
            }
          />

          {/* ── Main song display: Continuous Scroll vs Page View ─────────────── */}
          {isPageMode && currentSong ? (
            /* ── Page View Mode: 1 Song per Screen with On-Screen Edge Nav (AC-7, AC-8, AC-12, AC-13, AC-14, AC-15) ── */
            <div className="relative mt-6 select-none">
              {/* Subtle edge navigation buttons (AC-12) */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={isPrevDisabled}
                aria-label="Previous song or sub-page"
                className={[
                  "fixed left-2 top-1/2 -translate-y-1/2 z-30",
                  "flex items-center justify-center w-10 h-16 rounded-r-xl",
                  "bg-brand-espresso/20 hover:bg-brand-espresso/60 text-brand-cream dark:bg-brand-tan/20 dark:hover:bg-brand-tan/60 dark:text-brand-espresso",
                  "backdrop-blur-sm transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan",
                  isPrevDisabled
                    ? "opacity-0 pointer-events-none"
                    : "opacity-40 hover:opacity-100",
                ].join(" ")}
              >
                <ChevronLeft size={24} strokeWidth={2.5} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isNextDisabled}
                aria-label="Next song or sub-page"
                className={[
                  "fixed right-2 top-1/2 -translate-y-1/2 z-30",
                  "flex items-center justify-center w-10 h-16 rounded-l-xl",
                  "bg-brand-espresso/20 hover:bg-brand-espresso/60 text-brand-cream dark:bg-brand-tan/20 dark:hover:bg-brand-tan/60 dark:text-brand-espresso",
                  "backdrop-blur-sm transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan",
                  isNextDisabled
                    ? "opacity-0 pointer-events-none"
                    : "opacity-40 hover:opacity-100",
                ].join(" ")}
              >
                <ChevronRight size={24} strokeWidth={2.5} aria-hidden="true" />
              </button>

              {/* Single Song Container with multi-column styling & paging */}
              <div
                ref={songContainerRef}
                className="min-h-[70vh] max-h-[82vh] overflow-hidden relative select-text"
              >
                {/* Popover Controls trigger in Page View mode (AC-15) */}
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-brown dark:text-brand-tan">
                    <span>
                      Song {activeSongIndex + 1} of {songs.length}
                    </span>
                    {totalSubPages > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-brown/10 dark:bg-brand-tan/10 text-xs">
                        Page {subPageIndex + 1} / {totalSubPages}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSongControlsPopoverOpen((v) => !v)}
                      aria-expanded={isSongControlsPopoverOpen}
                      aria-label="Toggle song transpose and capo controls"
                      className={[
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors duration-200",
                        "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan",
                      ].join(" ")}
                    >
                      <SlidersHorizontal size={13} aria-hidden="true" />
                      Transpose / Capo
                    </button>

                    {/* Popover content (AC-15) */}
                    {isSongControlsPopoverOpen && (
                      <div className="absolute right-0 top-full mt-2 z-50 w-72 p-4 rounded-xl shadow-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/20 dark:border-brand-tan/20">
                        <div className="flex items-center justify-between mb-3 border-b border-brand-brown/15 dark:border-brand-tan/15 pb-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-brown dark:text-brand-tan">
                            Song Controls
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsSongControlsPopoverOpen(false)}
                            aria-label="Close controls popover"
                            className="text-xs text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        {/* Transposition & Capo controls inside popover */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-brand-brown dark:text-brand-tan">
                              Transposed Key
                            </span>
                            <span className="font-mono font-bold text-sm text-brand-espresso dark:text-brand-cream">
                              {currentSong.performanceKey}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const offset =
                                  (songOffsets[currentSong.junctionId] ?? 0) -
                                  1;
                                handleKeyChangeForDrawer(
                                  currentSong.junctionId,
                                  offset
                                );
                              }}
                              className={[ctrlBtnClass, "w-8 h-8"].join(" ")}
                              aria-label="Transpose down 1 semitone"
                            >
                              −1
                            </button>
                            <select
                              value={currentSong.performanceKey}
                              onChange={(e) => {
                                const target = e.target.value;
                                const offset = getSemitoneOffset(
                                  currentSong.originalKey,
                                  target
                                );
                                handleKeyChangeForDrawer(
                                  currentSong.junctionId,
                                  offset
                                );
                              }}
                              aria-label="Select song key"
                              className="flex-1 font-mono font-bold text-xs px-2 py-1.5 rounded-lg border border-brand-brown/30 dark:border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream"
                            >
                              {NOTES.map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const offset =
                                  (songOffsets[currentSong.junctionId] ?? 0) +
                                  1;
                                handleKeyChangeForDrawer(
                                  currentSong.junctionId,
                                  offset
                                );
                              }}
                              className={[ctrlBtnClass, "w-8 h-8"].join(" ")}
                              aria-label="Transpose up 1 semitone"
                            >
                              +1
                            </button>
                          </div>
                          {/* Capo selector */}
                          <div>
                            <span className="text-xs font-semibold text-brand-brown dark:text-brand-tan mb-1 block">
                              Capo
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {CAPO_FRETS.map((fret) => (
                                <button
                                  key={fret}
                                  type="button"
                                  onClick={() => {
                                    handleKeyChangeForDrawer(
                                      currentSong.junctionId,
                                      fret === 0 ? 0 : -fret
                                    );
                                  }}
                                  className="w-7 h-7 rounded text-xs font-mono font-bold border border-brand-brown/20 dark:border-brand-tan/20 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 text-brand-espresso dark:text-brand-cream"
                                >
                                  {fret}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Song Content with CSS Columns and transform for pagination */}
                <div
                  ref={songContentRef}
                  style={{
                    transform:
                      overflowBehavior === "fit"
                        ? `scale(${fitScale})`
                        : `translateY(-${subPageIndex * containerHeight}px)`,
                    transformOrigin: "top left",
                    transition: "transform 0.25s ease-out",
                    columnGap: "2.5rem",
                    columnRule:
                      pageColumns > 1
                        ? "1px solid var(--brand-tan-alpha, rgba(139, 99, 71, 0.15))"
                        : "none",
                  }}
                  className={`w-full ${responsiveColumnsClass}`}
                >
                  <SetlistSongSection
                    key={currentSong.junctionId}
                    junctionId={currentSong.junctionId}
                    songId={currentSong.songId}
                    setlistId={currentSong.setlistId}
                    title={currentSong.title}
                    artist={currentSong.artist}
                    originalKey={currentSong.originalKey}
                    processedLines={currentSong.processedLines}
                    performanceKey={currentSong.performanceKey}
                    isLeader={isLeader}
                    youtubeUrl={currentSong.youtubeUrl}
                    isMusicDirector={isMusicDirector}
                    overrideKey={sync.overrideKeys.get(currentSong.junctionId)}
                    onKeyChangeLive={
                      isLeader && sync.isLive ? sync.notifyKeyChange : undefined
                    }
                    liveSyncState={sync.songSyncStates.get(
                      currentSong.junctionId
                    )}
                    externalChordsHidden={globalChordsHidden}
                    autoScroll={autoScroll}
                    fontSize={fontSize}
                    onIncreaseFont={fontSizeControls.increase}
                    onDecreaseFont={fontSizeControls.decrease}
                    onResetFont={fontSizeControls.reset}
                    chordFontSize={chordFontSize}
                    chordBg={chordColorControls.chordBg}
                    chordColor={chordColorControls.chordColor}
                    lineHeight={lineHeight}
                    isCompactHeader={true}
                    hideChordToolbar={true}
                    onChordClick={handleChordClick}
                    onOffsetChange={handleKeyChangeForDrawer}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Continuous Scroll Mode (Standard) ───────────────────────────── */
            <div className="flex flex-col gap-10 mt-6">
              {songs.map((song) => {
                const overrideKey = sync.overrideKeys.get(song.junctionId);
                const liveSyncState = sync.songSyncStates.get(song.junctionId);

                return (
                  <SetlistSongSection
                    key={song.junctionId}
                    junctionId={song.junctionId}
                    songId={song.songId}
                    setlistId={song.setlistId}
                    title={song.title}
                    artist={song.artist}
                    originalKey={song.originalKey}
                    processedLines={song.processedLines}
                    performanceKey={song.performanceKey}
                    isLeader={isLeader}
                    youtubeUrl={song.youtubeUrl}
                    isMusicDirector={isMusicDirector}
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
                    lineHeight={layoutControls.lineHeight}
                    isCompactHeader={false}
                    hideChordToolbar={false}
                    onChordClick={handleChordClick}
                    onOffsetChange={handleKeyChangeForDrawer}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* end page content padding wrapper */}

      {/* ── Global chord drawer ────────────────────────────────────────────── */}
      <ChordDrawer
        isOpen={isDrawerOpen}
        onToggle={handleDrawerToggle}
        focusedChord={focusedChord}
        instrumentMode={instrumentMode}
        onInstrumentChange={handleInstrumentChange}
        uniqueChords={uniqueChords}
      />

      {/* ── Bottom spacer — prevents toolbar from obscuring last song content ── */}
      {!isPageMode && autoScroll.isActive && (
        <div className="h-24 w-full" aria-hidden="true" />
      )}
    </>
  );
}
