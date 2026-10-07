import React, { useMemo } from 'react';
import {
  RotateCcw,
  Lightbulb,
  Flag,
  X,
  Send,
  SlidersHorizontal,
  Play,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
} from 'lucide-react';
import {
  StandardColor,
  ChessGameState,
  HistoryEntry,
  GameSettings,
} from '../../../chess/ChessTypes';
import { ChessController } from '../../../chess/ChessController';
import { Puzzle } from '../../../chess/puzzles';
import { useFriendRoom } from '../hooks/useFriendRoom';
import { Square } from 'chess.js';
import { describeSanMove } from '../a11y/moveSpeech';
import { identifyOpening } from '../../../chess/openings';

export type Theme = 'amethyst' | 'obsidian' | 'frost';

const PIECES: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

const clock = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(
    Math.floor(Math.max(0, ms) / 1000) % 60,
  ).padStart(2, '0')}`;

interface GamePanelProps {
  drawer: boolean;
  puzzle: Puzzle | null;
  state: ChessGameState;
  opponent: StandardColor;
  history: HistoryEntry[];
  recording: boolean;
  replay: number | null;
  inputLocked: boolean;
  controller: ChessController;
  hintBusy: boolean;
  solved: boolean;
  hint: { line: string; score?: string; from?: Square; to?: Square } | null;
  room: ReturnType<typeof useFriendRoom>;
  command: string;
  message: string;
  storageError: boolean;
  theme: Theme;
  cinematic: boolean;
  captures: Record<StandardColor, string[]>;
  material: number;
  sound: boolean;
  volume: number;
  quality: 'studio' | 'performance';
  review: (index: number) => void;
  requestHint: () => Promise<void>;
  setDialog: (v: 'setup' | 'puzzles' | 'resign' | 'friends' | null) => void;
  setHint: (h: { line: string; score?: string; from?: Square; to?: Square } | null) => void;
  playCommand: (e: React.FormEvent) => Promise<void>;
  setCommand: (c: string) => void;
  setTheme: (t: Theme) => void;
  setCinematic: (c: boolean) => void;
  setSound: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: (v: number) => void;
  setQuality: (q: 'studio' | 'performance') => void;
}

export function GamePanel({
  drawer,
  puzzle,
  state,
  opponent,
  history,
  recording,
  replay,
  inputLocked,
  controller,
  hintBusy,
  solved,
  hint,
  room,
  command,
  message,
  storageError,
  theme,
  cinematic,
  captures,
  material,
  sound,
  volume,
  quality,
  review,
  requestHint,
  setDialog,
  setHint,
  playCommand,
  setCommand,
  setTheme,
  setCinematic,
  setSound,
  setVolume,
  setQuality,
}: GamePanelProps) {
  // Compute accessible speech announcement for the latest move or status
  const latestAnnouncement = useMemo(() => {
    if (state.gameOver) {
      return state.winner === 'draw'
        ? `Game over. The match ended in a draw by ${state.reason || 'rules'}.`
        : `Game over. ${state.winner === 'white' ? 'White' : 'Black'} wins by ${state.reason || 'checkmate'}.`;
    }
    if (state.inCheck) {
      return `${state.turn === 'white' ? 'White' : 'Black'} king is in check.`;
    }
    const last = history[history.length - 1];
    if (!last) return 'New game ready.';
    return describeSanMove(
      last.san,
      last.color === 'w' ? 'white' : 'black',
      Math.ceil(history.length / 2),
    );
  }, [history, state.gameOver, state.winner, state.reason, state.inCheck, state.turn]);
  const opening = useMemo(() => identifyOpening(history), [history]);

  function PlayerCard({
    color,
  }: {
    color: StandardColor;
  }) {
    const isYou = color === state.humanColor;
    return (
      <div
        className={`player-card ${state.turn === color && !state.gameOver ? 'active' : ''}`}
      >
        <div className={`player-avatar ${color}`}>{PIECES.k}</div>
        <div className="player-meta">
          <strong>
            {state.mode === 'computer'
              ? isYou
                ? 'You'
                : 'Stockfish'
              : state.mode === 'online'
                ? isYou
                  ? 'You'
                  : 'Your friend'
                : color === 'white'
                  ? 'White'
                  : 'Black'}
          </strong>
          <span>
            {color === 'white' ? 'White crystal' : 'Dark crystal'}
            {state.mode === 'computer' && !isYou ? ` · ${state.difficulty}` : ''}
          </span>
          <div className="captured" role="group" aria-label={`${color} captured pieces`}>
            {captures[color].map((p, i) => (
              <span key={i}>{PIECES[p]}</span>
            ))}
            {(color === 'white' ? material : -material) > 0 && (
              <small>+{color === 'white' ? material : -material}</small>
            )}
          </div>
        </div>
        <div
          className={`clock ${state.clocks[color] < 30000 && state.timeControl !== 'untimed' ? 'low' : ''}`}
          aria-label={`${color} clock`}
        >
          {state.timeControl === 'untimed' ? '∞' : clock(state.clocks[color])}
        </div>
      </div>
    );
  }

  return (
    <aside
      id="game-controls"
      tabIndex={-1}
      className={`game-panel ${drawer ? 'expanded' : ''}`}
      aria-label="Game controls"
    >
      {/* Accessible live region announcing moves & game alerts */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAnnouncement}
      </div>

      <div className="panel-title">
        <span className="eyebrow">
          {puzzle
            ? 'PRACTICE SESSION'
            : state.mode === 'computer'
              ? 'YOU VS THE ENGINE'
              : state.mode === 'online'
                ? 'FRIEND MATCH'
                : 'OVER THE BOARD'}
        </span>
        <span className="live-badge">
          {state.gameOver ? 'FINISHED' : 'LIVE'}
        </span>
      </div>

      <PlayerCard color={opponent} />

      <div className="move-section">
        <div className="section-heading">
          <h2>Move journal</h2>
          <button
            disabled={!history.length || recording}
            onClick={() => review(0)}
          >
            Replay <Play size={12} />
          </button>
        </div>
        <div className="move-journal" tabIndex={0} aria-label="Move history">
          {opening && <div className="opening-name">{opening}</div>}
          {history.length === 0 ? (
            <div className="empty-journal">
              <span>♘</span>
              <p>
                A quiet board.
                <br />A thousand possibilities.
              </p>
              <small>Your moves will appear here.</small>
            </div>
          ) : (
            Array.from(
              { length: Math.ceil(history.length / 2) },
              (_, i) => (
                <div className="move-row" key={i}>
                  <span>{i + 1}.</span>
                  {history.slice(i * 2, i * 2 + 2).map((m, j) => (
                    <button
                      key={i * 2 + j}
                      className={
                        (
                          replay === null
                            ? i * 2 + j === history.length - 1
                            : replay === i * 2 + j + 1
                        )
                          ? 'current'
                          : ''
                      }
                      aria-label={describeSanMove(
                        m.san,
                        j === 0 ? 'white' : 'black',
                        i + 1,
                      )}
                      disabled={recording}
                      onClick={() => review(i * 2 + j + 1)}
                    >
                      {m.san}
                    </button>
                  ))}
                </div>
              ),
            )
          )}
        </div>
      </div>

      <PlayerCard color={state.humanColor} />

      <div className="game-actions">
        <button
          disabled={
            inputLocked ||
            !history.length ||
            state.mode === 'online' ||
            !!puzzle
          }
          onClick={() => void controller.undo()}
        >
          <RotateCcw size={15} />
          Undo
        </button>
        <button
          disabled={
            inputLocked || hintBusy || state.mode === 'online' || solved
          }
          onClick={() => void requestHint()}
        >
          <Lightbulb size={15} />
          {hintBusy ? 'Thinking…' : 'Hint'}
        </button>
        <button
          disabled={
            state.gameOver ||
            state.isAnimating ||
            state.mode === 'puzzle' ||
            replay !== null ||
            (state.mode === 'online' && !room.connected)
          }
          onClick={() => setDialog('resign')}
        >
          <Flag size={15} />
          Resign
        </button>
      </div>

      {state.mode === 'online' && room.connected && room.ready && (
        <div className="online-actions">
          {!state.gameOver && !room.drawOffer && <button onClick={room.offerDraw}>Offer draw</button>}
          {room.drawOffer && room.drawOffer !== room.color && !state.gameOver && <><span>Your friend offered a draw.</span><button onClick={()=>room.answerDraw(true)}>Accept</button><button onClick={()=>room.answerDraw(false)}>Decline</button></>}
          {room.drawOffer === room.color && !state.gameOver && <span>Draw offer sent.</span>}
          {state.gameOver && <button onClick={room.requestRematch}>{room.rematchVotes.includes(room.color) ? 'Waiting for rematch…' : 'Request rematch'}</button>}
        </div>
      )}

      {hint && (
        <div className="hint-box">
          <span className="eyebrow">
            {puzzle ? 'A LITTLE NUDGE' : 'ENGINE CONTINUATION'}
          </span>
          <strong>{hint.line}</strong>
          {hint.score && <small>{hint.score}</small>}
          <button aria-label="Dismiss hint" onClick={() => setHint(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      {state.engineError && state.mode === 'computer' && (
        <div className="notice">
          {state.engineError}
          <button onClick={() => void controller.retryEngine()}>
            Retry engine
          </button>
        </div>
      )}

      {room.room && (
        <div className="room-summary">
          <span className="status-dot" />
          <span>
            {!room.connected
              ? room.status
              : !room.ready
                ? 'Waiting for your friend'
                : room.peers < 2
                  ? 'Your friend is reconnecting'
                  : 'Friend connected'}
          </span>
          <button onClick={() => setDialog('friends')}>Invite link</button>
        </div>
      )}

      <form className="command-form" onSubmit={playCommand}>
        <input
          aria-label="Move command"
          placeholder="Move command · e2 to e4"
          value={command}
          disabled={inputLocked}
          onChange={(e) => setCommand(e.target.value)}
        />
        <button
          aria-label="Play move"
          type="submit"
          disabled={inputLocked || !command.trim()}
        >
          <Send size={15} />
        </button>
      </form>

      <div className="feedback" role="status">
        {message}
      </div>

      <div className="preferences">
        <div className="section-heading">
          <h2>
            <SlidersHorizontal size={13} /> Make it yours
          </h2>
        </div>
        <label>
          Collection
          <select
            aria-label="Board theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="amethyst">Amethyst</option>
            <option value="obsidian">Obsidian Gold</option>
            <option value="frost">Frost</option>
          </select>
        </label>
        <label>
          Atmosphere
          <div className="segmented">
            <button
              aria-pressed={cinematic}
              onClick={() => setCinematic(true)}
            >
              Cinematic
            </button>
            <button
              aria-pressed={!cinematic}
              onClick={() => setCinematic(false)}
            >
              Focus
            </button>
          </div>
        </label>
        <label>
          Graphics
          <div className="segmented">
            <button
              aria-pressed={quality === 'studio'}
              onClick={() => setQuality('studio')}
            >
              <Sparkles size={12} /> Studio
            </button>
            <button
              aria-pressed={quality === 'performance'}
              onClick={() => setQuality('performance')}
            >
              <Gauge size={12} /> Battery
            </button>
          </div>
        </label>
        <label>
          Audio Volume
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '146px' }}>
            <button
              type="button"
              className="icon-button"
              style={{ width: '24px', height: '24px', padding: 0 }}
              onClick={() => setSound((s) => !s)}
              title={sound ? 'Mute' : 'Unmute'}
              aria-label={sound ? 'Mute' : 'Unmute'}
            >
              {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sound ? volume : 0}
              aria-label="Sound volume"
              style={{ width: '100%', height: '6px', cursor: 'pointer' }}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (!sound && val > 0) setSound(true);
              }}
            />
          </div>
        </label>
        {state.mode === 'computer' && (
          <label>
            Engine strength
            <select
              aria-label="Engine strength"
              value={state.difficulty}
              onChange={(e) =>
                void controller.setDifficulty(
                  e.target.value as GameSettings['difficulty'],
                )
              }
            >
              {['beginner', 'easy', 'medium', 'hard', 'expert'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="save-note">
        {storageError
          ? 'Browser storage is full. This game may not be saved.'
          : state.mode === 'online'
            ? 'Private room · clocks run while disconnected'
            : state.mode === 'puzzle'
              ? 'Practice at your own pace'
              : 'Your game is saved on this device'}
      </div>
    </aside>
  );
}
