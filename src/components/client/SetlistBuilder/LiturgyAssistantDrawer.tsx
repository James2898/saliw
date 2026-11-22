"use client";

import React from "react";

import {
  LiturgyAgentResponse,
  LiturgyStepProgress,
  ProposedSong,
} from "@/types/liturgyAgent";
import {
  Sparkles,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  RefreshCcw,
  SlidersHorizontal,
  Music2,
  ChevronDown,
  ChevronUp,
  User,
  History,
  Loader2,
} from "lucide-react";
import Button from "../button";
import {
  generateSetlistProposalAction,
  refreshSingleSongRecommendationAction,
} from "@/app/actions/liturgyAgentActions";
import SongCard from "../SongCard";
import SongTagBadge from "@/components/SongTags/SongTagBadge";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import SongKeySelect from "@/components/SongKey/SongKeySelect";

interface LiturgyAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allMusicians: { id: string; name: string }[];
  currentWorshipLeaderId: string | null;
  onApplySetlist: (songs: ProposedSong[], mode: "replace" | "append") => void;
  hasExistingSongs: boolean;
  existingSongIds?: string[];
  initialAiQuota?: { used: number; total: number };
}

const PROMPT_SUGGESTIONS = [
  "High energy opener",
  "Tagalog & English mix",
  "Hillsong & Bethel",
  "Communion prayer flow",
];

const MOCK_JOYFUL_SONGS: ProposedSong[] = [
  {
    songId: "mock-j1",
    title: "House of the Lord",
    artist: "Phil Wickham",
    originalKey: "Bb",
    recommendedKey: "Bb",
    tag: "joyful",
    transitionNote: "High energy celebratory opener in original key Bb.",
    keySource: "original_key",
  },
  {
    songId: "mock-j2",
    title: "Praise",
    artist: "Elevation Worship",
    originalKey: "C",
    recommendedKey: "C",
    tag: "joyful",
    transitionNote: "Harmonic whole-step lift (+2 semitones) from Bb to C for rising congregational energy.",
    keySource: "harmonic_modulation",
  },
  {
    songId: "mock-j3",
    title: "This Is Amazing Grace",
    artist: "Phil Wickham",
    originalKey: "G",
    recommendedKey: "G",
    tag: "joyful",
    transitionNote: "Joyful celebration of Christ's triumph and grace.",
    keySource: "original_key",
  },
];

const MOCK_SOLEMN_SONGS: ProposedSong[] = [
  {
    songId: "mock-s1",
    title: "Build My Life",
    artist: "Housefires",
    originalKey: "G",
    recommendedKey: "G",
    tag: "solemn",
    transitionNote: "Subdominant harmonic flow into deep surrender and consecration.",
    keySource: "harmonic_modulation",
  },
  {
    songId: "mock-s2",
    title: "Goodness of God",
    artist: "Bethel Music",
    originalKey: "Ab",
    recommendedKey: "G",
    tag: "solemn",
    transitionNote: "Same-key intimate worship flow in G reflecting on God's faithfulness.",
    keySource: "harmonic_modulation",
  },
  {
    songId: "mock-s3",
    title: "Gratitude",
    artist: "Brandon Lake",
    originalKey: "B",
    recommendedKey: "G",
    tag: "solemn",
    transitionNote: "Reverent prayerful modulation into heartfelt thanksgiving.",
    keySource: "harmonic_modulation",
  },
];

const MOCK_ALTERNATIVE_SONGS: ProposedSong[] = [
  {
    songId: "mock-alt1",
    title: "Way Maker",
    artist: "Sinach",
    originalKey: "E",
    recommendedKey: "E",
    tag: "joyful",
    transitionNote: "Triumphant declaration of God as miracle worker.",
    keySource: "original_key",
  },
  {
    songId: "mock-alt2",
    title: "King of Kings",
    artist: "Hillsong Worship",
    originalKey: "D",
    recommendedKey: "D",
    tag: "solemn",
    transitionNote: "Modulated for reverent reflection on the gospel narrative.",
    keySource: "harmonic_modulation",
  },
];

