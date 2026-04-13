import { Music } from "lucide-react";
import type { Song } from "../../interface/Song";

type Props = {
  song: Song;
};

const SongsCard = ({ song }: Props) => {
  return (
    <div
      key={song.id}
      onClick={() => () => {}}
      className="group flex items-center p-4 bg-[var(--brand-cream)] dark:bg-[var(--brand-tan)]/10 border border-[var(--brand-tan-alpha)] rounded-2xl hover:border-[var(--brand-brown)] transition-all cursor-pointer"
    >
      <div className="w-10 h-10 bg-[var(--brand-cream)] dark:bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-xl flex items-center justify-center mr-4 group-hover:bg-[var(--brand-brown)] group-hover:text-[var(--brand-tan)] transition-all">
        <Music size={18} />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold truncate">{song.title}</h4>
        <p className="text-[9px] font-black text-[var(--brand-tan)] uppercase truncate">
          {song.artist}
        </p>
      </div>
    </div>
  );
};

export default SongsCard;
