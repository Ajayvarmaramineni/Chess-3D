import { Check, ArrowRight } from 'lucide-react';
import { Dialog } from './Dialog';
import { Puzzle, PUZZLES, getDailyPuzzle } from '../../../chess/puzzles';

export function PuzzlesDialog({
  dialog,
  setDialog,
  completed,
  startPuzzle,
}: {
  dialog: 'setup' | 'puzzles' | 'resign' | 'friends' | null;
  setDialog: (v: 'setup' | 'puzzles' | 'resign' | 'friends' | null) => void;
  completed: string[];
  startPuzzle: (p: Puzzle) => Promise<void>;
}) {
  if (dialog !== 'puzzles') return null;

  return (
    <Dialog title="A little brilliance" onClose={() => setDialog(null)}>
      <p>A new daily position, plus a collection that grows from fundamentals to combinations.</p>
      <div className="puzzle-list">
        {[getDailyPuzzle(), ...PUZZLES.filter((p) => p.id !== getDailyPuzzle().id)].map((p, i) => (
          <button key={p.id} onClick={() => void startPuzzle(p)}>
            <span className="puzzle-number">0{i + 1}</span>
            <div>
              <small>{i === 0 ? 'Daily · ' : ''}{p.difficulty} · {p.category}</small>
              <strong>{p.title}</strong>
            </div>
            {completed.includes(p.id) ? (
              <Check size={19} />
            ) : (
              <ArrowRight size={19} />
            )}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
