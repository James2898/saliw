"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import SongCard from "@/components/client/SongCard";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import SongKeySelect from "@/components/SongKey/SongKeySelect";
import type { SortableSong } from "./SetlistBuilderClient";

interface SortableSongRowProps {
  song: SortableSong;
  onRemove: (songId: string) => void;
  onKeyChange: (songId: string, key: string) => void;
}

export default function SortableSongRow({
  song,
  onRemove,
  onKeyChange,
}: SortableSongRowProps) {
  // Use songId as the DnD id when junctionId is null (newly added), otherwise use junctionId
  const dndId = song.junctionId ?? song.songId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SongCard
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "border border-[var(--brand-tan)] shadow-lg shadow-[var(--brand-tan)]/20 z-10"
          : ""
      }
      title={song.title}
      artist={song.artist}
      leftSlot={
        <button
          type="button"
          aria-label={`Drag to reorder ${song.title}`}
          className="touch-none cursor-grab active:cursor-grabbing text-brand-brown/50 dark:text-brand-tan/50 hover:text-brand-brown/80 dark:hover:text-brand-tan/80 transition-colors duration-200 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
      }
      actionsSlot={
        <>
          <SongKeyBadge musicalKey={song.originalKey} />
          <SongKeySelect
            value={song.performanceKey}
            onChange={(newKey) => onKeyChange(song.songId, newKey)}
            songTitle={song.title}
          />
          <button
            type="button"
            aria-label={`Remove ${song.title} from setlist`}
            onClick={() => onRemove(song.songId)}
            className="text-brand-brown/60 dark:text-brand-tan/60 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 shrink-0 text-sm font-medium"
          >
            Remove
          </button>
        </>
      }
    />
  );
}
