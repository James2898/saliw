/**
 * chordLibrary.ts — Static chord fingering data for guitar and piano.
 *
 * Zero async, zero fetch, zero Supabase imports.
 * All data is plain module-level constants (BUG-019: stable array refs).
 *
 * Guitar string array convention:
 *   Index 0 = low E (string 6), index 5 = high e (string 1)
 *   -1 = muted, 0 = open, N = fret number
 *
 * Piano key indices:
 *   whiteKeyIndices: 0–13 across 14 white keys (C D E F G A B C D E F G A B)
 *   blackKeyIndices: 0–9 across 10 black keys
 *     Black key layout (position after white key index):
 *     0=C#, 1=D#, 2=F#, 3=G#, 4=A# (octave 1)
 *     5=C#, 6=D#, 7=F#, 8=G#, 9=A# (octave 2)
 */

export interface GuitarFingering {
  /** Fret numbers for each string [low E, A, D, G, B, high e]. -1 = muted, 0 = open. */
  strings: [number, number, number, number, number, number];
  /** Optional finger label per string (e.g. "1", "2", "3", "4"). */
  fingers?: string[];
  /** Capo fret offset. 0 = no capo. Shown as "Nfr" label on the SVG when > 0. */
  capoOffset: number;
}

export interface PianoFingering {
  /** Indices of highlighted white keys (0–13). */
  whiteKeyIndices: number[];
  /** Indices of highlighted black keys (0–9). */
  blackKeyIndices: number[];
}

export type ChordRegistry = Record<
  string,
  { guitar: GuitarFingering; piano: PianoFingering }
>;

/**
 * Registry of standard open-position chord fingerings for common worship chords.
 * Declared at module scope for stable reference (BUG-019).
 */
