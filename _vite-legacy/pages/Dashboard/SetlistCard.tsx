import type { Setlist } from "../../interface/Setlist";

type Props = {
  set: Setlist;
};

const SetlistCard = ({ set }: Props) => {
  return (
    <div
      key={set.id}
      onClick={() => () => {}}
      className="group bg-[var(--brand-cream)] dark:bg-[var(--brand-tan)]/10 border border-[var(--brand-tan-alpha)] p-6 rounded-3xl hover:border-[var(--brand-brown)] hover:shadow-xl transition-all cursor-pointer"
    >
      <div className="flex justify-between items-center mb-5">
        <div className="w-11 h-11 bg-[var(--brand-brown)] text-[var(--brand-cream)] dark:text-[var(--brand-cream)] rounded-2xl flex items-center justify-center font-black">
          {set.date.split("-")[2]}
        </div>
        <span className="text-[10px] font-black text-[var(--brand-tan)] uppercase tracking-widest bg-[var(--brand-tan-alpha)] px-3 py-1 rounded-full">
          {set.songs.length} Songs
        </span>
      </div>
      <h4 className="text-lg font-black group-hover:text-[var(--brand-brown)] transition-colors mb-1 truncate">
        {set.name}
      </h4>
      <p className="text-xs font-bold text-[var(--brand-tan)] mb-3">
        {set.leader}
      </p>
      <p className="text-[10px] font-black uppercase text-[var(--brand-tan)] opacity-40 tracking-tighter">
        {set.date}
      </p>
    </div>
  );
};

export default SetlistCard;
