"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import Button from "@/components/client/button";
import SortableSongRow from "./SortableSongRow";
import type { SortableSong } from "./SetlistBuilderClient";

interface SetlistPanelProps {
  songs: SortableSong[];
  onReorder: (newSongs: SortableSong[]) => void;
  onRemove: (songId: string) => void;
  onKeyChange: (songId: string, key: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isSaving: boolean;
}

export default function SetlistPanel({
  songs,
  onReorder,
  onRemove,
  onKeyChange,
  isDirty,
  onSave,
  isSaving,
}: SetlistPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Match by junctionId (persisted) or songId (newly added, junctionId is null)
    const oldIndex = songs.findIndex(
      (s) => (s.junctionId ?? s.songId) === active.id
    );
    const newIndex = songs.findIndex(
      (s) => (s.junctionId ?? s.songId) === over.id
    );
    if (oldIndex === newIndex) return;

    const reordered = arrayMove(songs, oldIndex, newIndex).map((s, i) => ({
      ...s,
      orderIndex: i,
    }));
    onReorder(reordered);
  }

  return (
    <div className="flex flex-col gap-4">
      {songs.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center rounded-xl border border-dashed border-brand-brown bg-brand-cream dark:bg-brand-espresso px-6 py-12 text-center"
        >
          <p className="text-brand-brown dark:text-brand-tan text-sm">
            No songs yet. Add songs from the library.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          id="setlist-dnd"
        >
          <SortableContext
            items={songs.map((s) => s.junctionId ?? s.songId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {songs.map((song) => (
                <SortableSongRow
                  key={song.junctionId ?? song.songId}
                  song={song}
                  onRemove={onRemove}
                  onKeyChange={onKeyChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isDirty && (
        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            aria-label={isSaving ? "Saving setlist" : "Save setlist"}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin mr-2"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
