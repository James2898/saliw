import type { Song } from "./Song";

export type Setlist = {
  id: number;
  name: string;
  date: string;
  leader: string;
  songs: Song[];
};
