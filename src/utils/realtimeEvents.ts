/**
 * Shared Realtime broadcast event name constants.
 *
 * Both Director (sender) and Follower (receiver) import from this file.
 * No inline event name string literals are permitted elsewhere (AC-37).
 */
export const REALTIME_EVENTS = {
  SONG_CHANGE: "SONG_CHANGE",
  KEY_CHANGE: "KEY_CHANGE",
  SECTION_CHANGE: "SECTION_CHANGE",
  SCROLL_SYNC: "SCROLL_SYNC",
  // Aliases conforming to AC-2 naming
  SONG_NAVIGATE: "SONG_CHANGE",
  TRANSPOSE_UPDATE: "KEY_CHANGE",
  AUTOSCROLL_UPDATE: "SCROLL_SYNC",
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/**
 * Payload shape for the SONG_CHANGE broadcast event.
 * Sent by the Director when their active song (IntersectionObserver winner) changes.
 */
export interface SongChangePayload {
  /** setlist_songs.id of the song now active in the Director's viewport */
  junctionId: string;
  /** Millisecond timestamp for monotonic sequence ordering */
  timestamp?: number;
  /** Optional songId or setlist index if available */
  songId?: string;
  setlistIndex?: number;
}

/**
 * Payload shape for the KEY_CHANGE broadcast event.
 * Sent by the Director after `updatePerformanceDetails` resolves successfully.
 */
export interface KeyChangePayload {
  junctionId: string;
  /** The key confirmed by the DB (not an intermediate optimistic value) */
  performanceKey: string;
  /** Millisecond timestamp for monotonic sequence ordering */
  timestamp?: number;
  /** Optional semitones offset or songId */
  songId?: string;
  semitones?: number;
}

/**
 * Payload shape for the SECTION_CHANGE broadcast event.
 * Sent by the Director when jumping to a specific song section.
 */
export interface SectionChangePayload {
  junctionId: string;
  sectionId: string;
  sectionLabel: string;
  sectionIndex?: number;
  timestamp?: number;
}

/**
 * Payload shape for the SCROLL_SYNC broadcast event.
 * Sent by the Director when autoscroll plays/pauses, changes speed, or scrolls.
 */
export interface ScrollSyncPayload {
  junctionId: string;
  isAutoScrolling: boolean;
  speedLevel: number;
  scrollPercentage: number;
  scrollPositionRatio?: number;
  isScrolling?: boolean;
  speedMultiplier?: number;
  timestamp: number;
}

/**
 * Stage presence state tracked via Supabase Realtime Presence.
 */
export interface StagePresenceState {
  sessionId: string;
  deviceId?: string;
  userId: string | null;
  displayName: string;
  role: "director" | "follower" | "solo" | "leader";
  deviceType: "desktop" | "tablet" | "mobile";
  joinedAt: string | number;
}
