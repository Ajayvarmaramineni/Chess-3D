import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Chess, Square } from 'chess.js';
import {
  Diamond,
  RotateCw,
  Volume2,
  VolumeX,
  Play,
  Check,
  ChevronUp,
  ChevronDown,
  Users,
  Mic,
  MicOff,
} from 'lucide-react';
import { CrystalChessBoardProps, ViewMode, MoveAnimation } from './game/types';
import { useChessGame, piecesFromFen } from './hooks/useChessGame';
import { useFriendRoom } from './hooks/useFriendRoom';
import { useVideoExport } from './hooks/useVideoExport';
import { useEngineAnalysis } from './hooks/useEngineAnalysis';
import { ChessCommandParser } from '../../chess/commands/ChessCommandParser';
import { DEFAULT_SETTINGS } from '../../chess/ChessController';
import {
  GameSettings,
  MoveCommand,
  MoveResult,
  StandardColor,
} from '../../chess/ChessTypes';
import { PUZZLES, Puzzle } from '../../chess/puzzles';
import {
  playChessSound,
  unlockSound,
  setVolume as setAudioVolume,
  setMuted as setAudioMuted,
} from './sound';
import { squareToWorld } from './game/coordinates';
import {
  Dialog,
  SetupDialog,
  PuzzlesDialog,
  ResignDialog,
  FriendsDialog,
} from './dialogs';
import { GamePanel, ReplayBar, Theme } from './layout';
import { AccessibleBoard2D } from './AccessibleBoard2D';
import { describeSanMove } from './a11y/moveSpeech';
import { useVoiceChess } from './hooks/useVoiceChess';

const ChessScene = React.lazy(() =>
  import('./ChessScene').then((module) => ({ default: module.ChessScene })),
);

const PIECES: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

const names: Record<string, string> = {
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
};

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function getPreferences() {
  try {
    return JSON.parse(localStorage.getItem('crystal-preferences') || '{}');
  } catch {
    return {};
  }
}

