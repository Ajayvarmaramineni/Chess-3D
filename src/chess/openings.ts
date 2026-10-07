import { HistoryEntry } from './ChessTypes';

const OPENINGS: Array<[string, string]> = [
  // Open Game (1. e4 e5)
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy López'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Giuoco Piano'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Two Knights Defense'],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian Game'],
  ['e4 e5 Nf3 Nc6 d4', 'Scotch Game'],
  ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Four Knights Game'],
  ['e4 e5 f4', "King's Gambit"],
  ['e4 e5 Nc3', 'Vienna Game'],
  ['e4 e5 Nf3', "King's Knight Opening"],

  // Semi-Open Games (1. e4 other)
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Sicilian Najdorf'],
  ['e4 c5 Nf3 Nc6', 'Sicilian Defense (Old)'],
  ['e4 c5 Nf3 e6', 'Sicilian French'],
  ['e4 c5 c3', 'Sicilian Alapin'],
  ['e4 c5', 'Sicilian Defense'],
  ['e4 e6 d4 d5', 'French Defense'],
  ['e4 e6', 'French Defense'],
  ['e4 c6 d4 d5', 'Caro–Kann Defense'],
  ['e4 c6', 'Caro–Kann Defense'],
  ['e4 d5', 'Scandinavian Defense'],
  ['e4 Nf6', "Alekhine's Defense"],
  ['e4 d6 d4 Nf6', 'Pirc Defense'],
  ['e4 g6', 'Modern Defense'],

  // Closed & Semi-Closed Games (1. d4)
  ['d4 d5 c4 c6', 'Slav Defense'],
  ['d4 d5 c4 e6', "Queen's Gambit Declined"],
  ['d4 d5 c4 dxc4', "Queen's Gambit Accepted"],
  ['d4 d5 c4', "Queen's Gambit"],
  ['d4 d5 Nf3 Nf6 Bf4', 'London System'],
  ['d4 d5 Bf4', 'London System'],
  ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld Defense'],
  ['d4 Nf6 c4 g6', "King's Indian Defense"],
  ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo–Indian Defense'],
  ['d4 Nf6 c4 e6 g3', 'Catalan Opening'],
  ['d4 Nf6 c4 c5 d5', 'Benoni Defense'],
  ['d4 f5', 'Dutch Defense'],

  // Flank & Other Openings
  ['Nf3 d5 g3', 'Réti Opening'],
  ['Nf3', 'Zukertort Opening'],
  ['c4 e5', 'English (Reversed Sicilian)'],
  ['c4', 'English Opening'],
  ['b3', 'Nimzo–Larsen Attack'],
  ['f4', "Bird's Opening"],

  // Broad Families
  ['e4', "King's Pawn Game"],
  ['d4', "Queen's Pawn Game"],
];

export function identifyOpening(history: Pick<HistoryEntry, 'san'>[]): string | null {
  const moves = history.map(({ san }) => san.replace(/[+#?!]/g, '')).join(' ');
  let match: string | null = null;
  let matchedMoveCount = -1;

  for (const [line, name] of OPENINGS) {
    if (moves === line || moves.startsWith(line + ' ')) {
      const moveCount = line.split(' ').length;
      if (moveCount > matchedMoveCount) {
        match = name;
        matchedMoveCount = moveCount;
      }
    }
  }

  return match;
}
