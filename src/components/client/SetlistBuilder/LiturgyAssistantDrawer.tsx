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
import { generateSetlistProposalAction } from "@/app/actions/liturgyAgentActions";
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
    <CheckCircle size={16} className="brand-espresso" />
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
}: LiturgyAssistantDrawerProps) {
  const [worshipLeaderId, setWorshipLeaderId] = React.useState<string>(
    currentWorshipLeaderId || ""
  );
  const [joyfulCount, setJoyfulCount] = React.useState<number>(1);
  const [solemnCount, setSolemnCount] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [additionalInstructions, setAdditionalInstructions] =
    React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposedSongs, setProposedSongs] = React.useState<ProposedSong[]>([]);
  const [stepsExecuted, setStepsExecuted] = React.useState<
    LiturgyStepProgress[]
  >([]);

  React.useEffect(() => {
    setTotalCount(joyfulCount + solemnCount);
  }, [joyfulCount, solemnCount]);

  const handleCountChange = (type: "joyful" | "solemn", value: number) => {
    if (value < 0) return; // Prevent negative counts
    if (value > 3) return; // Prevent counts greater than 3
    if (joyfulCount + solemnCount > 6) return; // Prevent total count exceeding 6

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
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/50"
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
          <div className="text-sm text-brand-espresso dark:text-brand-cream flex flex-col gap-1 mt-4">
            <div className="flex items-center gap-2 ">
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
          <div className="text-sm text-brand-espresso dark:text-brand-cream flex flex-col gap-1 mt-4">
            <p className="font-semibold">Additional Instructions</p>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="bg-brand-cream dark:bg-brand-espresso border border-brand-brown/50 w-full h-24 p-2"
              placeholder="e.g., english only, Hillsong artists, high energy opener"
            />
          </div>

          {/* Save Button */}
          <div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={isLoading || totalCount < 1 || totalCount > 6}
              onClick={handleGenerateProposal}
            >
              <Sparkles size={16} className="mr-2 brand-espresso" />
              Generate
            </Button>
          </div>

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
            <div className="p-0">
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
                      actionsSlot={
                        <>
                          <SongKeySelect
                            onChange={() => {}}
                            value={song.recommendedKey}
                          />
                          <SongKeyBadge musicalKey={song.originalKey} />
                          <Button variant="ghost" size="sm" className="p-0">
                            <RefreshCcw size={12} />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
