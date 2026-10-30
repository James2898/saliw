import type { SongTag } from "@/types/Song";

export interface WorshipLeaderSongHistoryItem {
  songId: string;
  title: string;
  artist: string;
  originalKey: string;
  tags: SongTag[];
  performanceKey: string;
  count: number;
  lastSungDate: string;
}

export interface RawHistorySetlistSongRow {
  song_id: string;
  performance_key: string;
  songs: {
    id: string;
    title: string;
    artist: string;
    original_key?: string;
    tags?: SongTag[] | null;
  } | null;
}

export interface RawHistorySetlistRow {
  id: string;
  date: string | null;
  setlist_songs: RawHistorySetlistSongRow[] | null;
}

/**
 * Groups raw past setlist rows into unique (song_id, performance_key) history items,
 * collapsing repeat performances in the same key with a repeat count and latest date
 * (YYYY-MM-DD via slice(0, 10)), and sorting by song title A–Z then newest date first.
 */
export function groupWorshipLeaderSongHistory(
  rows: RawHistorySetlistRow[],
  options?: {
    today?: string;
    excludeSetlistId?: string | null;
  }
): WorshipLeaderSongHistoryItem[] {
  const todayStr = (options?.today ?? new Date().toISOString()).slice(0, 10);
  const excludeId = options?.excludeSetlistId ?? null;

  const grouped = new Map<string, WorshipLeaderSongHistoryItem>();

  for (const setlist of rows) {
    if (!setlist || !setlist.date) continue;
    if (excludeId && setlist.id === excludeId) continue;

    // BUG-018: setlists.date is timestamptz; always extract YYYY-MM-DD via slice(0, 10)
    const dateStr = setlist.date.slice(0, 10);
    if (!dateStr || dateStr >= todayStr) continue;

    const entries = setlist.setlist_songs ?? [];
    for (const entry of entries) {
      if (!entry || !entry.song_id || !entry.performance_key || !entry.songs) {
        continue;
      }

      const key = `${entry.song_id}::${entry.performance_key}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          songId: entry.song_id,
          title: entry.songs.title,
          artist: entry.songs.artist,
          originalKey: entry.songs.original_key ?? entry.performance_key,
          tags: Array.isArray(entry.songs.tags) ? entry.songs.tags : [],
          performanceKey: entry.performance_key,
          count: 1,
          lastSungDate: dateStr,
        });
      } else {
        existing.count += 1;
        if (dateStr > existing.lastSungDate) {
          existing.lastSungDate = dateStr;
        }
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const titleCmp = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    if (titleCmp !== 0) return titleCmp;

    if (a.songId !== b.songId) {
      return a.songId.localeCompare(b.songId);
    }

    const dateCmp = b.lastSungDate.localeCompare(a.lastSungDate);
    if (dateCmp !== 0) return dateCmp;

    return a.performanceKey.localeCompare(b.performanceKey);
  });
}
