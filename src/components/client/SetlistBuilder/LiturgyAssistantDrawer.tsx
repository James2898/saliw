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
  PlusIcon,
  MinusIcon,
  CheckCircle,
  Circle,
  RefreshCcw,
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
}

interface ButtonCountProps {
  type: "joyful" | "solemn";
  solemnCount: number;
  joyfulCount: number;
  handleCountChange: (type: "joyful" | "solemn", value: number) => void;
}

const ButtonCount = ({
  type,
  solemnCount,
  joyfulCount,
  handleCountChange,
}: ButtonCountProps) => {
  return (
    <>
      <Button
        className="p-0"
        variant="ghost"
        size="sm"
        onClick={() =>
          handleCountChange(
            type,
            Math.min(3, (type === "joyful" ? joyfulCount : solemnCount) + 1)
          )
        }
        disabled={(type === "joyful" ? joyfulCount : solemnCount) === 3}
      >
        <PlusIcon size={14} absoluteStrokeWidth={true} />
      </Button>
      <Button
        className="p-0"
        variant="ghost"
        size="sm"
        onClick={() =>
          handleCountChange(
            type,
            Math.max(0, (type === "joyful" ? joyfulCount : solemnCount) - 1)
          )
        }
        disabled={(type === "joyful" ? joyfulCount : solemnCount) === 0}
      >
        <MinusIcon size={14} absoluteStrokeWidth={true} />
      </Button>
    </>
  );
};

const StatusIcon = ({ status }: { status: "completed" | "skipped" }) => {
  return status === "completed" ? (
    <CheckCircle size={16} className="text-brand-espresso" />
  ) : (
    <Circle size={16} className="text-brand-brown/50" />
  );
};

