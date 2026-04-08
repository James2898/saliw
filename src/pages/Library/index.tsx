import * as React from "react";
import { Search, Music, ChevronRight, ChevronLeft } from "lucide-react";
import { SONGS } from "../../mockData";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

const Library = () => {
  const [libQuery, setLibQuery] = React.useState<string>("");
  const [libPage, setLibPage] = React.useState<number>(1);
  const filteredLibrary = React.useMemo(
    () =>
      SONGS.filter(
        (s) =>
          s.title.toLowerCase().includes(libQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(libQuery.toLowerCase()),
      ),
    [libQuery],
  );

  return (
    <div className="p-6 md:p-10 lg:p-12">
      <div className="animate-in fade-in duration-500">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black mb-2 tracking-tight">
            Song Library
          </h2>
          <p className="text-[var(--brand-tan)] font-medium">
            Browse through your full track collection.
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
            value={libQuery}
            onChange={(e) => {
              setLibQuery(e.target.value);
              setLibPage(1);
            }}
            className="w-full pl-16 pr-6 py-4 bg-brand-cream dark:bg-[var(--brand-esprtaesso)]/50 border border-[var(--brand-tan-alpha)] rounded-3xl text-base focus:ring-2 focus:ring-[var(--brand-brown)] outline-none transition-all"
          />
        </div>
        <div className="space-y-3">
          {filteredLibrary
            .slice((libPage - 1) * PAGE_SIZE, libPage * PAGE_SIZE)
            .map((s) => (
              <Link
                to="/song"
                key={s.id}
                className="group bg-brand-cream/50 dark:bg-[var(--brand-brown)]/40 border border-[var(--brand-brown)] p-5 rounded-3xl hover:border-[var(--brand-tan-alpha)] hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center min-w-0 mr-4 flex-grow">
                  <div className="w-12 h-12 bg-white dark:bg-[var(--brand-brown)] rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 text-[var(--brand-brown)] dark:text-[var(--brand-cream)] group-hover:bg-[var(--brand-tan)] group-hover:text-[var(--brand-cream)] transition-colors">
                    <Music size={24} />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="text-sm sm:text-base md:text-2xl font-black truncate">
                      {s.title}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[var(--brand-tan)] uppercase tracking-widest truncate">
                      {s.artist}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-[var(--brand-brown)] dark:text-[var(--brand-cream)] bg-[var(--brand-tan-alpha)] px-4 py-2 rounded-xl whitespace-nowrap">
                  KEY: {s.key}
                </span>
              </Link>
            ))}
          {filteredLibrary.length > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-2 mt-12 py-8 border-t border-[var(--brand-tan-alpha)]">
              <button
                onClick={() => setLibPage(Math.max(1, libPage - 1))}
                disabled={libPage === 1}
                className="p-3 disabled:opacity-20 text-[var(--brand-tan)]"
              >
                <ChevronLeft />
              </button>
              <span className="font-bold text-[var(--brand-tan)]">
                {libPage}
              </span>
              <button
                onClick={() =>
                  setLibPage(
                    Math.min(
                      Math.ceil(filteredLibrary.length / PAGE_SIZE),
                      libPage + 1,
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

export default Library;
