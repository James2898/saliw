import type { Singer } from "../../interface/Singer";

type Props = {
  singer: Singer;
};

const SingersCard = ({ singer }: Props) => {
  return (
    <div
      key={singer.id}
      className="flex  items-center gap-4 py-4 first:pt-0 last:pb-0"
    >
      <img
        src={singer.img}
        alt={singer.name}
        className="w-11 h-11 rounded-2xl object-cover border-2 border-[var(--brand-tan-alpha)] shadow-sm"
      />
      <div>
        <p className="font-bold text-sm">{singer.name}</p>
        <p className="text-[10px] font-bold text-[var(--brand-tan)] uppercase tracking-widest">
          {singer.role}
        </p>
      </div>
    </div>
  );
};

export default SingersCard;
