import React from 'react';
import { ArrowLeft, ArrowRight, SkipBack, SkipForward, Play, Pause, RotateCw, Download } from 'lucide-react';
import { HistoryEntry } from '../../../chess/ChessTypes';

interface ReplayBarProps {
  replay: number;
  history: HistoryEntry[];
  recording: boolean;
  playing: boolean;
  orbit: boolean;
  leaveReplay: () => void;
  review: (index: number) => void;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setReplay: React.Dispatch<React.SetStateAction<number | null>>;
  setOrbit: React.Dispatch<React.SetStateAction<boolean>>;
  exportHighlight: () => Promise<void>;
}

export function ReplayBar({
  replay,
  history,
  recording,
  playing,
  orbit,
  leaveReplay,
  review,
  setPlaying,
  setReplay,
  setOrbit,
  exportHighlight,
}: ReplayBarProps) {
  return (
    <div className="replay-bar">
      <div className="replay-title">
        <span className="eyebrow">CINEMATIC REPLAY</span>
        <span>
          {replay === 0 ? "Starting position" : history[replay - 1]?.san} ·{" "}
          {replay}/{history.length}
        </span>
        <button disabled={recording} onClick={leaveReplay}>
          Return to game <ArrowRight size={14} />
        </button>
      </div>
      <input
        aria-label="Replay position"
        type="range"
        min="0"
        max={history.length}
        value={replay}
        disabled={recording}
        onChange={(e) => {
          setPlaying(false);
          setReplay(Number(e.target.value));
        }}
      />
      <div className="replay-buttons">
        <button
          aria-label="First move"
          disabled={recording}
          onClick={() => review(0)}
        >
          <SkipBack size={17} />
        </button>
        <button
          aria-label="Previous move"
          disabled={recording || replay === 0}
          onClick={() => review(replay - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="play-button"
          aria-label={playing ? "Pause replay" : "Play replay"}
          disabled={recording}
          onClick={() => {
            if (replay === history.length) setReplay(0);
            setPlaying((v) => !v);
          }}
        >
          {playing ? <Pause size={19} /> : <Play size={19} />}
        </button>
        <button
          aria-label="Next move"
          disabled={recording || replay === history.length}
          onClick={() => review(replay + 1)}
        >
          <ArrowRight size={17} />
        </button>
        <button
          aria-label="Last move"
          disabled={recording}
          onClick={() => review(history.length)}
        >
          <SkipForward size={17} />
        </button>
        <button
          className="orbit-button"
          aria-pressed={orbit}
          onClick={() => setOrbit((v) => !v)}
        >
          <RotateCw size={14} /> Orbit
        </button>
        <button
          disabled={recording || !history.length}
          onClick={() => void exportHighlight()}
        >
          <Download size={14} />
          {recording ? "Recording…" : "Export highlight"}
        </button>
      </div>
    </div>
  );
}
