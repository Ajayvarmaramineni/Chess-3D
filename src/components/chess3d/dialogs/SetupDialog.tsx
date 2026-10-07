import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Dialog } from './Dialog';
import { GameSettings, StandardColor } from '../../../chess/ChessTypes';

export function SetupDialog({
  dialog,
  setDialog,
  setup,
  setSetup,
  startGame,
}: {
  dialog: 'setup' | 'puzzles' | 'resign' | 'friends' | null;
  setDialog: (v: 'setup' | 'puzzles' | 'resign' | 'friends' | null) => void;
  setup: GameSettings & { side: StandardColor | 'random' };
  setSetup: React.Dispatch<React.SetStateAction<GameSettings & { side: StandardColor | 'random' }>>;
  startGame: () => Promise<void>;
}) {
  if (dialog !== 'setup') return null;

  return (
    <Dialog title="A new beginning" onClose={() => setDialog(null)}>
      <p>Choose your opponent. Find your rhythm.</p>
      <div className="setup-fields">
        <label>
          Game mode
          <select
            aria-label="Game mode"
            value={setup.mode}
            onChange={(e) =>
              setSetup((s) => ({
                ...s,
                mode: e.target.value as GameSettings["mode"],
              }))
            }
          >
            <option value="computer">Play Stockfish</option>
            <option value="local">Local two-player</option>
          </select>
        </label>
        <label>
          Play as
          <select
            aria-label="Play as"
            value={setup.side}
            onChange={(e) =>
              setSetup((s) => ({
                ...s,
                side: e.target.value as typeof setup.side,
              }))
            }
          >
            <option value="white">White</option>
            <option value="black">Black</option>
            <option value="random">Surprise me</option>
          </select>
        </label>
        <label>
          Difficulty
          <select
            aria-label="Difficulty"
            disabled={setup.mode !== "computer"}
            value={setup.difficulty}
            onChange={(e) =>
              setSetup((s) => ({
                ...s,
                difficulty: e.target.value as GameSettings["difficulty"],
              }))
            }
          >
            {["beginner", "easy", "medium", "hard", "expert"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Time control
          <select
            aria-label="Time control"
            value={setup.timeControl}
            onChange={(e) =>
              setSetup((s) => ({
                ...s,
                timeControl: e.target.value as GameSettings["timeControl"],
              }))
            }
          >
            <option value="untimed">Untimed</option>
            <option value="3+2">3 min + 2 sec</option>
            <option value="5+0">5 minutes</option>
            <option value="10+0">10 minutes</option>
          </select>
        </label>
      </div>
      <button className="primary full" onClick={() => void startGame()}>
        Start game <ArrowRight size={16} />
      </button>
      <small className="dialog-note">
        Starting replaces your current game on this device.
      </small>
    </Dialog>
  );
}