export const CHORD_REGISTRY: ChordRegistry = {
  C: {
    guitar: {
      strings: [-1, 3, 2, 0, 1, 0],
      fingers: ["x", "3", "2", "0", "1", "0"],
      capoOffset: 0,
    },
    piano: {
      // C E G  (white keys 0, 2, 4)
      whiteKeyIndices: [0, 2, 4],
      blackKeyIndices: [],
    },
  },

  "C/E": {
    guitar: {
      // C/E: E in bass (string 6 open), then C shape — x32010 but with open low E
      // Standard approach: 0 3 2 0 1 0 (low E open = E note, bass note for C/E)
      strings: [0, 3, 2, 0, 1, 0],
      fingers: ["0", "3", "2", "0", "1", "0"],
      capoOffset: 0,
    },
    piano: {
      // C/E: E C E G — highlight E as bass, C E G chord tones (white keys 2, 0, 2, 4)
      // Simplified to unique keys: E=2, C=0, G=4
      whiteKeyIndices: [0, 2, 4],
      blackKeyIndices: [],
    },
  },

  G: {
    guitar: {
      // Standard open G: 3 2 0 0 0 3
      strings: [3, 2, 0, 0, 0, 3],
      fingers: ["3", "2", "0", "0", "0", "4"],
      capoOffset: 0,
    },
    piano: {
      // G B D  (white keys 4, 6, 1 of octave 2 = index 8)
      whiteKeyIndices: [4, 6, 8],
      blackKeyIndices: [],
    },
  },

  "G/B": {
    guitar: {
      // G/B: B in bass — string 5 (A string) fret 2 = B note, then G shape
      // x 2 0 0 0 3
      strings: [-1, 2, 0, 0, 0, 3],
      fingers: ["x", "2", "0", "0", "0", "4"],
      capoOffset: 0,
    },
    piano: {
      // G/B: B G B D — B bass + G B D chord (white keys 6, 4, 6, 8)
      // Unique: B=6, G=4, D=8 (D in second octave)
      whiteKeyIndices: [4, 6, 8],
      blackKeyIndices: [],
    },
  },

  D: {
    guitar: {
      // Standard open D: x x 0 2 3 2
      strings: [-1, -1, 0, 2, 3, 2],
      fingers: ["x", "x", "0", "1", "3", "2"],
      capoOffset: 0,
    },
    piano: {
      // D F# A  (white keys 1, 3, 5)  F# = black key index 2
      whiteKeyIndices: [1, 5],
      blackKeyIndices: [2],
    },
  },

  "D/F#": {
    guitar: {
      // D/F#: F# in bass — fret 2 on low E string
      // 2 x 0 2 3 2
      strings: [2, -1, 0, 2, 3, 2],
      fingers: ["2", "x", "0", "1", "3", "2"],
      capoOffset: 0,
    },
    piano: {
      // D/F#: F# D F# A — F# bass + D F# A chord
      // D=1, F#=black key 2, A=5
      whiteKeyIndices: [1, 5],
      blackKeyIndices: [2],
    },
  },

  Em: {
    guitar: {
      // Standard open Em: 0 2 2 0 0 0
      strings: [0, 2, 2, 0, 0, 0],
      fingers: ["0", "2", "3", "0", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // E G B  (white keys 2, 4, 6)
      whiteKeyIndices: [2, 4, 6],
      blackKeyIndices: [],
    },
  },

  Am: {
    guitar: {
      // Standard open Am: x 0 2 2 1 0
      strings: [-1, 0, 2, 2, 1, 0],
      fingers: ["x", "0", "2", "3", "1", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C E  (white keys 5, 0 of oct2, 2 of oct2 = 5, 7, 9)
      whiteKeyIndices: [5, 7, 9],
      blackKeyIndices: [],
    },
  },

  Bm: {
    guitar: {
      // Bm barre at fret 2 (common open-position barre): x 2 4 4 3 2
      strings: [-1, 2, 4, 4, 3, 2],
      fingers: ["x", "1", "3", "4", "2", "1"],
      capoOffset: 0,
    },
    piano: {
      // B D F#  (white keys 6, 8, black key 7 = F# of second octave)
      whiteKeyIndices: [6, 8],
      blackKeyIndices: [7],
    },
  },

  F: {
    guitar: {
      // F barre chord at fret 1: 1 1 2 3 3 1
      strings: [1, 1, 2, 3, 3, 1],
      fingers: ["1", "1", "2", "4", "3", "1"],
      capoOffset: 0,
    },
    piano: {
      // F A C  (white keys 3, 5, 7)
      whiteKeyIndices: [3, 5, 7],
      blackKeyIndices: [],
    },
  },

  Dm: {
    guitar: {
      // Standard open Dm: x x 0 2 3 1
      strings: [-1, -1, 0, 2, 3, 1],
      fingers: ["x", "x", "0", "2", "3", "1"],
      capoOffset: 0,
    },
    piano: {
      // D F A  (white keys 1, 3, 5)
      whiteKeyIndices: [1, 3, 5],
      blackKeyIndices: [],
    },
  },

  A: {
    guitar: {
      // Standard open A: x 0 2 2 2 0
      strings: [-1, 0, 2, 2, 2, 0],
      fingers: ["x", "0", "1", "2", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C# E  (white keys 5, black key 4 = C#oct2, white key 9)
      whiteKeyIndices: [5, 9],
      blackKeyIndices: [4],
    },
  },

  E: {
    guitar: {
      // Standard open E: 0 2 2 1 0 0
      strings: [0, 2, 2, 1, 0, 0],
      fingers: ["0", "2", "3", "1", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // E G# B  (white keys 2, black key 3 = G#, white key 6)
      whiteKeyIndices: [2, 6],
      blackKeyIndices: [3],
    },
  },

  Cadd9: {
    guitar: {
      // Cadd9: x 3 2 0 3 0
      strings: [-1, 3, 2, 0, 3, 0],
      fingers: ["x", "3", "2", "0", "4", "0"],
      capoOffset: 0,
    },
    piano: {
      // C E G D  — C=0, D=1, E=2, G=4
      whiteKeyIndices: [0, 1, 2, 4],
      blackKeyIndices: [],
    },
  },

  Dsus2: {
    guitar: {
      // Dsus2: x x 0 2 3 0
      strings: [-1, -1, 0, 2, 3, 0],
      fingers: ["x", "x", "0", "1", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // D E A  — D=1, E=2, A=5
      whiteKeyIndices: [1, 2, 5],
      blackKeyIndices: [],
    },
  },

  Gsus2: {
    guitar: {
      // Gsus2: 3 x 0 0 1 3
      strings: [3, -1, 0, 0, 1, 3],
      fingers: ["3", "x", "0", "0", "1", "4"],
      capoOffset: 0,
    },
    piano: {
      // G A D  — G=4, A=5, D=8
      whiteKeyIndices: [4, 5, 8],
      blackKeyIndices: [],
    },
  },

  Fsus2: {
    guitar: {
      // Fsus2 barre variant: 1 1 3 3 1 1 (fret 1 barre, capoOffset=0)
      strings: [1, 1, 3, 3, 1, 1],
      fingers: ["1", "1", "3", "4", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // F G C  — F=3, G=4, C=7 (C in second octave)
      whiteKeyIndices: [3, 4, 7],
      blackKeyIndices: [],
    },
  },

  Am7: {
    guitar: {
      // Am7: x 0 2 0 1 0
      strings: [-1, 0, 2, 0, 1, 0],
      fingers: ["x", "0", "2", "0", "1", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C E G  — A=5, C=7, E=9, G=11 (all within 14-key range)
      whiteKeyIndices: [5, 7, 9, 11],
      blackKeyIndices: [],
    },
  },

  G7: {
    guitar: {
      // G7: 3 2 0 0 0 1
      strings: [3, 2, 0, 0, 0, 1],
      fingers: ["3", "2", "0", "0", "0", "1"],
      capoOffset: 0,
    },
    piano: {
      // G B D F  — G=4, B=6, D=8, F=10
      whiteKeyIndices: [4, 6, 8, 10],
      blackKeyIndices: [],
    },
  },

  // --- Barre / worship chords added for missing-diagram fix ---

  "F#": {
    guitar: {
      // F# major barre at fret 2 (E shape): 2 4 4 3 2 2
      strings: [2, 4, 4, 3, 2, 2],
      fingers: ["1", "3", "4", "2", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // F# A# C# — black keys 2(F#) 4(A#) 0(C# oct2=5)
      whiteKeyIndices: [],
      blackKeyIndices: [2, 4, 5],
    },
  },

  "F#m": {
    guitar: {
      // F#m barre at fret 2 (Em shape): 2 4 4 2 2 2
      strings: [2, 4, 4, 2, 2, 2],
      fingers: ["1", "3", "4", "1", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // F# A C# — black keys 2(F#) 5(C# oct2), white key 5(A)
      whiteKeyIndices: [5],
      blackKeyIndices: [2, 5],
    },
  },

  "C#m": {
    guitar: {
      // C#m barre at fret 4 (Am shape): x 4 6 6 5 4
      strings: [-1, 4, 6, 6, 5, 4],
      fingers: ["0", "1", "3", "4", "2", "1"],
      capoOffset: 0,
    },
    piano: {
      // C# E G# — black key 0(C#), white key 2(E), black key 3(G#)
      whiteKeyIndices: [2],
      blackKeyIndices: [0, 3],
    },
  },

  B: {
    guitar: {
      // B major barre at fret 2 (A shape): x 2 4 4 4 2
      strings: [-1, 2, 4, 4, 4, 2],
      fingers: ["0", "1", "2", "3", "4", "1"],
      capoOffset: 0,
    },
    piano: {
      // B D# F# — white key 6(B), black key 1(D#), black key 2(F#)
      whiteKeyIndices: [6],
      blackKeyIndices: [1, 2],
    },
  },

  A2: {
    guitar: {
      // A2 (Aadd9): x 0 2 2 0 0
      strings: [-1, 0, 2, 2, 0, 0],
      fingers: ["0", "0", "1", "2", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C# E B — white keys 5(A) 2(E) 6(B), black key 0(C#)
      whiteKeyIndices: [2, 5, 6],
      blackKeyIndices: [0],
    },
  },

  "E/G#": {
    guitar: {
      // E/G#: G# in bass — fret 4 on low E string: 4 2 2 1 0 0
      strings: [4, 2, 2, 1, 0, 0],
      fingers: ["4", "2", "3", "1", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // E G# B — white keys 2(E) 7(B), black key 3(G#)
      whiteKeyIndices: [2, 7],
      blackKeyIndices: [3],
    },
  },

  // --- Flat keys ---

  Bb: {
    guitar: {
      // Bb barre fret 1 (A shape): x 1 3 3 3 1
      strings: [-1, 1, 3, 3, 3, 1],
      fingers: ["0", "1", "2", "3", "4", "1"],
      capoOffset: 0,
    },
    piano: {
      // Bb D F — black key 4(Bb oct1), white keys 1(D) 3(F)
      whiteKeyIndices: [1, 3],
      blackKeyIndices: [4],
    },
  },

  Eb: {
    guitar: {
      // Eb barre fret 6 (A shape): x 6 8 8 8 6
      strings: [-1, 6, 8, 8, 8, 6],
      fingers: ["0", "1", "2", "3", "4", "1"],
      capoOffset: 0,
    },
    piano: {
      // Eb G Bb — black key 9(Eb=D# oct2), white key 4(G), black key 4(Bb)
      whiteKeyIndices: [4],
      blackKeyIndices: [4, 9],
    },
  },

  Ab: {
    guitar: {
      // Ab barre fret 4 (E shape): 4 6 6 5 4 4
      strings: [4, 6, 6, 5, 4, 4],
      fingers: ["1", "3", "4", "2", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // Ab C Eb — black key 3(Ab=G#), white key 0(C), black key 9(Eb=D# oct2)
      whiteKeyIndices: [0],
      blackKeyIndices: [3, 9],
    },
  },

  Db: {
    guitar: {
      // Db barre fret 4 (A shape): x 4 6 6 6 4
      strings: [-1, 4, 6, 6, 6, 4],
      fingers: ["0", "1", "2", "3", "4", "1"],
      capoOffset: 0,
    },
    piano: {
      // Db F Ab — black key 0(C#=Db), white key 3(F), black key 3(Ab=G#)
      whiteKeyIndices: [3],
      blackKeyIndices: [0, 3],
    },
  },

  // --- 7th chords ---

  Em7: {
    guitar: {
      // Em7: 0 2 2 0 3 0
      strings: [0, 2, 2, 0, 3, 0],
      fingers: ["0", "2", "3", "0", "4", "0"],
      capoOffset: 0,
    },
    piano: {
      // E G B D — white keys 2(E) 4(G) 6(B) 8(D)
      whiteKeyIndices: [2, 4, 6, 8],
      blackKeyIndices: [],
    },
  },

  Dm7: {
    guitar: {
      // Dm7: x 5 3 5 3 x  or simpler open: x x 0 2 1 1
      strings: [-1, -1, 0, 2, 1, 1],
      fingers: ["0", "0", "0", "3", "1", "2"],
      capoOffset: 0,
    },
    piano: {
      // D F A C — white keys 1(D) 3(F) 5(A) 7(B=no, C=0 oct2)
      whiteKeyIndices: [1, 3, 5, 7],
      blackKeyIndices: [],
    },
  },

  Cmaj7: {
    guitar: {
      // Cmaj7: x 3 2 0 0 0
      strings: [-1, 3, 2, 0, 0, 0],
      fingers: ["0", "3", "2", "0", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // C E G B — white keys 0(C) 2(E) 4(G) 6(B)
      whiteKeyIndices: [0, 2, 4, 6],
      blackKeyIndices: [],
    },
  },

  Gmaj7: {
    guitar: {
      // Gmaj7: 3 2 0 0 0 2
      strings: [3, 2, 0, 0, 0, 2],
      fingers: ["3", "2", "0", "0", "0", "1"],
      capoOffset: 0,
    },
    piano: {
      // G B D F# — white keys 4(G) 6(B) 8(D), black key 2(F#)
      whiteKeyIndices: [4, 6, 8],
      blackKeyIndices: [2],
    },
  },

  Amaj7: {
    guitar: {
      // Amaj7: x 0 2 1 2 0
      strings: [-1, 0, 2, 1, 2, 0],
      fingers: ["0", "0", "2", "1", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C# E G# — white keys 5(A) 2(E), black keys 0(C#) 3(G#)
      whiteKeyIndices: [2, 5],
      blackKeyIndices: [0, 3],
    },
  },

  Bm7: {
    guitar: {
      // Bm7: x 2 4 2 3 2
      strings: [-1, 2, 4, 2, 3, 2],
      fingers: ["0", "1", "3", "1", "2", "1"],
      capoOffset: 0,
    },
    piano: {
      // B D F# A — white keys 6(B) 1(D) 5(A), black key 2(F#)
      whiteKeyIndices: [1, 5, 6],
      blackKeyIndices: [2],
    },
  },

  E7: {
    guitar: {
      // E7: 0 2 0 1 0 0
      strings: [0, 2, 0, 1, 0, 0],
      fingers: ["0", "2", "0", "1", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // E G# B D — white keys 2(E) 7(B) 8(D), black key 3(G#)
      whiteKeyIndices: [2, 7, 8],
      blackKeyIndices: [3],
    },
  },

  A7: {
    guitar: {
      // A7: x 0 2 0 2 0
      strings: [-1, 0, 2, 0, 2, 0],
      fingers: ["0", "0", "2", "0", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C# E G — white keys 5(A) 2(E) 4(G), black key 0(C#)
      whiteKeyIndices: [2, 4, 5],
      blackKeyIndices: [0],
    },
  },

  D7: {
    guitar: {
      // D7: x x 0 2 1 2
      strings: [-1, -1, 0, 2, 1, 2],
      fingers: ["0", "0", "0", "2", "1", "3"],
      capoOffset: 0,
    },
    piano: {
      // D F# A C — white keys 1(D) 5(A) 7(C oct2), black key 2(F#)
      whiteKeyIndices: [1, 5, 7],
      blackKeyIndices: [2],
    },
  },

  B7: {
    guitar: {
      // B7: x 2 1 2 0 2
      strings: [-1, 2, 1, 2, 0, 2],
      fingers: ["0", "2", "1", "3", "0", "4"],
      capoOffset: 0,
    },
    piano: {
      // B D# F# A — white keys 6(B) 1(D) 5(A), black keys 1(D#) 2(F#)
      whiteKeyIndices: [1, 5, 6],
      blackKeyIndices: [1, 2],
    },
  },

  // --- Sus chords ---

  Dsus4: {
    guitar: {
      // Dsus4: x x 0 2 3 3
      strings: [-1, -1, 0, 2, 3, 3],
      fingers: ["0", "0", "0", "1", "3", "4"],
      capoOffset: 0,
    },
    piano: {
      // D G A — white keys 1(D) 4(G) 5(A)
      whiteKeyIndices: [1, 4, 5],
      blackKeyIndices: [],
    },
  },

  Asus2: {
    guitar: {
      // Asus2: x 0 2 2 0 0
      strings: [-1, 0, 2, 2, 0, 0],
      fingers: ["0", "0", "1", "2", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // A B E — white keys 5(A) 6(B) 2(E)
      whiteKeyIndices: [2, 5, 6],
      blackKeyIndices: [],
    },
  },

  Asus4: {
    guitar: {
      // Asus4: x 0 2 2 3 0
      strings: [-1, 0, 2, 2, 3, 0],
      fingers: ["0", "0", "1", "2", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // A D E — white keys 5(A) 1(D) 2(E)
      whiteKeyIndices: [1, 2, 5],
      blackKeyIndices: [],
    },
  },

  Esus4: {
    guitar: {
      // Esus4: 0 2 2 2 0 0
      strings: [0, 2, 2, 2, 0, 0],
      fingers: ["0", "2", "3", "4", "0", "0"],
      capoOffset: 0,
    },
    piano: {
      // E A B — white keys 2(E) 5(A) 6(B)
      whiteKeyIndices: [2, 5, 6],
      blackKeyIndices: [],
    },
  },

  // --- Minor chords ---

  Fm: {
    guitar: {
      // Fm barre fret 1 (Em shape): 1 3 3 2 1 1
      strings: [1, 3, 3, 2, 1, 1],
      fingers: ["1", "3", "4", "2", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // F Ab C — white key 3(F) 0(C oct2=7), black key 3(Ab=G#)
      whiteKeyIndices: [3, 7],
      blackKeyIndices: [3],
    },
  },

  Gm: {
    guitar: {
      // Gm barre fret 3 (Em shape): 3 5 5 4 3 3
      strings: [3, 5, 5, 4, 3, 3],
      fingers: ["1", "3", "4", "2", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // G Bb D — white keys 4(G) 1(D oct2=8), black key 4(Bb)
      whiteKeyIndices: [4, 8],
      blackKeyIndices: [4],
    },
  },

  Cm: {
    guitar: {
      // Cm barre fret 3 (Am shape): x 3 5 5 4 3
      strings: [-1, 3, 5, 5, 4, 3],
      fingers: ["0", "1", "3", "4", "2", "1"],
      capoOffset: 0,
    },
    piano: {
      // C Eb G — white keys 0(C) 4(G), black key 9(Eb=D# oct2)
      whiteKeyIndices: [0, 4],
      blackKeyIndices: [9],
    },
  },

  Bbm: {
    guitar: {
      // Bbm barre fret 1 (Am shape): x 1 3 3 2 1
      strings: [-1, 1, 3, 3, 2, 1],
      fingers: ["0", "1", "3", "4", "2", "1"],
      capoOffset: 0,
    },
    piano: {
      // Bb Db F — black key 4(Bb) 0(C#=Db), white key 3(F)
      whiteKeyIndices: [3],
      blackKeyIndices: [0, 4],
    },
  },

  // --- Slash / bass chords ---

  "G/D": {
    guitar: {
      // G/D: D in bass — x x 0 0 0 3
      strings: [-1, -1, 0, 0, 0, 3],
      fingers: ["0", "0", "0", "0", "0", "4"],
      capoOffset: 0,
    },
    piano: {
      // G B D — white keys 4(G) 6(B) 1(D)
      whiteKeyIndices: [1, 4, 6],
      blackKeyIndices: [],
    },
  },

  "D/A": {
    guitar: {
      // D/A: A in bass — x 0 0 2 3 2
      strings: [-1, 0, 0, 2, 3, 2],
      fingers: ["0", "0", "0", "1", "3", "2"],
      capoOffset: 0,
    },
    piano: {
      // D F# A — white keys 1(D) 5(A), black key 2(F#)
      whiteKeyIndices: [1, 5],
      blackKeyIndices: [2],
    },
  },

  "A/C#": {
    guitar: {
      // A/C#: C# in bass — x 4 2 2 2 0  (or capo variant)
      strings: [-1, 4, 2, 2, 2, 0],
      fingers: ["0", "4", "1", "2", "3", "0"],
      capoOffset: 0,
    },
    piano: {
      // A C# E — white keys 5(A) 2(E), black key 0(C#)
      whiteKeyIndices: [2, 5],
      blackKeyIndices: [0],
    },
  },

  "F/A": {
    guitar: {
      // F/A: A in bass — x 0 3 2 1 1
      strings: [-1, 0, 3, 2, 1, 1],
      fingers: ["0", "0", "4", "3", "1", "2"],
      capoOffset: 0,
    },
    piano: {
      // F A C — white keys 3(F) 5(A) 7(C oct2)
      whiteKeyIndices: [3, 5, 7],
      blackKeyIndices: [],
    },
  },

  "F/C": {
    guitar: {
      // F/C: C in bass — x 3 3 2 1 1
      strings: [-1, 3, 3, 2, 1, 1],
      fingers: ["0", "4", "3", "2", "1", "1"],
      capoOffset: 0,
    },
    piano: {
      // F A C — white keys 3(F) 5(A) 7(C oct2)
      whiteKeyIndices: [3, 5, 7],
      blackKeyIndices: [],
    },
  },

  "C/G": {
    guitar: {
      // C/G: G in bass — 3 3 2 0 1 0
      strings: [3, 3, 2, 0, 1, 0],
      fingers: ["3", "4", "2", "0", "1", "0"],
      capoOffset: 0,
    },
    piano: {
      // C E G — white keys 0(C) 2(E) 4(G)
      whiteKeyIndices: [0, 2, 4],
      blackKeyIndices: [],
    },
  },
};
