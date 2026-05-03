/**
 * Shared Realtime broadcast event name constants.
 *
 * Both Director (sender) and Follower (receiver) import from this file.
 * No inline event name string literals are permitted elsewhere (AC-37).
 */
export const REALTIME_EVENTS = {
  SONG_CHANGE: "SONG_CHANGE",
  KEY_CHANGE: "KEY_CHANGE",
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
}

/**
 * Payload shape for the KEY_CHANGE broadcast event.
 * Sent by the Director after `updatePerformanceDetails` resolves successfully.
 */
export interface KeyChangePayload {
  junctionId: string;
  /** The key confirmed by the DB (not an intermediate optimistic value) */
  performanceKey: string;
}
