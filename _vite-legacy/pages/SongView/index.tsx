import * as React from "react";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Printer,
  RotateCcw,
} from "lucide-react";

import { NOTES, SONGS } from "../../mockData";
import { Link, useParams } from "react-router-dom";

const SongView = () => {
  const [fontSize, setFontSize] = React.useState(16);
  const [transpose, setTranspose] = React.useState(0);
  const [showChords, setShowChords] = React.useState(true);
  const { id } = useParams<{ id: string }>();
  const songId = id ? parseInt(id, 10) : null;

  const activeSong = React.useMemo(
    () => SONGS.find((s) => s.id === songId),
    [songId],
  );

  const renderChordText = (text: string) => {
    const chordRegex =
      // eslint-disable-next-line no-useless-escape
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
  return (
    <>
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
      <div className="p-6 md:p-10 lg:p-12">
        <div className="animate-in fade-in duration-500">
          <div className="mb-10 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Link
                to="/library"
                className="p-2 -ml-2 text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)] rounded-xl transition-all no-print"
              >
                <ChevronLeft size={28} strokeWidth={3} />
              </Link>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight">
                {activeSong?.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] px-4 py-2 rounded-full">
                {activeSong?.artist}
              </span>
              <div className="flex items-center gap-2 no-print">
                <div className="px-4 py-2 bg-white dark:bg-[var(--brand-espresso)]/30 border border-brand-tan/20 rounded-xl text-[10px] font-black text-brand-tan uppercase">
                  {/* Key: {view === "song" ? activeSong?.key : "VARIOUS"} */}
                  Key: {activeSong?.key}
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
          <div className="chord-display" style={{ fontSize: `${fontSize}px` }}>
            {activeSong && renderChordText(activeSong.content)}
          </div>
        </div>
      </div>
    </>
  );
};

export default SongView;
