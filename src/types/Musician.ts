/**
 * Musician.ts — Frontend-facing types for the musicians and setlist lineup features.
 *
 * For the database-layer types that mirror Supabase columns directly,
 * see DbMusician and DbSetlistMusician in src/types/supabase.ts.
 */

/**
 * Ergonomic frontend type for a musician record.
 * Derived from DbMusician; optional/nullable fields are preserved.
 */
export type Musician = {
  id: string;
  name: string;
  notes: string | null;
};

/**
 * Represents a single entry in a setlist lineup —
 * i.e. a setlist_musicians row with its related musician resolved.
 */
export type SetlistLineupEntry = {
  id: string;
  musician_id: string;
  instrument: string;
  musicians: {
    id: string;
    name: string;
  };
};
