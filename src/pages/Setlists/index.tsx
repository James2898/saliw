import * as React from "react";

import { INITIAL_SETLISTS } from "../../mockData";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
const PAGE_SIZE = 10;

const Setlists = () => {
  const [setlistQuery, setSetlistQuery] = React.useState<string>("");
  const [setlistPage, setSetlistPage] = React.useState(1);
  const filteredSetlists = React.useMemo(
    () =>
      INITIAL_SETLISTS.filter(
        (s) =>
          s.name.toLowerCase().includes(setlistQuery.toLowerCase()) ||
          s.leader.toLowerCase().includes(setlistQuery.toLowerCase()),
      ),
    [setlistQuery],
  );
  return (
    <div className="p-6 md:p-10 lg:p-12">
      <div className="animate-in fade-in duration-500">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black mb-2 tracking-tight">
            Setlist Archive
          </h2>
          <p className="text-[var(--brand-tan)] font-medium">
            Review and organize your service sets.
          </p>
        </div>
        <div className="max-w-2xl mx-auto mb-12 relative px-4 no-print">
          <Search
            className="absolute left-10 top-1/2 -translate-y-1/2 text-[var(--brand-brown)] dark:text-[var(--brand-tan)]"
            size={20}
          />
          <input
            type="text"
            placeholder="Search song titles..."
            value={setlistQuery}
            onChange={(e) => {
              setSetlistQuery(e.target.value);
              setSetlistPage(1);
            }}
            className="w-full pl-16 pr-6 py-4 bg-brand-cream dark:bg-[var(--brand-esprtaesso)]/50 border border-[var(--brand-tan-alpha)] rounded-3xl text-base focus:ring-2 focus:ring-[var(--brand-brown)] outline-none transition-all"
          />
        </div>
        <div className="space-y-3">
          {filteredSetlists
            .slice((setlistPage - 1) * PAGE_SIZE, setlistPage * PAGE_SIZE)
            .map((set) => (
              <div
                key={set.id}
                onClick={() => {}}
                className="group bg-brand-cream/50 dark:bg-[var(--brand-tan)]/10 border border-[var(--brand-tan-alpha)] p-5 rounded-3xl hover:border-[var(--brand-brown)] hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center min-w-0 mr-4 flex-grow">
                  <div className="w-12 h-12 bg-white dark:bg-[var(--brand-darker)] rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 font-black text-[var(--brand-brown)] dark:text-[var(--brand-tan)] group-hover:bg-[var(--brand-brown)] group-hover:text-[var(--brand-cream)] transition-colors">
                    {set.date.split("-")[2]}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="text-sm sm:text-base md:text-2xl font-black truncate">
                      {set.name}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[var(--brand-tan)] uppercase tracking-widest truncate">
                      Leader: {set.leader} • {set.songs.length} Songs
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="text-[var(--brand-brown)] dark:text-[var(--brand-tan)]"
                  size={24}
                />
              </div>
            ))}
          {filteredSetlists.length > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-2 mt-12 py-8 border-t border-[var(--brand-tan-alpha)]">
              <button
                onClick={() => setSetlistPage(Math.max(1, setlistPage - 1))}
                disabled={setlistPage === 1}
                className="p-3 disabled:opacity-20 text-[var(--brand-tan)]"
              >
                <ChevronLeft />
              </button>
              <span className="font-bold text-[var(--brand-tan)]">
                {setlistPage}
              </span>
              <button
                onClick={() =>
                  setSetlistPage(
                    Math.min(
                      Math.ceil(filteredSetlists.length / PAGE_SIZE),
                      setlistPage + 1,
                    ),
                  )
                }
                className="p-3 text-[var(--brand-tan)]"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setlists;
