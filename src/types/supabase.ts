/**
 * supabase.ts — Database-layer types for Saliw Music Portal.
 *
 * These types mirror the exact column names and types in the Supabase/PostgreSQL schema.
 * Use these types in Server Actions and data-fetching code.
 *
 * For frontend-facing types with ergonomic field names, see Song.ts and Setlist.ts.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Mirrors the public.songs table.
 */
export type DbSong = {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  content: string;
  created_by: string | null;
  singer: string | null;
  youtube_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

/**
 * Mirrors the public.setlists table.
 */
export type DbSetlist = {
  id: string;
  name: string;
  date: string | null;
  leader_id: string;
  worship_leader_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Mirrors the public.setlist_songs junction table.
 */
export type DbSetlistSong = {
  id: string;
  setlist_id: string;
  song_id: string;
  order_index: number;
  performance_key: string;
};

/**
 * Mirrors the public.musicians table.
 */
export type DbMusician = {
  id: string;
  name: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Mirrors the public.setlist_musicians junction table.
 */
export type DbSetlistMusician = {
  id: string;
  setlist_id: string;
  musician_id: string;
  instrument: string;
  created_at: string;
  updated_at: string;
};

/**
 * Mirrors the public.profiles table.
 */
export type DbProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

/**
 * Canonical Supabase Database interface for client parameterization.
 * Compatible with @supabase/supabase-js GenericSchema / GenericTable layout.
 */
export interface Database {
  public: {
    Tables: {
      songs: {
        Row: DbSong;
        Insert: {
          id?: string;
          title: string;
          artist: string;
          original_key: string;
          content: string;
          created_by?: string | null;
          singer?: string | null;
          youtube_url?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DbSong>;
        Relationships: [];
      };
      setlists: {
        Row: DbSetlist;
        Insert: {
          id?: string;
          name: string;
          date?: string | null;
          leader_id: string;
          worship_leader_id?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DbSetlist>;
        Relationships: [];
      };
      setlist_songs: {
        Row: DbSetlistSong;
        Insert: {
          id?: string;
          setlist_id: string;
          song_id: string;
          order_index: number;
          performance_key: string;
        };
        Update: Partial<DbSetlistSong>;
        Relationships: [];
      };
      musicians: {
        Row: DbMusician;
        Insert: {
          id?: string;
          name: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DbMusician>;
        Relationships: [];
      };
      setlist_musicians: {
        Row: DbSetlistMusician;
        Insert: {
          id?: string;
          setlist_id: string;
          musician_id: string;
          instrument: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DbSetlistMusician>;
        Relationships: [];
      };
      profiles: {
        Row: DbProfile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
        };
        Update: Partial<DbProfile>;
        Relationships: [];
      };
    };
    Views: {
      public_musicians: {
        Row: {
          id: string;
          name: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      reorder_setlist_songs: {
        Args: {
          p_setlist_id: string;
          p_song_orders: Json;
        };
        Returns: void;
      };
      is_music_director: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
