export interface Puzzle {
  id: string;
  title: string;
  category: string;
  description: string;
  fen: string;
  line: string[];
  mate: boolean;
  lesson: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}
export const PUZZLES: Puzzle[] = [
  {
    id: "back-rank",
    title: "Back-rank finale",
    category: "Mate in 1",
    description: "The king has no escape squares. Finish with your rook.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    line: ["Re8#"],
    mate: true,
    lesson:
      "The king’s own pawns block its escape. A rook on the eighth rank delivers mate.",
    difficulty: "Beginner",
  },
  {
    id: "queen-rook",
    title: "The final file",
    category: "Mate in 1",
    description: "Coordinate the queen and rook for the final check.",
    fen: "7k/6pp/8/8/8/8/5Q2/5RK1 w - - 0 1",
    line: ["Qf8#"],
    mate: true,
    lesson:
      "Your rook protects the queen along the f-file, and the queen seals the back rank.",
    difficulty: "Beginner",
  },
  {
    id: "smothered",
    title: "A beautiful sacrifice",
    category: "Mate in 2",
    description: "Give up your queen to make room for the knight.",
    fen: "5r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1",
    line: ["Qg8+", "Rxg8", "Nf7#"],
    mate: true,
    lesson:
      "The queen lures the rook to g8. The trapped king then falls to a smothered mate.",
    difficulty: "Advanced",
  },
  {
    id: "fork",
    title: "Royal fork",
    category: "Tactics",
    description:
      "Check the king and attack the queen with a single knight move.",
    fen: "4k3/8/8/3N4/8/8/4q3/6K1 w - - 0 1",
    line: ["Nf6+"],
    mate: false,
    lesson:
      "Nf6+ checks the king on e8 while attacking the queen on e2. The king must answer the check.",
    difficulty: "Intermediate",
  },
  {
    id: "scholars-touch",
    title: "Scholar’s Precision",
    category: "Mate in 1",
    description: "Take advantage of Black’s undefended f7 pawn.",
    fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    line: ["Qxf7#"],
    mate: true,
    lesson:
      "The f7 pawn is defended only by the king. Concentrating queen and bishop delivers immediate mate.",
    difficulty: "Beginner",
  },
  {
    id: "arabian-mate",
    title: "Arabian Knight",
    category: "Mate in 1",
    description: "Use the knight to protect the rook and seal the corner escape.",
    fen: "7k/R7/5N2/8/8/8/8/6K1 w - - 0 1",
    line: ["Rh7#"],
    mate: true,
    lesson:
      "A classical pattern dating back over a thousand years. The knight guards the rook on h7 and covers the escape squares.",
    difficulty: "Beginner",
  },
  {
    id: "epaulette-mate",
    title: "Epaulette Trap",
    category: "Mate in 1",
    description: "The defending rooks flank their own monarch, turning into a cage.",
    fen: "3rkr2/8/8/8/8/8/4Q3/6K1 w - - 0 1",
    line: ["Qe6#"],
    mate: true,
    lesson:
      "When pieces on both sides of a king prevent lateral escape, a direct frontal queen check delivers checkmate.",
    difficulty: "Beginner",
  },
];

export function getDailyPuzzle(date = new Date()): Puzzle {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return PUZZLES[day % PUZZLES.length];
}
