import * as React from "react";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  List,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  X,
  Edit,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

// --- Types & Interfaces ---
interface Song {
  id: number;
  title: string;
  artist: string;
  key: string; // Original Key
  content: string;
  performanceKey?: string; // Target performance key for this setlist
}

interface Setlist {
  id: number;
  name: string;
  date: string;
  leader: string;
  songs: Song[];
}

// --- Constants & Helpers ---
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

const getNoteIndex = (note: string) => {
  let idx = NOTES.indexOf(note);
  if (idx === -1) {
    const flatMap: Record<string, number> = {
      Ab: 8,
      Bb: 10,
      Db: 1,
      Eb: 3,
      Gb: 6,
    };
    idx = flatMap[note] ?? 0;
  }
  return idx;
};

const calculateTransposeOffset = (fromKey: string, toKey: string) => {
  const fromIdx = getNoteIndex(fromKey);
  const toIdx = getNoteIndex(toKey);
  let diff = toIdx - fromIdx;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
};

const shiftChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  return chord.replace(/[A-G][b#]?/g, (match) => {
    const idx = getNoteIndex(match);
    let newIdx = (idx + semitones) % 12;
    while (newIdx < 0) newIdx += 12;
    return NOTES[newIdx];
  });
};

// --- Mock Data ---
const SONGS: Song[] = [
  {
    id: 1,
    title: "Celebrate Jesus / Jesus is Alive",
    artist: "Don Moen / Ron Kenoly",
    key: "C",
    content: `[INTRO]\n | C | F - G |\n| C | F - G |\n| C | F - G |\n| C | Ab - Bb |\n\n[VERSE]\nC   F    G          C   F - G\nCelebrate Jesus celebrate\nC   F    G          C   Ab - Bb\nCelebrate Jesus celebrate\nC   F    G          C   F - G\nCelebrate Jesus celebrate\nC   F    G          C \nCelebrate Jesus celebrate\n\n[CHORUS]\nG            Am\nHe is risen. He is risen\nG            Am\nAnd He lives forevermore\nG           Am\nHe is risen He is risen\nG    F\nCome on and celebrate\nG              C\nThe resurrection of our Lord`,
  },
  {
    id: 2,
    title: "Worthy is the Lamb",
    artist: "Hillsong Worship",
    key: "G",
    content: `[Intro]\nEm G Em\n\n[Verse 1]\nG                 C           G\nThank you for the cross Lord\n                  C     D   G\nThank you for the price You paid\n               D       Em\nBearing all my sin and shame\n   D        C\nIn love You came\n    Am7  G       D\nAnd gave amazing grace`,
  },
  {
    id: 23,
    title: "Salamat Salamat",
    artist: "Unknown",
    key: "G",
    content: `[Intro]\nG - Bm - Am - D\n\n[Verse]\nG                Bm\nKung aking mamasdan\n          Am\nAng kalawakan\n            D\nHindi ko maunawaan\nG             Bm\nAng Iyong dahilan\n              Am\nKung bakit ako’y\n                D\nPinili Mo’t inalagaan\n\n[Refrain]\nBm                  Em\nHindi ko kayang isipin\n            Bm             Em\nHinding-hindi ko kayang sukatin\nAm               Bm\nAng pag-ibig mo Hesus na\nC                 D\nIyong ibinigay sa akin\n\n[Chorus]\nC           D         Bm               Em\nSalamat, salamat Oh Hesus sa pag-ibig Mo\nAm                  D                 G        Dm - G/B\nWalang ibang nagmahal sa akin na katulad Mo\nC           D         Bm               Em\nSalamat, salamat Oh Hesus sa pag-ibig Mo\nAm              D            G\nAko’y magsasaya sa piling Mo`,
  },
  {
    id: 24,
    title: "Para Sa’Yo",
    artist: "Unknown",
    key: "G",
    content: `[Intro]\nG  D  Em  D\n\n[Verse]\nG           D             Em  D\nAng tinig ko ay para sa’Yo\n      C    D     Em       D\nNilikha upang purihin ka\nG            D             Em  D\nAng buhay ko ay para sa’Yo\n         C  D      Em     C    D\nGamitin Mo - sa kaluwalhatian Mo`,
  },
  {
    id: 25,
    title: "Ikaw Lamang",
    artist: "Unknown",
    key: "G",
    content: `[Verse 1]\nG                     C\nO Diyos sa kabutihan Mo \n            Bm\nAko'y naririto\n               Am       D\nUpang magpuri Sa Iyo \n\n[Verse 2]\n        G               C\nO Diyos, sa kabanalan Mo \n            Bm\nNalulugod ako \n               Am       D\nBuhay ay iaalay ko \n\n[Koro]\nCM7                           D/C\nIkaw lamang ang nagtiwala sa akin \n     Bm                 E7\nO Diyos di kita bibiguin`,
  },
];

const INITIAL_SETLISTS: Setlist[] = [
  {
    id: 12,
    name: "PNW Dharenz",
    date: "2026-04-12",
    leader: "John Doe",
    songs: [
      { ...SONGS[2], performanceKey: "A" },
      { ...SONGS[3], performanceKey: "G" },
      { ...SONGS[4], performanceKey: "Bb" },
    ],
  },
];