export default function LiturgyAssistantDrawer({
  isOpen,
  onClose,
  allMusicians,
  currentWorshipLeaderId,
  onApplySetlist,
  hasExistingSongs,
  existingSongIds = [],
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

  const handleCountChange = (type: "joyful" | "solemn", value: number) => {
    if (value < 0) return;
    if (value > 3) return;

    if (type === "joyful") {
      setJoyfulCount(value);
    } else {
      setSolemnCount(value);
    }
  };

  const handleGenerateProposal = async () => {
    setProposedSongs([]);
    setStepsExecuted([]);
    setIsLoading(true);
    setError(null);
    setRefreshError(null);

    try {
      const response: LiturgyAgentResponse =
        await generateSetlistProposalAction({
          worshipLeaderId: worshipLeaderId || null,
          joyfulCount,
          solemnCount,
          additionalInstructions,
        });

      if (!response.success) {
        setError(response.error || "An unknown error occurred.");
        setIsLoading(false);
        return;
      }

      setProposedSongs(response.proposedSongs);
      setStepsExecuted(response.stepsExecuted);
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-brand-espresso/40"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="fixed inset-y-0 z-[100] right-0 w-full max-w-md bg-brand-cream dark:bg-brand-espresso border-l border-brand-brown/50">
        {/* Drawer header */}
        <div className="flex items-center justify-between p-2 border-b border-brand-brown/40">
          <div className="flex items-center gap-2">
            <Sparkles />
            <h2 className="font-sans text-lg text-brand-espresso dark:text-brand-cream">
              Liturgy Assistant
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-0 border-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Drawer body */}
        <div className="p-4 h-full overflow-y-auto flex flex-col gap-4">
          {/* Worship Leader Selection */}
          <div className="text-sm text-brand-espresso dark:text-brand-cream flex flex-col gap-1">
            <p className="font-semibold">Worship Leader</p>
            <select
              value={worshipLeaderId}
              onChange={(e) => setWorshipLeaderId(e.target.value)}
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/50 rounded-lg p-2 text-sm"
            >
              <option value="">No Specific Worship Leader</option>
              {allMusicians.map((musician) => (
                <option key={musician.id} value={musician.id}>
                  {musician.name}
                </option>
              ))}
            </select>
          </div>

          {/* Counters */}
          <div className="text-sm text-brand-espresso dark:text-brand-cream flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <p className="font-semibold">Joyful: {joyfulCount}</p>
                <ButtonCount
                  type="joyful"
                  solemnCount={solemnCount}
                  joyfulCount={joyfulCount}
                  handleCountChange={handleCountChange}
                />
              </div>
              <div className="flex items-center gap-1">
                <p className="font-semibold">Solemn: {solemnCount}</p>
                <ButtonCount
                  type="solemn"
                  solemnCount={solemnCount}
                  joyfulCount={joyfulCount}
                  handleCountChange={handleCountChange}
                />
              </div>
            </div>
          </div>

          {/* Additional Instructions */}
          <div className="text-sm text-brand-espresso dark:text-brand-cream flex flex-col gap-1 mt-2">
            <p className="font-semibold">Additional Instructions</p>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/50 rounded-lg w-full h-24 p-2 text-sm"
              placeholder="e.g., english only, Hillsong artists, high energy opener"
            />
          </div>

          {/* Generate Button */}
          <div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={isLoading || totalCount < 1 || totalCount > 6}
              onClick={handleGenerateProposal}
            >
              <Sparkles size={16} className="mr-2 text-brand-espresso" />
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-lg p-3 text-xs text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {/* Single-song refresh error (AC-10) */}
          {refreshError && (
            <div
              role="alert"
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/30 rounded-lg p-2.5 flex items-center justify-between text-xs text-brand-espresso dark:text-brand-cream"
            >
              <span>{refreshError}</span>
              <button
                type="button"
                onClick={() => setRefreshError(null)}
                className="ml-2 text-brand-brown/60 hover:text-brand-espresso dark:hover:text-brand-cream"
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Steps Executed */}
          {stepsExecuted.length > 0 && (
            <div className="p-0">
              <div className="text-sm text-brand-espresso dark:text-brand-cream">
                {stepsExecuted.map((step, index) => (
                  <ul
                    key={index}
                    className="mb-2 list-disc list-inside flex flex-col gap-1"
                  >
                    <li className="font-semibold flex items-center gap-2">
                      {step.detail} <StatusIcon status={step.status} />
                    </li>
                  </ul>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Songs */}
          {proposedSongs.length > 0 && (
            <div className="p-0 pb-12">
              <div className="text-sm text-brand-espresso dark:text-brand-cream">
                <h2 className="font-bold mb-2 text-lg">Proposed Songs</h2>
                <div className="flex flex-col gap-2">
                  {proposedSongs.map((song, index) => (
                    <SongCard
                      key={index}
                      title={song.title}
                      artist={song.artist}
                      className="p-2"
                      badgeSlot={
                        song.tag ? (
                          <SongTagBadge tag={song.tag} size="sm" />
                        ) : null
                      }
                      footerSlot={
                        song.transitionNote ? (
                          <p className="text-xs text-brand-brown dark:text-brand-tan/80 italic mt-1">
                            {song.transitionNote}
                          </p>
                        ) : null
                      }
                      actionsSlot={
                        <>
                          <SongKeySelect
                            onChange={(newKey) =>
                              handleKeyChange(index, newKey)
                            }
                            value={song.recommendedKey}
                          />
                          <SongKeyBadge musicalKey={song.originalKey} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7 text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream"
                            aria-label={`Refresh recommendation for ${song.title}`}
                            disabled={refreshingIndex === index}
                            onClick={() => handleRefreshSong(index)}
                          >
                            <RefreshCcw
                              size={14}
                              className={
                                refreshingIndex === index
                                  ? "animate-spin text-brand-espresso dark:text-brand-cream"
                                  : ""
                              }
                            />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>

                {/* Apply Buttons — replace vs append selection (AC-1, AC-2, AC-3) */}
                {hasExistingSongs ? (
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={() => onApplySetlist(proposedSongs, "append")}
                    >
                      Append to Setlist
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={() => setShowApplyConfirmModal(true)}
                    >
                      Replace Setlist
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full"
                      onClick={() => onApplySetlist(proposedSongs, "replace")}
                    >
                      Apply Proposed Setlist
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replace Confirmation Dialog (AC-2, AM-6, MEMORY.md dialog selector rule) */}
      {showApplyConfirmModal && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-brand-espresso/40"
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
