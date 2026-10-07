import { useState, useRef, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { StockfishEngine } from '../../../chess/engine/StockfishEngine';
import { Puzzle } from '../../../chess/puzzles';

export interface HintData {
  line: string;
  score?: string;
  from?: Square;
  to?: Square;
}

export function useEngineAnalysis(
  currentFen: string,
  historyLength: number,
  turn: 'white' | 'black',
  puzzle: Puzzle | null,
  getLiveFen: () => string,
  setMessage: (msg: string) => void
) {
  const [hint, setHint] = useState<HintData | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const hintEngine = useRef<StockfishEngine | null>(null);

  useEffect(() => {
    setHint(null);
    setHintBusy(false);
    hintEngine.current?.dispose();
  }, [currentFen]);

  useEffect(() => {
    return () => {
      hintEngine.current?.dispose();
    };
  }, []);

  async function requestHint() {
    if (puzzle) {
      const nextMove = puzzle.line[historyLength];
      if (!nextMove) return;
      try {
        const c = new Chess(currentFen);
        const move = c.move(nextMove);
        if (move) {
          setHint({ line: `Try ${move.san}`, from: move.from, to: move.to });
        }
      } catch {}
      return;
    }
    const fen = currentFen;
    setHintBusy(true);
    setMessage("");
    hintEngine.current ??= new StockfishEngine();
    try {
      const analysis = await hintEngine.current.analyze(fen, {
        depth: 14,
        movetime: 1200,
      });
      if (getLiveFen() !== fen) return;
      const c = new Chess(fen),
        line: string[] = [];
      for (const uci of analysis.pv.slice(0, 5)) {
        try {
          line.push(
            c.move({
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              promotion: uci[4],
            })?.san,
          );
        } catch {
          break;
        }
      }
      const sign = turn === "white" ? 1 : -1;
      let scoreText: string | undefined;
      if (analysis.mate !== undefined) {
        const matingSide =
          (analysis.mate > 0 && turn === "white") ||
          (analysis.mate < 0 && turn === "black")
            ? "White"
            : "Black";
        scoreText = `Mate in ${Math.abs(analysis.mate)} (${matingSide})`;
      } else if (analysis.score !== undefined) {
        scoreText = `${analysis.score * sign >= 0 ? "+" : ""}${((analysis.score * sign) / 100).toFixed(2)} · White’s perspective`;
      }
      setHint({
        line: line.join(" → "),
        score: scoreText,
        from: analysis.from as Square,
        to: analysis.to as Square,
      });
    } catch {
      if (getLiveFen() === fen)
        setMessage("Hints are unavailable right now. Try again.");
    } finally {
      setHintBusy(false);
    }
  }

  return { hint, setHint, hintBusy, requestHint };
}