const SetlistView = () => {
  const { id } = useParams<{ id: string }>();
  const setlistId = id ? parseInt(id, 10) : 12;

  const initialSetlist = React.useMemo(
    () => INITIAL_SETLISTS.find((s) => s.id === setlistId),
    [setlistId],
  );

  // States
  const [fontSize, setFontSize] = React.useState(16);
  const [activeTranspose, setActiveTranspose] = React.useState(0); // Live adjustment on top of performance key
  const [showChords, setShowChords] = React.useState(true);
  const [isFloatingNavOpen, setIsFloatingNavOpen] = React.useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editedName, setEditedName] = React.useState("");
  const [setlistSongs, setSetlistSongs] = React.useState<Song[]>([]);

  // Initialize
  React.useEffect(() => {
    if (initialSetlist) {
      setEditedName(initialSetlist.name);
      setSetlistSongs(initialSetlist.songs);
    }
  }, [initialSetlist]);

  const updatePerformanceKey = (songId: number, newKey: string) => {
    setSetlistSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, performanceKey: newKey } : s)),
    );
  };

  const scrollToSong = (id: number) => {
    const el = document.getElementById(`song-${id}`);
    if (el) {
      const offset = 100;
      const elementPosition =
        el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
      setIsFloatingNavOpen(false);
    }
  };

  const renderChordText = (song: Song) => {
    const baseKey = song.key;
    const perfKey = song.performanceKey || baseKey;
    const perfOffset = calculateTransposeOffset(baseKey, perfKey);
    const totalOffset = perfOffset + activeTranspose;

    const chordRegex =
      // eslint-disable-next-line no-useless-escape
      /\b([A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|9\-5|9\-9|9\#5|9\#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?(\/[A-G][b#]?(2|4|5|6|7|9|11|13|6\/9|7\-5|7\-9|7\#5|7\#9|7\+5|7\+9|7b5|7b9|9\-5|9\-9|9\#5|9\#9|9\+5|9\+9|b5|maj7|maj9|maj11|maj13|maj|min7|min9|min11|min13|m7|m9|m11|m13|m|add9|add11|add13|sus2|sus4|sus|dim7|dim|aug7|aug|m7b5|m|maj)?)?)(?=\s|$|\)|\-|\n)/g;

    return song.content
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
                    `<span class="chord-item">${shiftChord(match, totalOffset)}</span>`,
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
              <div className="h-px bg-gradient-to-r from-transparent via-[var(--brand-tan)] to-transparent opacity-30 mb-4" />
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

  if (!initialSetlist)
    return <div className="p-20 text-center font-bold">Setlist not found</div>;

  return (
    <div className="min-h-screen bg-[var(--brand-background)] transition-colors duration-300">
      <style>{`
        :root {
          --brand-cream: #FDF8F3;
          --brand-tan: #BC8E5C;
          --brand-brown: #835B43;
          --brand-espresso: #2D1F1B;
          --brand-darker: #1A1210;
          --brand-tan-alpha: rgba(188, 142, 92, 0.15);
          --brand-background: var(--brand-cream);
          --brand-card-bg: #FFFFFF;
        }
        .dark {
          --brand-background: var(--brand-darker);
          --brand-card-bg: var(--brand-espresso);
        }
        .chord-item {
          color: var(--brand-brown);
          background-color: var(--brand-tan-alpha);
          padding: 0 2px;
          font-weight: 700;
          border-radius: 2px;
        }
        .dark .chord-item {
          color: var(--brand-tan);
        }
        .section-title {
          display: block;
          margin: 2rem 0 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.875rem;
          border-left: 4px solid var(--brand-brown);
          padding-left: 1rem;
          color: var(--brand-brown);
        }
        .dark .section-title {
          color: var(--brand-tan);
          border-left-color: var(--brand-tan);
        }
        .chord-display { font-family: 'JetBrains Mono', monospace; line-height: 1.8; white-space: pre; }
      `}</style>

      {/* Top Toolbar */}
      <div className="bg-white dark:bg-[var(--brand-card-bg)] px-4 md:px-8 py-3 border-b border-[var(--brand-tan-alpha)] flex flex-wrap items-center justify-between gap-3 no-print sticky top-0 z-40">
        <button
          onClick={() => window.print()}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--brand-cream)] dark:bg-[var(--brand-espresso)] rounded-xl border border-[var(--brand-tan-alpha)] text-xs font-bold text-[var(--brand-brown)] dark:text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)]"
        >
          <Printer size={16} />
          <span>Print</span>
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
              onClick={() => setActiveTranspose(activeTranspose - 1)}
              className="px-2 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
            >
              LIVE-
            </button>
            <span className="px-1 text-[10px] font-black text-[var(--brand-brown)] dark:text-[var(--brand-tan)] min-w-[30px] text-center">
              {activeTranspose > 0 ? "+" : ""}
              {activeTranspose}
            </span>
            <button
              onClick={() => setActiveTranspose(activeTranspose + 1)}
              className="px-2 py-1 text-[10px] font-black hover:bg-white dark:hover:bg-[var(--brand-brown)] rounded-lg"
            >
              LIVE+
            </button>
            <div className="w-px h-4 bg-[var(--brand-tan)] opacity-30 mx-1" />
            <button
              onClick={() => setActiveTranspose(0)}
              className="p-1.5 text-[var(--brand-tan)] hover:text-[var(--brand-brown)]"
              title="Reset live adjustments"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 md:p-10 lg:p-12">
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex items-center gap-4 group">
            <Link
              to="/setlists"
              className="p-2 -ml-2 text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)] rounded-xl transition-all no-print"
            >
              <ChevronLeft size={28} strokeWidth={3} />
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight">
                {editedName}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)] rounded-full transition-all no-print"
              >
                <Edit size={24} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] px-4 py-2 rounded-full">
              {initialSetlist.leader} • {initialSetlist.date}
            </span>
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => setShowChords(!showChords)}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-xl text-[10px] font-black uppercase shadow-lg transition-all"
              >
                {showChords ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showChords ? "Hide" : "Show"} Chords</span>
              </button>
            </div>
          </div>
        </div>

        <div className="chord-display" style={{ fontSize: `${fontSize}px` }}>
          <div className="space-y-24">
            {setlistSongs.map((song) => (
              <div key={song.id} id={`song-${song.id}`}>
                <div className="mb-8 flex items-baseline gap-4 border-b border-[var(--brand-tan-alpha)] pb-2">
                  <span className="text-3xl font-black">{song.title}</span>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-[var(--brand-brown)] text-white px-2 py-0.5 rounded">
                      KEY: {song.performanceKey || song.key}
                    </span>
                    {song.performanceKey &&
                      song.performanceKey !== song.key && (
                        <span className="text-[10px] font-black border border-[var(--brand-tan)] text-[var(--brand-tan)] px-2 py-0.5 rounded">
                          ORIG: {song.key}
                        </span>
                      )}
                  </div>
                </div>
                <div className="pl-2">{renderChordText(song)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Navigator */}
      <div className="fixed bottom-8 right-8 z-[60] no-print">
        <button
          onClick={() => setIsFloatingNavOpen(!isFloatingNavOpen)}
          className="w-14 h-14 bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all"
        >
          <List size={24} />
        </button>
        {isFloatingNavOpen && (
          <div className="absolute bottom-16 right-0 w-72 bg-white dark:bg-[var(--brand-card-bg)] border-2 border-[var(--brand-tan-alpha)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-[var(--brand-brown)] text-[var(--brand-cream)] flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">
                Jump to Song
              </span>
              <button onClick={() => setIsFloatingNavOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {setlistSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => scrollToSong(song.id)}
                  className="w-full text-left px-4 py-3 text-xs font-bold rounded-xl hover:bg-[var(--brand-tan-alpha)] transition-colors border border-transparent mb-1 truncate"
                >
                  {song.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Setlist Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[var(--brand-card-bg)] w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-[var(--brand-tan-alpha)]">
            <div className="p-8 bg-[var(--brand-brown)] text-[var(--brand-cream)] flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Edit Setlist</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mt-1">
                  Configure your worship session
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-3 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-[var(--brand-tan)] tracking-widest">
                  Setlist Title
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border border-[var(--brand-tan-alpha)] bg-transparent focus:ring-2 focus:ring-[var(--brand-brown)] outline-none font-bold text-lg"
                  placeholder="Enter setlist name..."
                />
              </div>

              {/* Setlist Song List (Only included songs) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-[var(--brand-tan)] tracking-widest">
                    Performance Arrangement
                  </label>
                  <span className="text-[10px] font-black bg-[var(--brand-tan-alpha)] px-3 py-1 rounded-full">
                    {setlistSongs.length} Songs
                  </span>
                </div>

                <div className="space-y-3">
                  {setlistSongs.map((song) => (
                    <div
                      key={song.id}
                      className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-[var(--brand-brown)] bg-[var(--brand-tan-alpha)]/30 transition-all"
                    >
                      <div className="text-left flex-grow mr-4">
                        <p className="font-bold text-base">{song.title}</p>
                        <p className="text-[10px] uppercase font-bold text-[var(--brand-tan)] mt-0.5">
                          {song.artist} • Original: {song.key}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[8px] font-black uppercase opacity-50">
                          Performance Key
                        </label>
                        <select
                          value={song.performanceKey || song.key}
                          onChange={(e) =>
                            updatePerformanceKey(song.id, e.target.value)
                          }
                          className="px-3 py-2 bg-white dark:bg-[var(--brand-darker)] rounded-xl border border-[var(--brand-tan)] text-xs font-black outline-none cursor-pointer focus:ring-2 focus:ring-[var(--brand-brown)]"
                        >
                          {NOTES.map((note) => (
                            <option key={note} value={note}>
                              {note}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-[var(--brand-tan-alpha)] bg-gray-50 dark:bg-black/10 flex justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-10 py-4 bg-[var(--brand-brown)] text-[var(--brand-cream)] rounded-[1.5rem] font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                Done Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetlistView;