export default function LiturgyAssistantDrawer({
  isOpen,
  onClose,
  allMusicians,
  currentWorshipLeaderId,
  onApplySetlist,
  hasExistingSongs,
  existingSongIds = [],
  initialAiQuota,
}: LiturgyAssistantDrawerProps) {
  // Synchronize worshipLeaderId with currentWorshipLeaderId prop (AM-3, BUG-001)
  const [worshipLeaderId, setWorshipLeaderId] = React.useState<string>(
    () => currentWorshipLeaderId || ""
  );

  React.useEffect(() => {
    setWorshipLeaderId(currentWorshipLeaderId || "");
  }, [currentWorshipLeaderId]);

  const [joyfulCount, setJoyfulCount] = React.useState<number>(() => 1);
  const [solemnCount, setSolemnCount] = React.useState<number>(() => 1);
  const [totalCount, setTotalCount] = React.useState<number>(() => 2);
  const [additionalInstructions, setAdditionalInstructions] =
    React.useState<string>(() => "");
  const [isLoading, setIsLoading] = React.useState<boolean>(() => false);
  const [error, setError] = React.useState<string | null>(() => null);
  const [proposedSongs, setProposedSongs] = React.useState<ProposedSong[]>(
    () => []
  );
  const [stepsExecuted, setStepsExecuted] = React.useState<
    LiturgyStepProgress[]
  >(() => []);
  const [isStepsOpen, setIsStepsOpen] = React.useState<boolean>(() => true);
  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(() => true);

  // Daily AI quota & curation indicators
  const [aiQuota, setAiQuota] = React.useState<{
    used: number;
    total: number;
  }>(() => initialAiQuota || { used: 0, total: 10 });
  const [isAiCurated, setIsAiCurated] = React.useState<boolean>(() => false);
  const [fallbackNotice, setFallbackNotice] = React.useState<string | null>(
    () => null
  );

  // Simulation / Mock mode toggle (Defaults to true as instructed: "do not use the api use mock to simulate loading")
  const [useMockSimulation, setUseMockSimulation] = React.useState<boolean>(() => true);

  React.useEffect(() => {
    if (initialAiQuota) {
      setAiQuota(initialAiQuota);
    }
  }, [initialAiQuota]);

  // Single-song refresh state (AC-8, AC-10)
  const [refreshingIndex, setRefreshingIndex] = React.useState<number | null>(
    () => null
  );
  const [refreshError, setRefreshError] = React.useState<string | null>(
    () => null
  );

  // Replace confirmation modal state (AC-2, AM-6)
  const [showApplyConfirmModal, setShowApplyConfirmModal] =
    React.useState<boolean>(() => false);

  React.useEffect(() => {
    setTotalCount(joyfulCount + solemnCount);
  }, [joyfulCount, solemnCount]);

  const handleCountChange = (type: "joyful" | "solemn", delta: number) => {
    if (type === "joyful") {
      const next = Math.max(0, Math.min(3, joyfulCount + delta));
      setJoyfulCount(next);
    } else {
      const next = Math.max(0, Math.min(3, solemnCount + delta));
      setSolemnCount(next);
    }
  };

  const handleAddPromptSuggestion = (suggestion: string) => {
    setAdditionalInstructions((prev) => {
      if (!prev.trim()) return suggestion;
      if (prev.includes(suggestion)) return prev;
      return `${prev}, ${suggestion}`;
    });
  };

  const handleGenerateProposal = async () => {
    setProposedSongs([]);
    setFallbackNotice(null);
    setIsLoading(true);
    setError(null);
    setRefreshError(null);
    setIsStepsOpen(true);

    const initialSteps: LiturgyStepProgress[] = [
      {
        step: "leader_history",
        status: "in_progress",
        detail: worshipLeaderId
          ? "Reviewing worship leader history and preferred vocal keys..."
          : "Checking worship leader range settings...",
      },
      {
        step: "library_tag_search",
        status: "pending",
        detail: `Searching library for ${joyfulCount} joyful and ${solemnCount} solemn songs...`,
      },
      {
        step: "ai_semantic_curation",
        status: "pending",
        detail: additionalInstructions.trim()
          ? `Curating setlist based on "${additionalInstructions.trim().slice(0, 32)}..."`
          : "Curating cohesive thematic worship flow...",
      },
      {
        step: "harmonic_optimization",
        status: "pending",
        detail: "Optimizing song keys for seamless harmonic transitions...",
      },
    ];

    setStepsExecuted(initialSteps);

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    if (useMockSimulation) {
      try {
        // Step 1: leader history
        await sleep(650);
        setStepsExecuted((prev) => [
          {
            ...prev[0],
            status: "completed",
            detail: worshipLeaderId
              ? `Checked worship leader history (${selectedLeaderName ?? "Leader"} past keys found).`
              : "Checked worship leader range settings.",
          },
          { ...prev[1], status: "in_progress" },
          prev[2],
          prev[3],
        ]);

        // Step 2: library tag search
        await sleep(750);
        setStepsExecuted((prev) => [
          prev[0],
          {
            ...prev[1],
            status: "completed",
            detail: `Found matching songs in library for ${joyfulCount} joyful and ${solemnCount} solemn slots.`,
          },
          { ...prev[2], status: "in_progress" },
          prev[3],
        ]);

        // Step 3: AI semantic curation
        await sleep(950);
        setStepsExecuted((prev) => [
          prev[0],
          prev[1],
          {
            ...prev[2],
            status: "completed",
            detail: additionalInstructions.trim()
              ? `AI curated songs matching "${additionalInstructions.trim().slice(0, 28)}...".`
              : "AI curated songs matching liturgical worship themes.",
          },
          { ...prev[3], status: "in_progress" },
        ]);

        // Step 4: Harmonic optimization
        await sleep(650);
        setStepsExecuted((prev) => [
          prev[0],
          prev[1],
          prev[2],
          {
            ...prev[3],
            status: "completed",
            detail: "Optimized song keys for smooth pastoral and musical transitions.",
          },
        ]);

        // Populate mock songs according to chosen counts
        const selectedJoyful = MOCK_JOYFUL_SONGS.slice(0, joyfulCount);
        const selectedSolemn = MOCK_SOLEMN_SONGS.slice(0, solemnCount);
        const combined = [...selectedJoyful, ...selectedSolemn];

        if (worshipLeaderId && combined.length > 0) {
          combined[0] = {
            ...combined[0],
            previouslySungKey: combined[0].originalKey,
            lastSungDate: "2026-10-18",
          };
        }

        setProposedSongs(combined);
        setIsAiCurated(true);
        setAiQuota((prev) => ({
          ...prev,
          used: Math.min(prev.total, prev.used + 1),
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const serverActionPromise = generateSetlistProposalAction({
        worshipLeaderId: worshipLeaderId || null,
        joyfulCount,
        solemnCount,
        additionalInstructions,
      });

      await sleep(600);
      setStepsExecuted((prev) => [
        { ...prev[0], status: "completed" },
        { ...prev[1], status: "in_progress" },
        prev[2],
        prev[3],
      ]);

      await sleep(700);
      setStepsExecuted((prev) => [
        prev[0],
        { ...prev[1], status: "completed" },
        { ...prev[2], status: "in_progress" },
        prev[3],
      ]);

      await sleep(800);
      setStepsExecuted((prev) => [
        prev[0],
        prev[1],
        { ...prev[2], status: "completed" },
        { ...prev[3], status: "in_progress" },
      ]);

      const response: LiturgyAgentResponse = await serverActionPromise;

      setStepsExecuted((prev) => [
        prev[0],
        prev[1],
        prev[2],
        { ...prev[3], status: "completed" },
      ]);

      if (!response.success) {
        setError(response.error || "An unknown error occurred.");
        setIsLoading(false);
        return;
      }

      setProposedSongs(response.proposedSongs);
      setStepsExecuted(response.stepsExecuted);
      setIsAiCurated(Boolean(response.isAiCurated));
      if (response.aiQuota) {
        setAiQuota(response.aiQuota);
      }
      setFallbackNotice(response.fallbackNotice || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // AM-2: Interactive key change updater setting keySource = "manual"
  const handleKeyChange = (index: number, newKey: string) => {
    setProposedSongs((prev) =>
      prev.map((song, i) =>
        i === index
          ? {
              ...song,
              recommendedKey: newKey,
              keySource: "manual" as const,
            }
          : song
      )
    );
  };

  // AC-6, AC-7, AC-8, AC-9, AC-10: Isolated single-song re-roll
  const handleRefreshSong = async (index: number) => {
    if (refreshingIndex !== null) return;
    const targetSong = proposedSongs[index];
    if (!targetSong) return;

    setRefreshingIndex(index);
    setRefreshError(null);

    if (useMockSimulation) {
      await new Promise((r) => setTimeout(r, 700));

      const alt =
        MOCK_ALTERNATIVE_SONGS[index % MOCK_ALTERNATIVE_SONGS.length] ||
        MOCK_JOYFUL_SONGS[2];

      setProposedSongs((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...alt,
                tag: s.tag,
                transitionNote: `Re-rolled for slot ${index + 1}: ${alt.transitionNote}`,
              }
            : s
        )
      );

      setAiQuota((prev) => ({
        ...prev,
        used: Math.min(prev.total, prev.used + 1),
      }));

      setRefreshingIndex(null);
      return;
    }

    try {
      const excludedSongIds = Array.from(
        new Set([
          ...proposedSongs.map((s) => s.songId),
          ...(existingSongIds || []),
        ])
      );

      const prevSongKey =
        index > 0 ? proposedSongs[index - 1].recommendedKey : null;

      const response = await refreshSingleSongRecommendationAction({
        slotIndex: index,
        currentSong: targetSong,
        liturgyContext: {
          worshipLeaderId: worshipLeaderId || null,
          joyfulCount,
          solemnCount,
          additionalInstructions,
        },
        excludedSongIds,
        prevSongKey,
      });

      if (!response.success || !response.song) {
        setRefreshError(
          response.error ||
            "Unable to find an alternative song for this liturgy slot"
        );
        return;
      }

      const replacement = response.song;
      setProposedSongs((prev) =>
        prev.map((s, i) => (i === index ? replacement : s))
      );
      if (response.aiQuota) {
        setAiQuota(response.aiQuota);
      }
    } catch (err) {
      setRefreshError(
        err instanceof Error
          ? err.message
          : "Unable to find an alternative song for this liturgy slot"
      );
    } finally {
      setRefreshingIndex(null);
    }
  };

  if (!isOpen) return null;

  const selectedLeaderName =
    allMusicians.find((m) => m.id === worshipLeaderId)?.name || null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-brand-espresso/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 z-[100] right-0 w-full max-w-lg bg-brand-cream dark:bg-brand-espresso border-l border-brand-brown/30 flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-brown/20 bg-brand-cream/90 dark:bg-brand-espresso/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-brown/10 dark:bg-brand-tan/15 flex items-center justify-center text-brand-espresso dark:text-brand-cream shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream leading-tight">
                  Liturgy Assistant
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    aiQuota.used >= aiQuota.total
                      ? "bg-brand-brown/15 dark:bg-brand-tan/15 text-brand-espresso dark:text-brand-cream border-brand-brown/30"
                      : "bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-espresso dark:text-brand-cream border-brand-brown/20"
                  }`}
                  title={
                    aiQuota.used >= aiQuota.total
                      ? "You've used all 10 AI picks today. Standard tag search active."
                      : `${aiQuota.total - aiQuota.used} AI picks remaining today.`
                  }
                >
                  <Sparkles size={11} className="text-brand-brown dark:text-brand-tan" />
                  <span>
                    {aiQuota.used >= aiQuota.total
                      ? "10/10 AI picks used"
                      : `AI: ${aiQuota.used}/${aiQuota.total} picks`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setUseMockSimulation((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                    useMockSimulation
                      ? "bg-brand-brown/15 dark:bg-brand-tan/15 text-brand-espresso dark:text-brand-cream border-brand-brown/30"
                      : "bg-brand-brown/5 dark:bg-brand-tan/5 text-brand-brown/70 dark:text-brand-tan/70 border-brand-brown/20"
                  }`}
                  title={
                    useMockSimulation
                      ? "Mock Simulation Mode Active (No API calls or quota used). Click to switch to Live API."
                      : "Live Gemini API Active. Click to switch to Mock Simulation Mode."
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      useMockSimulation
                        ? "bg-brand-espresso dark:bg-brand-cream"
                        : "bg-brand-brown/40 dark:bg-brand-tan/40"
                    }`}
                  />
                  <span>{useMockSimulation ? "Mock Mode" : "Live API"}</span>
                </button>
              </div>
              <p className="text-xs text-brand-brown/70 dark:text-brand-tan/70">
                Curate service setlists with key transitions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-brown/70 dark:text-brand-tan/70 hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors cursor-pointer"
            aria-label="Close liturgy assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Parameters / Configuration Card */}
          <div className="bg-brand-brown/5 dark:bg-brand-tan/5 border border-brand-brown/15 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-espresso dark:text-brand-cream">
                <SlidersHorizontal size={15} />
                <span className="font-sans font-semibold text-xs tracking-wider uppercase">
                  Setlist Parameters
                </span>
              </div>
              {proposedSongs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfigOpen((prev) => !prev)}
                  className="text-xs text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream flex items-center gap-1 cursor-pointer font-medium"
                  aria-expanded={isConfigOpen}
                >
                  <span>{isConfigOpen ? "Collapse" : "Adjust"}</span>
                  {isConfigOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>

            {isConfigOpen && (
              <div className="space-y-4 pt-1">
                {/* Worship Leader Selection */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="liturgy-worship-leader"
                    className="text-xs font-semibold text-brand-espresso dark:text-brand-cream flex items-center gap-1.5"
                  >
                    <User size={13} className="text-brand-brown/70" />
                    Worship Leader
                  </label>
                  <select
                    id="liturgy-worship-leader"
                    value={worshipLeaderId}
                    onChange={(e) => setWorshipLeaderId(e.target.value)}
                    className="w-full bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-xl px-3 py-2 text-sm text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-brown"
                  >
                    <option value="">No Specific Worship Leader (General range)</option>
                    {allMusicians.map((musician) => (
                      <option key={musician.id} value={musician.id}>
                        {musician.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-brand-brown/60 dark:text-brand-tan/60">
                    Leader selection personalizes song keys to their past vocal performances.
                  </p>
                </div>

                {/* Mood Counters */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-espresso dark:text-brand-cream">
                      Song Mood Balance
                    </span>
                    <span className="text-xs text-brand-brown/80 dark:text-brand-tan/80 font-medium">
                      Total: {totalCount} {totalCount === 1 ? "song" : "songs"} (1–6)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Joyful Counter Tile */}
                    <div className="bg-brand-cream/80 dark:bg-brand-espresso/60 border border-brand-brown/20 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-espresso dark:text-brand-cream">
                            Joyful
                          </span>
                          <span className="text-base font-extrabold text-brand-espresso dark:text-brand-cream">
                            {joyfulCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-brown/60 dark:text-brand-tan/60 line-clamp-1">
                          Praise & opening energy
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-brand-brown/10">
                        <button
                          type="button"
                          onClick={() => handleCountChange("joyful", -1)}
                          disabled={joyfulCount <= 0}
                          aria-label="Decrease joyful songs"
                          className="flex-1 py-1 rounded-md border border-brand-brown/20 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCountChange("joyful", 1)}
                          disabled={joyfulCount >= 3}
                          aria-label="Increase joyful songs"
                          className="flex-1 py-1 rounded-md border border-brand-brown/20 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Solemn Counter Tile */}
                    <div className="bg-brand-cream/80 dark:bg-brand-espresso/60 border border-brand-brown/20 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-espresso dark:text-brand-cream">
                            Solemn
                          </span>
                          <span className="text-base font-extrabold text-brand-espresso dark:text-brand-cream">
                            {solemnCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-brown/60 dark:text-brand-tan/60 line-clamp-1">
                          Worship & prayer flow
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-brand-brown/10">
                        <button
                          type="button"
                          onClick={() => handleCountChange("solemn", -1)}
                          disabled={solemnCount <= 0}
                          aria-label="Decrease solemn songs"
                          className="flex-1 py-1 rounded-md border border-brand-brown/20 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCountChange("solemn", 1)}
                          disabled={solemnCount >= 3}
                          aria-label="Increase solemn songs"
                          className="flex-1 py-1 rounded-md border border-brand-brown/20 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Instructions & Suggestion Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor="liturgy-instructions"
                        className="text-xs font-semibold text-brand-espresso dark:text-brand-cream"
                      >
                        Themes or Focus (Optional)
                      </label>
                      <span className="text-[10px] text-brand-brown/70 dark:text-brand-tan/70 font-medium">
                        ({aiQuota.total - aiQuota.used} AI picks left)
                      </span>
                    </div>
                    <span
                      className={`text-[11px] tabular-nums font-medium ${
                        additionalInstructions.length >= 280
                          ? "text-brand-espresso dark:text-brand-cream font-bold"
                          : "text-brand-brown/50 dark:text-brand-tan/50"
                      }`}
                    >
                      {additionalInstructions.length}/300
                    </span>
                  </div>
                  <textarea
                    id="liturgy-instructions"
                    maxLength={300}
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="w-full bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-xl p-2.5 text-xs text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/50 focus:outline-none focus:ring-1 focus:ring-brand-brown h-20 resize-none"
                    placeholder="e.g. high energy opener, communion focus, Hillsong artists..."
                  />

                  {/* Quick suggestion pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {PROMPT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddPromptSuggestion(suggestion)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-brand-brown/20 bg-brand-cream/60 dark:bg-brand-espresso/60 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:border-brand-brown/40 transition-colors cursor-pointer"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  variant="primary"
                  size="md"
                  className="w-full font-semibold shadow-xs"
                  disabled={isLoading || totalCount < 1 || totalCount > 6}
                  onClick={handleGenerateProposal}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="mr-2 animate-spin text-brand-espresso" />
                  ) : (
                    <Sparkles size={16} className="mr-2 text-brand-espresso" />
                  )}
                  {isLoading ? "Generating Proposal..." : "Generate Setlist Proposal"}
                </Button>
              </div>
            )}

            {/* Collapsed summary pill when parameters are hidden */}
            {!isConfigOpen && (
              <div className="text-xs text-brand-brown dark:text-brand-tan flex items-center justify-between pt-1">
                <span>
                  {joyfulCount} Joyful · {solemnCount} Solemn
                  {selectedLeaderName ? ` · ${selectedLeaderName}` : ""}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateProposal}
                  disabled={isLoading}
                  className="text-xs font-semibold text-brand-espresso dark:text-brand-cream underline cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Generating..." : "Re-generate"}
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-700 dark:text-red-400 flex items-start gap-2"
            >
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Single-song refresh error (AC-10) */}
          {refreshError && (
            <div
              role="alert"
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-xl p-2.5 flex items-center justify-between text-xs text-brand-espresso dark:text-brand-cream"
            >
              <span>{refreshError}</span>
              <button
                type="button"
                onClick={() => setRefreshError(null)}
                className="ml-2 text-brand-brown/60 hover:text-brand-espresso dark:hover:text-brand-cream p-1 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Simple Fallback Notice (Plain everyday words) */}
          {fallbackNotice && (
            <div
              role="status"
              className="bg-brand-brown/5 dark:bg-brand-tan/5 border border-brand-brown/20 rounded-xl p-3 text-xs text-brand-espresso dark:text-brand-cream flex items-start gap-2.5"
            >
              <Sparkles
                size={15}
                className="text-brand-brown dark:text-brand-tan shrink-0 mt-0.5"
              />
              <div className="leading-relaxed">
                <span className="font-semibold block text-brand-espresso dark:text-brand-cream">
                  Standard Tag Search Used
                </span>
                <span className="text-brand-brown/90 dark:text-brand-tan/90">
                  {fallbackNotice}
                </span>
              </div>
            </div>
          )}

          {/* Assistant Generation Pipeline Trace (Replacing raw unaligned text) */}
          {(stepsExecuted.length > 0 || isLoading) && (
            <div className="bg-brand-brown/5 dark:bg-brand-tan/5 border border-brand-brown/15 rounded-2xl p-4 transition-all">
              <button
                type="button"
                onClick={() => setIsStepsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
                aria-expanded={isStepsOpen}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-2 w-2 rounded-full ${
                      isLoading
                        ? "bg-brand-espresso dark:bg-brand-cream animate-ping"
                        : "bg-brand-espresso dark:bg-brand-cream"
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-espresso dark:text-brand-cream">
                    Generation Pipeline
                  </span>
                  <span className="text-[11px] text-brand-brown/70 dark:text-brand-tan/70 font-medium">
                    ({stepsExecuted.filter((s) => s.status === "completed").length}/{stepsExecuted.length} completed)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-brand-brown/70 dark:text-brand-tan/70 group-hover:text-brand-espresso dark:group-hover:text-brand-cream">
                  <span>{isStepsOpen ? "Hide" : "View"}</span>
                  {isStepsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {isStepsOpen && (
                <div className="mt-3.5 space-y-3 relative pl-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-brand-brown/20 dark:before:bg-brand-tan/20">
                  {stepsExecuted.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-2.5">
                      <div className="shrink-0 -ml-[15px] bg-brand-cream dark:bg-brand-espresso z-10 py-0.5">
                        {step.status === "completed" ? (
                          <CheckCircle2
                            size={15}
                            className="text-brand-espresso dark:text-brand-cream"
                          />
                        ) : step.status === "in_progress" ? (
                          <Loader2
                            size={15}
                            className="animate-spin text-brand-espresso dark:text-brand-cream"
                          />
                        ) : (
                          <Circle
                            size={15}
                            className="text-brand-brown/40 dark:text-brand-tan/40"
                          />
                        )}
                      </div>
                      <div className="text-xs text-brand-espresso dark:text-brand-cream leading-tight pt-0.5">
                        <span
                          className={
                            step.status === "in_progress"
                              ? "font-semibold text-brand-espresso dark:text-brand-cream animate-pulse"
                              : step.status === "completed"
                              ? "font-medium text-brand-espresso dark:text-brand-cream"
                              : "text-brand-brown/60 dark:text-brand-tan/60"
                          }
                        >
                          {step.detail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Proposed Songs Section */}
          {proposedSongs.length > 0 && (
            <div className="space-y-3 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music2 size={16} className="text-brand-espresso dark:text-brand-cream" />
                  <h3 className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream">
                    Proposed Setlist
                  </h3>
                  {isAiCurated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-espresso dark:text-brand-cream border border-brand-brown/20 dark:border-brand-tan/20">
                      <Sparkles size={11} className="text-brand-brown dark:text-brand-tan" />
                      AI Curated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-brown/5 dark:bg-brand-tan/5 text-brand-brown/70 dark:text-brand-tan/70 border border-dashed border-brand-brown/20 dark:border-brand-tan/20">
                      Tag Match
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-espresso dark:text-brand-cream">
                  {proposedSongs.length} {proposedSongs.length === 1 ? "song" : "songs"}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {proposedSongs.map((song, index) => (
                  <React.Fragment key={index}>
                    <SongCard
                      title={song.title}
                      artist={song.artist}
                      className="p-3 shadow-xs"
                      leftSlot={
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-espresso dark:text-brand-cream text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                      }
                      badgeSlot={
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {song.tag && <SongTagBadge tag={song.tag} size="sm" />}
                          {worshipLeaderId && (
                            song.previouslySungKey ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-brand-tan/30 dark:bg-brand-tan/20 text-brand-espresso dark:text-brand-cream border border-brand-brown/20 dark:border-brand-tan/30"
                                title={
                                  song.lastSungDate
                                    ? `${selectedLeaderName ?? "Leader"} previously sang this in key ${song.previouslySungKey} on ${song.lastSungDate}`
                                    : `${selectedLeaderName ?? "Leader"} previously sang this in key ${song.previouslySungKey}`
                                }
                              >
                                <History size={11} className="shrink-0 text-brand-brown dark:text-brand-tan" />
                                <span>Sung in {song.previouslySungKey}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-normal text-brand-brown/60 dark:text-brand-tan/60 border border-dashed border-brand-brown/20 dark:border-brand-tan/20"
                                title={`${selectedLeaderName ?? "Leader"} has not previously sung this song in past setlists`}
                              >
                                <span>First time for leader</span>
                              </span>
                            )
                          )}
                        </div>
                      }
                      footerSlot={
                        song.transitionNote ? (
                          <p className="text-xs text-brand-brown dark:text-brand-tan/80 italic mt-1 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-brown/40 shrink-0" />
                            {song.transitionNote}
                          </p>
                        ) : null
                      }
                      actionsSlot={
                        <div className="flex items-center gap-1.5">
                          <SongKeySelect
                            onChange={(newKey) => handleKeyChange(index, newKey)}
                            value={song.recommendedKey}
                            songTitle={song.title}
                          />
                          <SongKeyBadge musicalKey={song.originalKey} />
                          <button
                            type="button"
                            aria-label={`Refresh recommendation for ${song.title}`}
                            title="Re-roll this recommendation"
                            disabled={refreshingIndex === index}
                            onClick={() => handleRefreshSong(index)}
                            className="shrink-0 p-1.5 rounded-lg text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <RefreshCcw
                              size={15}
                              className={
                                refreshingIndex === index
                                  ? "animate-spin text-brand-espresso dark:text-brand-cream"
                                  : ""
                              }
                            />
                          </button>
                        </div>
                      }
                    />

                    {/* Subtle harmonic link connector between songs */}
                    {index < proposedSongs.length - 1 && (
                      <div className="flex items-center justify-center -my-1">
                        <div className="h-3 w-[1.5px] bg-brand-brown/20 dark:bg-brand-tan/20" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        {proposedSongs.length > 0 && (
          <div className="p-4 border-t border-brand-brown/20 bg-brand-cream/95 dark:bg-brand-espresso/95 backdrop-blur-md shrink-0">
            {hasExistingSongs ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1 font-semibold"
                  onClick={() => onApplySetlist(proposedSongs, "append")}
                >
                  Append to Setlist
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1 font-semibold"
                  onClick={() => setShowApplyConfirmModal(true)}
                >
                  Replace Setlist
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="w-full font-semibold"
                onClick={() => onApplySetlist(proposedSongs, "replace")}
              >
                Apply Proposed Setlist
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Replace Confirmation Dialog (AC-2, AM-6, MEMORY.md dialog selector rule) */}
      {showApplyConfirmModal && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-brand-espresso/40 backdrop-blur-xs"
            aria-hidden="true"
            onClick={() => setShowApplyConfirmModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-confirm-modal-title"
            className="fixed z-[120] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,26rem)] bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
          >
            <h2
              id="replace-confirm-modal-title"
              className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream"
            >
              Replace Existing Setlist?
            </h2>
            <p className="font-sans text-sm text-brand-brown dark:text-brand-tan">
              Your setlist already has songs. Replacing will remove all existing
              songs and populate it with the {proposedSongs.length} proposed
              songs.
            </p>
            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApplyConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowApplyConfirmModal(false);
                  onApplySetlist(proposedSongs, "append");
                }}
              >
                Append Instead
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowApplyConfirmModal(false);
                  onApplySetlist(proposedSongs, "replace");
                }}
              >
                Replace All
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
