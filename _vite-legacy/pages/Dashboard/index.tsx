import { ListMusic, Library, Music } from "lucide-react";
import { INITIAL_SETLISTS, SINGERS, SONGS } from "../../mockData";
import SetlistCard from "./SetlistCard";
import SingersCard from "./SingersCard";
import SongsCard from "./SongsCard";

const Dashboard = () => {
  return (
    <div className="p-6 md:p-10 lg:p-12 ">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight tracking-tight">
            Hello there! Welcome to Saliw.
          </h1>
          <p className="text-[var(--brand-tan)] font-medium max-w-2xl">
            Saliw (sa·líw) — to play music in harmony or accompaniment. Here is
            your worship dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] flex items-center gap-2">
              <ListMusic size={20} /> Upcoming Setlists
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {INITIAL_SETLISTS.slice(0, 4).map((set) => (
                <SetlistCard set={set} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] flex items-center gap-2">
              <Music size={20} /> Team Singers
            </h3>
            <div className="bg-[var(--brand-cream)] dark:bg-[var(--brand-tan)]/10 rounded-3xl p-6 border border-[var(--brand-tan-alpha)] divide-y divide-[var(--brand-tan-alpha)]">
              {SINGERS.map((s) => (
                <SingersCard singer={s} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-[var(--brand-tan)] dark:text-[var(--brand-brown)] mb-6 flex items-center gap-2">
            <Library size={20} /> Quick Access Library
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SONGS.slice(-6)
              .reverse()
              .map((s) => (
                <SongsCard song={s} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
