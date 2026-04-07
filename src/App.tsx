import React, { useState, useEffect, useMemo } from "react";
import {
  Music,
  LayoutDashboard,
  Library,
  ListMusic,
  Moon,
  Sun,
  Menu,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
  Eye,
  EyeOff,
  Edit,
  Search,
  List,
} from "lucide-react";
import "./index.css";

// --- Types & Interfaces ---

type View = "dashboard" | "library" | "setlists" | "song" | "setlist-view";

// --- Mock Data ---
import { NOTES, INITIAL_SETLISTS, SINGERS, SONGS } from "./mockData";

// --- Helpers ---

const shiftChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  return chord.replace(/[A-G][b#]?/g, (match) => {
    let idx = NOTES.indexOf(match);
    if (idx === -1) {
      if (match === "Ab") idx = 8;
      else if (match === "Bb") idx = 10;
      else if (match === "Db") idx = 1;
      else if (match === "Eb") idx = 3;
      else if (match === "Gb") idx = 6;
      else idx = 0;
    }
    let newIdx = (idx + semitones) % 12;
    while (newIdx < 0) newIdx += 12;
    return NOTES[newIdx];
  });
};

const PAGE_SIZE = 10;

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<View>("setlists"); // Starting at setlists per screenshot context
  const [isDark, setIsDark] = useState(true); // Default to dark for contrast check
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [activeSetlistId, setActiveSetlistId] = useState<number | null>(null);

  // Settings
  const [fontSize, setFontSize] = useState(16);
  const [transpose, setTranspose] = useState(0);
  const [showChords, setShowChords] = useState(true);

  // Library/Setlist State
  const [libQuery, setLibQuery] = useState("");
  const [setlistQuery, setSetlistQuery] = useState("");
  const [libPage, setLibPage] = useState(1);
  const [setlistPage, setSetlistPage] = useState(1);
  const [isFloatingNavOpen, setIsFloatingNavOpen] = useState(false);

  // Sync dark mode class
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // View Navigation Helpers
  const goToDashboard = () => {
    setView("dashboard");
    window.scrollTo(0, 0);
  };
  const goToLibrary = () => {
    setView("library");
    setLibPage(1);
    window.scrollTo(0, 0);
  };
  const goToSetlists = () => {
    setView("setlists");
    setSetlistPage(1);
    window.scrollTo(0, 0);
  };
  const goToSong = (id: number) => {
    setActiveSongId(id);
    setTranspose(0);
    setView("song");
    window.scrollTo(0, 0);
  };
  const goToSetlistView = (id: number) => {
    setActiveSetlistId(id);
    setView("setlist-view");
    window.scrollTo(0, 0);
  };

  // Data Selectors
  const filteredLibrary = useMemo(
    () =>
      SONGS.filter(
        (s) =>
          s.title.toLowerCase().includes(libQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(libQuery.toLowerCase()),
      ),
    [libQuery],
  );

  const filteredSetlists = useMemo(
    () =>
      INITIAL_SETLISTS.filter(
        (s) =>
          s.name.toLowerCase().includes(setlistQuery.toLowerCase()) ||
          s.leader.toLowerCase().includes(setlistQuery.toLowerCase()),
      ),
    [setlistQuery],
  );

  const activeSong = useMemo(
    () => SONGS.find((s) => s.id === activeSongId),
    [activeSongId],
  );
  const activeSetlist = useMemo(
    () => INITIAL_SETLISTS.find((s) => s.id === activeSetlistId),
    [activeSetlistId],
  );

  // Transposition logic
  const renderChordText = (text: string) => {
    const chordRegex =
      /\b([A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|9\-5|9\-9|9\#5|9\#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?(\/[A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|9\-5|9\-9|9\#5|9\#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?)?)(?=\s|$|\)|\-|\n)/g;

    return text
      .split("\n")
      .map((line, idx) => {
        const chordMatches = line.match(
          /\b[A-G][b#]?(m|maj|dim|aug|sus|add|7|9|11|13)?(\/[A-G][b#]?)?\b/g,
        );
        const isChordLine =
          chordMatches && chordMatches.length > 0 && line.trim().length < 80;

        if (isChordLine) {
          if (!showChords) return null;
          return (
            <div
              key={idx}
              dangerouslySetInnerHTML={{
                __html: line.replace(
                  chordRegex,
                  (match) =>
                    `<span class="chord-item">${shiftChord(match, transpose)}</span>`,
                ),
              }}
            />
          );
        }

        if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
          return (
            <span key={idx} className="section-title">
              {line}
            </span>
          );
        }

        if (line.trim().startsWith("---")) {
          return (
            <div key={idx} className="mt-16 mb-8">
              <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-brand-tan)] to-transparent opacity-30 mb-4" />
              <span className="inline-block bg-[var(--brand-espresso)] dark:bg-[var(--brand-tan)] text-[var(--brand-cream)] dark:text-[var(--brand-espresso)] px-3 py-1 rounded-md text-xs font-bold">
                {line.replace("---", "")}
              </span>
            </div>
          );
        }

        return <div key={idx}>{line || "\u00A0"}</div>;
      })
      .filter((line) => line !== null);
  };

  const scrollToSong = (id: number) => {
    const el = document.getElementById(`song-${id}`);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setIsFloatingNavOpen(false);
    }
  };

  const NavItem = ({ active, onClick, label, icon: Icon }: any) => (
    <button
      onClick={() => {
        onClick();
        setIsSidebarOpen(false);
      }}
      className={`flex items-center space-x-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
        active
          ? "bg-[var(--brand-brown)] text-[var(--brand-cream)] shadow-lg shadow-brand-brown/30 dark:bg-[var(--brand-tan)] dark:text-[var(--brand-darker)] dark:shadow-brand-tan/20"
          : "text-[var(--brand-brown)] dark:text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)]"
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? "dark" : ""}`}
    >
      {/* Injecting CSS here to solve the "Could not resolve index.css" error 
        while maintaining the single-file React requirement.
      */}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 no-print border-b-2 border-[var(--color-brand-tan-alpha)] bg-white dark:bg-[var(--color-brand-background)] dark:border-[var(--brand-brown)] shadow-sm px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-10">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-[var(--brand-brown)] dark:text-[var(--brand-tan)]"
            >
              <Menu size={24} />
            </button>
            <div
              onClick={goToDashboard}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-9 h-9 bg-[var(--brand-brown)] rounded-lg flex items-center justify-center shadow-lg shadow-brand-brown/20 group-hover:scale-105 transition-transform">
                <Music className="text-[var(--brand-cream)]" size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter">Saliw</span>
            </div>
            <div className="hidden md:flex space-x-1">
              <NavItem
                active={view === "dashboard"}
                onClick={goToDashboard}
                label="Dashboard"
                icon={LayoutDashboard}
              />
              <NavItem
                active={view === "setlists"}
                onClick={goToSetlists}
                label="Setlists"
                icon={ListMusic}
              />
              <NavItem
                active={view === "library"}
                onClick={goToLibrary}
                label="Library"
                icon={Library}
              />
            </div>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-xl hover:bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] transition-all"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-[60] no-print transition-all duration-300 md:hidden ${isSidebarOpen ? "visible" : "invisible opacity-0"}`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-4/5 max-w-xs bg-[var(--brand-cream)] dark:bg-[var(--brand-background)] p-6 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[var(--brand-brown)] rounded-lg flex items-center justify-center">
                <Music className="text-[var(--brand-cream)]" size={16} />
              </div>
              <span className="font-bold text-lg">Saliw</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-[var(--brand-tan)]"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col space-y-2">
            <NavItem
              active={view === "dashboard"}
              onClick={goToDashboard}
              label="Dashboard"
              icon={LayoutDashboard}
            />
            <NavItem
              active={view === "setlists"}
              onClick={goToSetlists}
              label="Setlists"
              icon={ListMusic}
            />
            <NavItem
              active={view === "library"}
              onClick={goToLibrary}
              label="Library"
              icon={Library}
            />
          </div>
        </aside>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Container for content - logic for dark mode background contrast happens here */}
        <div className="main-card rounded-3xl border-2 shadow-2xl shadow-black/40 overflow-hidden">
          {(view === "song" || view === "setlist-view") && (
            <div className="bg-white dark:bg-[var(--brand-card-bg)] px-4 md:px-8 py-3 border-b border-[var(--brand-tan-alpha)] flex flex-wrap items-center justify-between gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)] rounded-xl border border-[var(--brand-tan-alpha)] text-xs font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)]"
              >
                <Printer size={16} />
                <span>Print View</span>
              </button>

              <div className="flex gap-3">
                <div className="flex items-center bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)] rounded-xl p-1 border border-[var(--brand-tan-alpha)]">
                  <button
                    onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                    className="p-1.5 hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-2 text-[10px] font-black text-[var(--brand-tan)] uppercase w-12 text-center">
                    {fontSize}px
                  </span>
                  <button
                    onClick={() => setFontSize(Math.min(48, fontSize + 2))}
                    className="p-1.5 hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex items-center bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)] rounded-xl p-1 border border-[var(--brand-tan-alpha)]">
                  <button
                    onClick={() => setTranspose(transpose - 1)}
                    className="px-2 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
                  >
                    KEY-
                  </button>
                  <span className="px-1 text-[10px] font-black text-[var(--brand-brown)] dark:text-[var(--brand-tan)] min-w-[30px] text-center">
                    {transpose > 0 ? "+" : ""}
                    {transpose}
                  </span>
                  <button
                    onClick={() => setTranspose(transpose + 1)}
                    className="px-2 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
                  >
                    KEY+
                  </button>
                  <div className="w-px h-4 bg-[var(--brand-tan)] opacity-30 mx-1" />
                  <button
                    onClick={() => setTranspose(0)}
                    className="p-1.5 text-[var(--brand-tan)] hover:text-[var(--brand-brown)]"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 md:p-10 lg:p-12">
            {view === "dashboard" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-12">
                  <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight tracking-tight">
                    Hello there! Musician
                  </h1>
                  <p className="text-[var(--brand-tan)] font-medium max-w-2xl">
                    Saliw (sa·líw) — to play music in harmony or accompaniment.
                    Here is your worship dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] flex items-center gap-2">
                      <ListMusic size={20} /> Upcoming Setlists
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {INITIAL_SETLISTS.slice(0, 4).map((set) => (
                        <div
                          key={set.id}
                          onClick={() => goToSetlistView(set.id)}
                          className="group bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)]/40 border border-[var(--brand-tan-alpha)] p-6 rounded-3xl hover:border-[var(--brand-brown)] hover:shadow-xl transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-5">
                            <div className="w-11 h-11 bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] rounded-2xl flex items-center justify-center font-black">
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
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] flex items-center gap-2">
                      <Music size={20} /> Team Singers
                    </h3>
                    <div className="bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)]/40 rounded-3xl p-6 border border-[var(--brand-tan-alpha)] divide-y divide-[var(--brand-tan-alpha)]">
                      {SINGERS.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                        >
                          <img
                            src={s.img}
                            alt={s.name}
                            className="w-11 h-11 rounded-2xl object-cover border-2 border-[var(--brand-tan-alpha)] shadow-sm"
                          />
                          <div>
                            <p className="font-bold text-sm">{s.name}</p>
                            <p className="text-[10px] font-bold text-[var(--brand-tan)] uppercase tracking-widest">
                              {s.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] mb-6 flex items-center gap-2">
                    <Library size={20} /> Quick Access Library
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SONGS.slice(-6)
                      .reverse()
                      .map((s) => (
                        <div
                          key={s.id}
                          onClick={() => goToSong(s.id)}
                          className="group flex items-center p-4 bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)]/40 border border-[var(--brand-tan-alpha)] rounded-2xl hover:border-[var(--brand-brown)] transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-[var(--brand-cream)] dark:bg-[var(--brand-darker)] text-[var(--brand-tan)] rounded-xl flex items-center justify-center mr-4 group-hover:bg-[var(--brand-brown)] group-hover:text-[var(--brand-cream)] transition-all">
                            <Music size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold truncate">
                              {s.title}
                            </h4>
                            <p className="text-[9px] font-black text-[var(--brand-tan)] uppercase truncate">
                              {s.artist}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {view === "library" && (
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
                    className="w-full pl-16 pr-6 py-4 bg-brand-cream dark:bg-[var(--brand-espresso)]/50 border border-[var(--brand-tan-alpha)] rounded-3xl text-base focus:ring-2 focus:ring-[var(--brand-brown)] outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  {filteredLibrary
                    .slice((libPage - 1) * PAGE_SIZE, libPage * PAGE_SIZE)
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => goToSong(s.id)}
                        className="group bg-brand-cream/50 dark:bg-[var(--brand-espresso)]/40 border border-[var(--brand-tan-alpha)] p-5 rounded-3xl hover:border-[var(--brand-brown)] hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center min-w-0 mr-4 flex-grow">
                          <div className="w-12 h-12 bg-white dark:bg-[var(--brand-darker)] rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 text-[var(--brand-brown)] dark:text-[var(--brand-tan)] group-hover:bg-[var(--brand-brown)] group-hover:text-[var(--brand-cream)] transition-colors">
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
                        <span className="text-[10px] font-black text-[var(--brand-brown)] dark:text-[var(--brand-tan)] bg-[var(--brand-tan-alpha)] px-4 py-2 rounded-xl whitespace-nowrap">
                          KEY: {s.key}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {view === "setlists" && (
              <div className="animate-in fade-in duration-500">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-black mb-2 tracking-tight">
                    Setlist Archive
                  </h2>
                  <p className="text-[var(--brand-tan)] font-medium">
                    Review and organize your service sets.
                  </p>
                </div>
                <div className="space-y-3">
                  {filteredSetlists
                    .slice(
                      (setlistPage - 1) * PAGE_SIZE,
                      setlistPage * PAGE_SIZE,
                    )
                    .map((set) => (
                      <div
                        key={set.id}
                        onClick={() => goToSetlistView(set.id)}
                        className="group bg-brand-cream/50 dark:bg-[var(--brand-espresso)]/40 border border-[var(--brand-tan-alpha)] p-5 rounded-3xl hover:border-[var(--brand-brown)] hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
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
                </div>
              </div>
            )}

            {(view === "song" || view === "setlist-view") && (
              <div className="animate-in fade-in duration-500">
                <div className="mb-10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={view === "song" ? goToLibrary : goToSetlists}
                      className="p-2 -ml-2 text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)] rounded-xl transition-all no-print"
                    >
                      <ChevronLeft size={28} strokeWidth={3} />
                    </button>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight">
                      {view === "song"
                        ? activeSong?.title
                        : activeSetlist?.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] px-4 py-2 rounded-full">
                      {view === "song"
                        ? activeSong?.artist
                        : `${activeSetlist?.leader} • ${activeSetlist?.date}`}
                    </span>
                    <div className="flex items-center gap-2 no-print">
                      <div className="px-4 py-2 bg-white dark:bg-[var(--brand-espresso)]/30 border border-brand-tan/20 rounded-xl text-[10px] font-black text-brand-tan uppercase">
                        Key: {view === "song" ? activeSong?.key : "VARIOUS"}
                      </div>
                      <button
                        onClick={() => setShowChords(!showChords)}
                        className="flex items-center gap-2 px-5 py-2 bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-xl text-[10px] font-black uppercase shadow-lg shadow-brand-brown/20 transition-all"
                      >
                        {showChords ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{showChords ? "Hide" : "Show"} Chords</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  className="chord-display"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {view === "song" &&
                    activeSong &&
                    renderChordText(activeSong.content)}
                  {view === "setlist-view" && activeSetlist && (
                    <div className="space-y-16">
                      {activeSetlist.songs.map((song) => (
                        <div key={song.id} id={`song-${song.id}`}>
                          <div className="mb-8 flex items-baseline gap-4">
                            <span className="text-2xl font-black">
                              {song.title}
                            </span>
                            <span className="text-[10px] font-black text-[var(--brand-tan)] bg-[var(--brand-tan-alpha)] px-2 py-0.5 rounded">
                              KEY: {song.key}
                            </span>
                          </div>
                          {renderChordText(song.content)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-20 py-12 text-center border-t border-[var(--brand-tan-alpha)] no-print">
          <p className="text-xs font-black text-[var(--brand-tan)] uppercase tracking-[0.2em] mb-3">
            Saliw Music Portal
          </p>
          <p className="text-[10px] text-[var(--brand-tan)] opacity-60 font-bold">
            &copy; 2026 Codename Redeemed Arrangement.
          </p>
        </footer>
      </main>

      {view === "setlist-view" && activeSetlist && (
        <div className="fixed bottom-8 right-8 z-[60] no-print">
          <button
            onClick={() => setIsFloatingNavOpen(!isFloatingNavOpen)}
            className="w-14 h-14 bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all"
          >
            <List size={24} />
          </button>
          {isFloatingNavOpen && (
            <div className="absolute bottom-16 right-0 w-64 bg-white dark:bg-[var(--brand-card-bg)] border-2 border-[var(--brand-tan-alpha)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-[var(--brand-brown)] text-[var(--brand-cream)] flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Navigation
                </span>
                <button onClick={() => setIsFloatingNavOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {activeSetlist.songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => scrollToSong(song.id)}
                    className="w-full text-left px-4 py-3 text-xs font-bold rounded-xl hover:bg-[var(--brand-tan-alpha)] transition-colors border border-transparent hover:border-[var(--brand-tan-alpha)] mb-1"
                  >
                    {song.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