export function CrystalChessBoard(props: CrystalChessBoardProps) {
  const game = useChessGame(props);
  const { controller, state } = game;
  const room = useFriendRoom(controller);
  const [preferences] = useState(getPreferences);
  const [theme, setTheme] = useState<Theme>(
    ['amethyst', 'obsidian', 'frost'].includes(preferences.theme)
      ? preferences.theme
      : 'amethyst',
  );
  const [cinematic, setCinematic] = useState(() =>
    typeof preferences.cinematic === 'boolean'
      ? preferences.cinematic
      : !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [sound, setSound] = useState(preferences.sound !== false);
  const [volume, setVolumeState] = useState<number>(
    typeof preferences.volume === 'number' ? preferences.volume : 0.7,
  );
  const [quality, setQuality] = useState<'studio' | 'performance'>(
    preferences.quality === 'performance' ? 'performance' : 'studio',
  );
  const [webglSupported] = useState(supportsWebGL);
  const [viewMode, setViewMode] = useState<ViewMode>(() => supportsWebGL() ? '3d' : '2d');
  const [flipped, setFlipped] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState<
    'setup' | 'puzzles' | 'resign' | 'friends' | null
  >(null);
  const [setup, setSetup] = useState<
    GameSettings & { side: StandardColor | 'random' }
  >({ ...DEFAULT_SETTINGS, side: 'white' });
  const [command, setCommand] = useState('');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [solved, setSolved] = useState(false);
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('crystal-puzzles') || '[]');
    } catch {
      return [];
    }
  });
  const puzzleRef = useRef(puzzle);
  puzzleRef.current = puzzle;

  const [replay, setReplay] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const history = state.history;

  // Custom Hooks Extraction
  const {
    recording,
    exportHighlight,
    stopRecordingGracefully,
  } = useVideoExport(
    stage,
    game.setMessage,
    history.length,
    (idx) => setReplay(idx),
    (orb) => setOrbit(orb),
    (play) => setPlaying(play),
    cinematic,
  );

  const { hint, setHint, hintBusy, requestHint } = useEngineAnalysis(
    state.fen,
    state.history.length,
    state.turn,
    puzzle,
    () => controller.getFen(),
    game.setMessage,
  );

  const [replayPieces, setReplayPieces] = useState(game.pieces);
  const [replayAnimations, setReplayAnimations] = useState<
    Record<string, MoveAnimation>
  >({});
  const previousReplay = useRef<number | null>(null);

  const replayFen =
    replay === null
      ? state.fen
      : replay === 0
        ? state.initialFen
        : (history[replay - 1]?.fen ?? state.fen);

  const inputLocked =
    state.isAnimating ||
    state.isComputerThinking ||
    state.gameOver ||
    replay !== null ||
    (state.mode === 'online' && (!room.connected || !room.ready));

  const side = state.humanColor === 'black';

  useEffect(() => {
    setFlipped(side);
  }, [side]);

  const setVolume = (v: number) => {
    setVolumeState(v);
    setAudioVolume(v);
  };

  useEffect(() => {
    setAudioMuted(!sound);
    setAudioVolume(volume);
  }, [sound, volume]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'crystal-preferences',
        JSON.stringify({ theme, cinematic, sound, volume, quality }),
      );
    } catch {}
    controller.moveAnimationDuration = cinematic ? 360 : 120;
  }, [theme, cinematic, sound, volume, quality, controller]);

  game.onEvent.current = (_s, kind, square) => {
    if (sound) playChessSound(kind, square);
  };

  game.blocked.current = replay !== null;
  game.delegate.current =
    state.mode === 'online'
      ? room.move
      : puzzle
        ? async (m: MoveCommand): Promise<MoveResult> => {
            const active = puzzleRef.current;
            if (!active) return controller.move(m);
            const check = new Chess(controller.getFen());
            const index = controller.getState().history.length;
            let candidate;
            try {
              candidate = check.move(m);
            } catch {
              return {
                success: false,
                error: 'Find a legal move in this position.',
                fen: controller.getFen(),
              };
            }
            if (
              candidate.san !== active.line[index] &&
              !(active.mate && check.isCheckmate())
            ) {
              return {
                success: false,
                error: 'Not quite. Look for a forcing move and try again.',
                fen: controller.getFen(),
              };
            }
            const result = await controller.move(m);
            if (!result.success || puzzleRef.current?.id !== active.id) {
              return result;
            }
            if (check.isCheckmate() || index + 1 >= active.line.length) {
              setSolved(true);
              setCompleted((prev) => {
                const next = [...new Set([...prev, active.id])];
                try {
                  localStorage.setItem('crystal-puzzles', JSON.stringify(next));
                } catch {}
                return next;
              });
            } else {
              const reply = new Chess(controller.getFen()).move(
                active.line[index + 1],
              );
              await controller.move({
                from: reply.from,
                to: reply.to,
                promotion: reply.promotion as MoveCommand['promotion'],
              });
            }
            return result;
          }
        : null;

  useEffect(() => {
    if (replay === null) {
      previousReplay.current = null;
      return;
    }
    const finalPieces = piecesFromFen(replayFen);
    const previous = previousReplay.current;
    previousReplay.current = replay;
    if (previous !== null && replay === previous + 1) {
      const m = history[replay - 1];
      const before = piecesFromFen(
        previous === 0 ? state.initialFen : history[previous - 1].fen,
      );
      const animations: Record<string, MoveAnimation> = {};
      const add = (from: Square, to: Square) => {
        const p = before.find((pc) => pc.square === from);
        if (p) {
          animations[p.id] = {
            pieceId: p.id,
            from: squareToWorld(from),
            to: squareToWorld(to),
            startTime: performance.now(),
            duration: 400,
          };
        }
      };
      add(m.from, m.to);
      if (m.san.startsWith('O-O')) {
        const rank = m.from[1];
        add(
          `${m.to[0] === 'g' ? 'h' : 'a'}${rank}` as Square,
          `${m.to[0] === 'g' ? 'f' : 'd'}${rank}` as Square,
        );
      }
      setReplayPieces(before);
      setReplayAnimations(animations);
      const timer = setTimeout(() => {
        setReplayPieces(finalPieces);
        setReplayAnimations({});
      }, 400);
      return () => clearTimeout(timer);
    }
    setReplayPieces(finalPieces);
    setReplayAnimations({});
  }, [replay, replayFen, history, state.initialFen]);

  useEffect(() => {
    if (!playing || replay === null) return;
    if (replay >= history.length) {
      setPlaying(false);
      stopRecordingGracefully();
      return;
    }
    const timer = setTimeout(
      () => setReplay((p) => (p === null ? null : p + 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [playing, replay, history.length, stopRecordingGracefully]);

  function leaveReplay() {
    if (recording) return;
    setReplay(null);
    setPlaying(false);
    setOrbit(false);
  }

  function review(index: number) {
    setReplay(index);
    setPlaying(false);
    setResultDismissed(true);
    setDrawer(false);
  }

  function prepare() {
    room.leave();
    setReplay(null);
    setPlaying(false);
    setOrbit(false);
    setPuzzle(null);
    setSolved(false);
    setResultDismissed(false);
    game.setMessage('');
    setHint(null);
  }

  async function startGame() {
    prepare();
    const humanColor =
      setup.side === 'random'
        ? Math.random() < 0.5
          ? 'white'
          : 'black'
        : setup.side;
    setDialog(null);
    setDrawer(false);
    await controller.newGame(undefined, {
      mode: setup.mode,
      humanColor,
      difficulty: setup.difficulty,
      timeControl: setup.timeControl,
    });
  }

  async function startPuzzle(p: Puzzle) {
    prepare();
    setPuzzle(p);
    puzzleRef.current = p;
    setDialog(null);
    setDrawer(false);
    await controller.newGame(p.fen, {
      mode: 'puzzle',
      humanColor: 'white',
      timeControl: 'untimed',
    });
  }

  async function playCommand(e: React.FormEvent) {
    e.preventDefault();
    if (inputLocked) return;
    const parsed = ChessCommandParser.parseMove(command);
    if (!parsed.command) {
      game.setMessage(parsed.error ?? 'Use a move like e2 to e4.');
      return;
    }
    const result = await game.submit(parsed.command);
    if (result.success) setCommand('');
  }

  const voice = useVoiceChess({
    fen: state.fen,
    blocked: inputLocked,
    onMove: game.submit,
    onUndo: async () => {
      if (state.mode === 'online' || state.mode === 'puzzle') return 'Undo is unavailable in this game.';
      if (!state.history.length) return 'There is no move to take back.';
      await controller.undo();
    },
    onResign: () => {
      if (state.gameOver || state.mode === 'puzzle') return 'Resignation is unavailable right now.';
      if (state.mode === 'online') room.resign();
      else controller.resign();
    },
    onNewGame: startGame,
  });

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(room.invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      game.setMessage('Copy the invitation link from the field.');
    }
  }

  function downloadPgn() {
    const blob = new Blob([controller.getPgn()], {type:'application/x-chess-pgn'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `crystal-chess-${new Date().toISOString().slice(0,10)}.pgn`;
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const sceneState =
    replay === null
      ? {
          ...game,
          selectedSquare: hint?.from ?? game.selectedSquare,
          legalMoves: hint?.to
            ? [{ from: hint.from ?? hint.to, to: hint.to, isCapture: false }]
            : game.legalMoves,
        }
      : {
          ...game,
          pieces: replayPieces,
          activeAnimations: replayAnimations,
          captures: {},
          selectedSquare: null,
          legalMoves: [],
          checkSquare: null,
          handlePieceClick: async () => {},
          handleSquareClick: async () => {},
        };

  const captures = useMemo(() => {
    const totals = { white: [] as string[], black: [] as string[] };
    history.forEach((m) => {
      if (m.captured) totals[m.color === 'w' ? 'white' : 'black'].push(m.captured);
    });
    return totals;
  }, [history]);

  const material = useMemo(() => {
    const values: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };
    return new Chess(state.fen)
      .board()
      .flat()
      .reduce(
        (sum, p) =>
          sum + (p ? values[p.type] * (p.color === 'w' ? 1 : -1) : 0),
        0,
      );
  }, [state.fen]);

  const opponent = state.humanColor === 'white' ? 'black' : 'white';
  const lastMove = history.at(-1);
  const moveAnnouncement = lastMove
    ? describeSanMove(lastMove.san, lastMove.color === 'w' ? 'white' : 'black', Math.ceil(history.length / 2))
    : state.gameOver
      ? `Game over. ${state.winner === 'draw' ? 'Draw' : `${state.winner} wins`} by ${state.reason}.`
      : `${state.turn} to move`;

  return (
    <div
      className="chess-app"
      data-theme={theme}
      onPointerDown={() => {
        if (sound) {
          try {
            unlockSound();
          } catch {}
        }
      }}
    >
      <a className="skip-link" href="#game-controls">Skip to game controls</a>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{moveAnnouncement}</div>
      <header className="app-header">
        <div className="brand">
          <Diamond size={23} />
          <div>
            <h1>Crystal Chess</h1>
            <span>THE ART OF THE NEXT MOVE</span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setDialog('puzzles')}>
            Puzzles{' '}
            <span className="count">
              {completed.length}/{PUZZLES.length}
            </span>
          </button>
          <button aria-label="Play a friend" onClick={() => setDialog('friends')}>
            <Users size={16} />
            <span>Play a friend</span>
          </button>
          <button
            className="primary"
            onClick={() => {
              setSetup({
                ...state,
                side: state.humanColor,
                mode: state.mode === 'local' ? 'local' : 'computer',
              });
              setDialog('setup');
            }}
          >
            New game <span>↗</span>
          </button>
        </div>
      </header>

      <main className="game-layout">
        <section className="board-section" aria-label="Chess board">
          <div className="board-topline">
            <span className="eyebrow">
              {replay !== null
                ? 'THE REPLAY ROOM'
                : puzzle
                  ? 'THE TACTICS COLLECTION'
                  : room.room
                    ? 'A PRIVATE TABLE'
                    : 'YOUR NEXT BRILLIANT MOVE'}
            </span>
            <span className="edition">
              {theme === 'amethyst'
                ? '01 / AMETHYST'
                : theme === 'obsidian'
                  ? '02 / OBSIDIAN GOLD'
                  : '03 / FROST'}
            </span>
          </div>
          <div className="board-stage" ref={stage}>
            {viewMode === '2d' ? <AccessibleBoard2D
              fen={replayFen}
              flipped={flipped}
              selectedSquare={sceneState.selectedSquare}
              legalMoves={sceneState.legalMoves}
              checkSquare={sceneState.checkSquare}
              disabled={inputLocked && replay === null}
              onSquareClick={sceneState.handleSquareClick}
              onMove={replay === null ? async (from,to) => { await game.submit({from,to}); } : undefined}
            /> : <Suspense fallback={<div className="board-loading" role="status">Loading the 3D board…</div>}><ChessScene
              {...props}
              viewMode={viewMode}
              gameStateProps={sceneState}
              theme={theme}
              effects={replay === null ? game.effects : []}
              cinematic={cinematic}
              flipped={flipped}
              orbit={orbit && replay !== null}
              defeated={
                state.checkmate && replay === null
                  ? state.winner === 'white'
                    ? 'purple'
                    : 'white'
                  : undefined
              }
              isRecording={recording}
              quality={quality}
              onWebGLFailure={() => {
                setViewMode('2d');
                game.setMessage('The 3D renderer stopped, so the accessible 2D board is now active.');
              }}
            /></Suspense>}
            <div className="board-toolbar">
              <div className="segmented">
                <button
                  aria-pressed={viewMode === '3d'}
                  disabled={!webglSupported}
                  title={webglSupported ? 'Use the 3D board' : 'WebGL is unavailable on this device'}
                  onClick={() => setViewMode('3d')}
                >
                  3D
                </button>
                <button
                  aria-pressed={viewMode === '2d'}
                  onClick={() => setViewMode('2d')}
                >
                  2D
                </button>
              </div>
              <button
                className="icon-button"
                title="Flip board"
                aria-label="Flip board"
                onClick={() => setFlipped((v) => !v)}
              >
                <RotateCw size={16} />
              </button>
              <button
                className="icon-button"
                title={sound ? 'Mute sound' : 'Enable sound'}
                aria-label={sound ? 'Mute sound' : 'Enable sound'}
                onClick={() => {
                  if (!sound) {
                    try {
                      unlockSound();
                    } catch {}
                  }
                  setSound((v) => !v);
                }}
              >
                {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                className={`icon-button ${voice.enabled ? 'voice-active' : ''}`}
                title={voice.enabled ? 'Disable voice mode' : 'Enable voice mode'}
                aria-label={voice.enabled ? 'Disable voice mode' : 'Enable voice mode'}
                aria-pressed={voice.enabled}
                disabled={!voice.supported}
                onClick={voice.enabled ? voice.stop : () => {
                  unlockSound();
                  voice.begin();
                }}
              >
                {voice.enabled ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
            </div>
            {(voice.enabled || voice.feedback) && (
              <div className="voice-mode" role="status" aria-live="polite">
                <span className={voice.listening ? 'voice-pulse' : ''} />
                <div>
                  <strong>{voice.enabled ? (voice.listening ? 'Listening for a move…' : 'Restarting microphone…') : 'Voice mode unavailable'}</strong>
                  <small>
                    {voice.transcript ? `Heard: “${voice.transcript}”` : 'Try “pawn to e four” or “knight g one to f three.”'}
                    {voice.feedback ? ` ${voice.feedback}` : ''}
                  </small>
                </div>
              </div>
            )}
            {recording && (
              <div className="recording-badge">
                <i /> Recording highlight
              </div>
            )}
            {puzzle && (
              <div className="puzzle-banner">
                <span className="eyebrow">{puzzle.category}</span>
                <strong>{puzzle.title}</strong>
                <p>{solved ? puzzle.lesson : puzzle.description}</p>
                {solved && (
                  <span className="solved">
                    <Check size={16} />
                    Puzzle solved
                  </span>
                )}
                <button onClick={() => void startPuzzle(puzzle)}>
                  Retry puzzle
                </button>
                {solved && (
                  <button onClick={() => setDialog('puzzles')}>
                    Next puzzle →
                  </button>
                )}
              </div>
            )}
            {state.gameOver && !resultDismissed && replay === null && !puzzle && (
              <div className="result-overlay">
                <div className="result-card">
                  <span className="result-crown">♔</span>
                  <span className="eyebrow">{state.reason}</span>
                  <h2>
                    {state.winner === 'draw'
                      ? 'A game of equals'
                      : `${state.winner === 'white' ? 'White' : 'Black'} wins`}
                  </h2>
                  <p>{history.length} moves. Every choice tells a story.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      review(0);
                      setPlaying(true);
                      setOrbit(cinematic);
                    }}
                    disabled={!history.length}
                  >
                    <Play size={15} /> Watch the replay
                  </button>
                  <button onClick={() => setResultDismissed(true)}>
                    Back to the board
                  </button>
                  <button onClick={downloadPgn}>Download PGN</button>
                </div>
              </div>
            )}
            {game.promotion && (
              <Dialog
                title="Choose your promotion"
                onClose={() => game.setPromotion(null)}
              >
                <p>Your pawn has earned its next chapter.</p>
                <div className="promotion-options">
                  {(['q', 'r', 'b', 'n'] as const).map((p) => (
                    <button
                      key={p}
                      aria-label={`Promote to ${names[p]}`}
                      onClick={() => {
                        void game.submit({ ...game.promotion!, promotion: p });
                        game.setPromotion(null);
                      }}
                    >
                      <span>{PIECES[p]}</span>
                      {names[p]}
                    </button>
                  ))}
                </div>
              </Dialog>
            )}
          </div>

          {replay !== null ? (
            <ReplayBar
              replay={replay}
              history={history}
              recording={recording}
              playing={playing}
              orbit={orbit}
              leaveReplay={leaveReplay}
              review={review}
              setPlaying={setPlaying}
              setReplay={setReplay}
              setOrbit={setOrbit}
              exportHighlight={exportHighlight}
            />
          ) : (
            <div className="board-bottomline">
              <span>
                <i className="status-dot" />
                {state.gameOver
                  ? 'Game complete'
                  : state.isComputerThinking
                    ? 'Stockfish is considering its next move…'
                    : state.inCheck
                      ? 'Your king is in check'
                      : `${state.turn === 'white' ? 'White' : 'Black'} to move`}
              </span>
              <span className="board-help">
                Click a piece to begin · Drag to orbit
              </span>
            </div>
          )}
        </section>

        <button
          className="mobile-drawer-toggle"
          onClick={() => setDrawer((v) => !v)}
          aria-expanded={drawer}
        >
          Game controls & moves{' '}
          {drawer ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>

        <GamePanel
          drawer={drawer}
          puzzle={puzzle}
          state={state}
          opponent={opponent}
          history={history}
          recording={recording}
          replay={replay}
          inputLocked={inputLocked}
          controller={controller}
          hintBusy={hintBusy}
          solved={solved}
          hint={hint}
          room={room}
          command={command}
          message={game.message}
          storageError={game.storageError}
          theme={theme}
          cinematic={cinematic}
          captures={captures}
          material={material}
          sound={sound}
          volume={volume}
          quality={quality}
          review={review}
          requestHint={requestHint}
          setDialog={setDialog}
          setHint={setHint}
          playCommand={playCommand}
          setCommand={setCommand}
          setTheme={setTheme}
          setCinematic={setCinematic}
          setSound={setSound}
          setVolume={setVolume}
          setQuality={setQuality}
        />
      </main>

      <footer className="app-footer">
        <span>PLAY BEAUTIFULLY.</span>
        <span>
          Built for the love of the game <Diamond size={11} />
        </span>
      </footer>

      <SetupDialog
        dialog={dialog}
        setDialog={setDialog}
        setup={setup}
        setSetup={setSetup}
        startGame={startGame}
      />
      <PuzzlesDialog
        dialog={dialog}
        setDialog={setDialog}
        completed={completed}
        startPuzzle={startPuzzle}
      />
      <ResignDialog
        dialog={dialog}
        setDialog={setDialog}
        state={state}
        room={room}
        controller={controller}
        setResultDismissed={setResultDismissed}
      />
      <FriendsDialog
        dialog={dialog}
        setDialog={setDialog}
        room={room}
        setup={setup}
        setSetup={setSetup}
        setPuzzle={setPuzzle}
        puzzleRef={puzzleRef}
        setReplay={setReplay}
        setPlaying={setPlaying}
        setResultDismissed={setResultDismissed}
        copyInvite={copyInvite}
        copied={copied}
      />
    </div>
  );
}

export default CrystalChessBoard;
