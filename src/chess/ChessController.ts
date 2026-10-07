import { Chess, Square, Move } from "chess.js";
import {
  ChessGameState,
  ChessLegalMove,
  EngineDifficulty,
  MoveCommand,
  MoveResult,
  StandardColor,
  GameSettings,
  HistoryEntry,
  SavedGame,
} from "./ChessTypes";
import { ChessEngine, StockfishEngine } from "./engine/StockfishEngine";
import { ChessEvent, ChessEventListener } from "./events/ChessEvents";

export interface ChessGameOptions extends Partial<GameSettings> {
  engine?: ChessEngine;
  initialFen?: string;
  autoPlayBlackWithEngine?: boolean;
}
export const DEFAULT_SETTINGS: GameSettings = {
  humanColor: "white",
  mode: "computer",
  difficulty: "medium",
  timeControl: "untimed",
};
export const TIME_CONTROLS = {
  untimed: [0, 0],
  "3+2": [180000, 2000],
  "5+0": [300000, 0],
  "10+0": [600000, 0],
} as const;
const opposite = (color: StandardColor): StandardColor =>
  color === "white" ? "black" : "white";

/** Owns rules, result, history and clocks. Rendering only observes this state. */
export class ChessController {
  private chess: Chess;
  private engine: ChessEngine;
  private listeners = new Set<ChessEventListener>();
  private revision = 0;
  private isAnimating = false;
  private isComputerThinking = false;
  private settings: GameSettings;
  private initialFen: string;
  private history: HistoryEntry[] = [];
  private clocks: Record<StandardColor, number> = { white: 0, black: 0 };
  private clockAt = Date.now();
  private terminal?: SavedGame["terminal"];
  private engineError?: string;
  private running = false;
  public moveAnimationDuration = 320;

  constructor(options: ChessGameOptions = {}) {
    this.chess = new Chess(options.initialFen);
    this.initialFen = this.chess.fen();
    this.engine = options.engine ?? new StockfishEngine();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(
        Object.entries(options).filter(([k]) => k in DEFAULT_SETTINGS),
      ),
    };
    if (options.autoPlayBlackWithEngine === false) this.settings.mode = "local";
    this.resetClock();
  }
  public subscribe(listener: ChessEventListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit(event: ChessEvent) {
    this.listeners.forEach((l) => l(event));
  }
  private emitState() {
    this.emit({
      type: "state.changed",
      state: this.getState(),
      timestamp: performance.now(),
    });
  }
  private syncBoard() {
    this.emit({
      type: "game.started",
      fen: this.chess.fen(),
      timestamp: performance.now(),
    });
    this.emitState();
  }
  public getFen() {
    return this.chess.fen();
  }
  public getPgn() {
    return this.chess.pgn();
  }
  public getTurn(): StandardColor {
    return this.chess.turn() === "w" ? "white" : "black";
  }
  public isGameOver() {
    return !!this.terminal || this.chess.isGameOver();
  }
  public getRevision() {
    return this.revision;
  }
  public getDifficulty() {
    return this.settings.difficulty;
  }
  public getLegalMoves(square?: string): ChessLegalMove[] {
    if (this.isGameOver()) return [];
    if (square && !/^[a-h][1-8]$/.test(square)) return [];
    const moves = this.chess.moves({
      ...(square ? { square: square as Square } : {}),
      verbose: true,
    }) as Move[];
    return moves.map((m) => ({
      from: m.from,
      to: m.to,
      isCapture: !!m.captured,
      promotion: !!m.promotion,
    }));
  }
  public getState(): ChessGameState {
    const inCheck = this.chess.inCheck();
    const king = this.chess
      .board()
      .flat()
      .find((p) => p?.type === "k" && p.color === this.chess.turn());
    const last = this.history.at(-1);
    const gameOver = this.isGameOver();
    return {
      ...this.settings,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      initialFen: this.initialFen,
      history: [...this.history],
      clocks: { ...this.clocks },
      turn: this.getTurn(),
      moveNumber: this.chess.moveNumber(),
      lastMove: last
        ? { from: last.from, to: last.to, san: last.san }
        : undefined,
      inCheck,
      checkSquare: inCheck ? king?.square : null,
      checkmate: this.chess.isCheckmate(),
      stalemate: this.chess.isStalemate(),
      draw: this.terminal?.winner === "draw" || this.chess.isDraw(),
      gameOver,
      isAnimating: this.isAnimating,
      isComputerThinking: this.isComputerThinking,
      engineStatus: this.engine.getStatus(),
      engineError: this.engineError,
      legalMoves: this.getLegalMoves(),
      winner:
        this.terminal?.winner ??
        (gameOver
          ? this.chess.isCheckmate()
            ? opposite(this.getTurn())
            : "draw"
          : undefined),
      reason:
        this.terminal?.reason ??
        (this.chess.isCheckmate()
          ? "checkmate"
          : this.chess.isStalemate()
            ? "stalemate"
            : this.chess.isThreefoldRepetition()
              ? "threefold repetition"
              : this.chess.isInsufficientMaterial()
                ? "insufficient material"
                : this.chess.isDraw()
                  ? "draw by rule"
                  : undefined),
    };
  }
  public async start() {
    const runRevision = this.revision;
    this.running = true;
    this.clockAt = Date.now();
    if (this.settings.mode === "computer" && !this.isGameOver()) {
      try {
        await this.engine.initialize();
        if (!this.running || runRevision !== this.revision) return;
        await this.engine.setDifficulty(this.settings.difficulty);
        this.engineError = undefined;
        this.emitState();
        await this.computerMove();
      } catch {
        if (!this.running || runRevision !== this.revision) return;
        this.engineError =
          "The chess engine could not start. Retry the engine or start a local game.";
        this.emitState();
      }
    }
  }
  public dispose() {
    this.running = false;
    this.revision++;
    this.engine.dispose();
    this.isComputerThinking = false;
  }
  private resetClock() {
    const time = TIME_CONTROLS[this.settings.timeControl][0];
    this.clocks = { white: time, black: time };
    this.clockAt = Date.now();
  }
  public pauseClock() {
    this.clockAt = Date.now();
  }
  public async syncRemote(saved: SavedGame, color: StandardColor) {
    const incoming = {
      ...saved,
      settings: { ...saved.settings, mode: "online" as const, humanColor: color },
    };
    const currentMoves = this.serialize().moves;
    const sameMove = (a: MoveCommand, b: MoveCommand) =>
      a.from === b.from && a.to === b.to && a.promotion === b.promotion;
    const isSingleNewMove =
      this.settings.mode === "online" &&
      saved.moves.length === currentMoves.length + 1 &&
      currentMoves.every((move, index) => sameMove(move, saved.moves[index]));

    if (isSingleNewMove) {
      const next = saved.moves.at(-1)!;
      const result = await this.move(
        { from: next.from, to: next.to, promotion: next.promotion },
        "remote",
      );
      if (result.success) {
        this.restore(incoming);
        return;
      }
    }

    if (
      saved.moves.length !== currentMoves.length ||
      !saved.moves.every((move, index) => sameMove(move, currentMoves[index])) ||
      JSON.stringify(saved.terminal) !== JSON.stringify(this.terminal) ||
      this.settings.mode !== "online"
    ) {
      this.restore(incoming);
    } else {
      this.clocks = { ...saved.clocks };
      this.emitState();
    }
  }
  public syncRemoteClocks(clocks: Record<StandardColor, number>) {
    if (
      !Number.isFinite(clocks.white) ||
      !Number.isFinite(clocks.black) ||
      clocks.white < 0 ||
      clocks.black < 0
    )
      return;
    this.clocks = { ...clocks };
    this.clockAt = Date.now();
    this.emitState();
  }
  public tick(now = Date.now()) {
    if (
      this.isGameOver() ||
      this.settings.timeControl === "untimed" ||
      this.isAnimating
    ) {
      this.clockAt = now;
      return;
    }
    const color = this.getTurn();
    this.clocks[color] = Math.max(
      0,
      this.clocks[color] - Math.max(0, now - this.clockAt),
    );
    this.clockAt = now;
    if (this.clocks[color] === 0) {
      const opponent = opposite(color);
      const pieces = this.chess
        .board()
        .flat()
        .filter((p) => p && p.color === (opponent === "white" ? "w" : "b"));
      this.terminal = {
        winner: pieces.length === 1 ? "draw" : opponent,
        reason:
          pieces.length === 1
            ? "timeout • opponent has only a king"
            : "timeout",
      };
      this.revision++;
      this.engine.stop();
      this.isComputerThinking = false;
    }
    this.emitState();
  }
  public async move(
    command: MoveCommand,
    source: "human" | "engine" | "remote" = "human",
  ): Promise<MoveResult> {
    const fail = (
      error: string,
      errorCode: MoveResult["errorCode"],
    ): MoveResult => ({ success: false, error, errorCode, fen: this.getFen() });
    if (this.isAnimating)
      return fail("Wait for the current move.", "ANIMATION_IN_PROGRESS");
    if (this.isComputerThinking && source !== "engine")
      return fail("The engine is thinking.", "COMPUTER_THINKING");
    this.tick();
    if (this.isGameOver()) return fail("This game has ended.", "GAME_OVER");
    if (
      this.settings.mode === "computer" &&
      source === "human" &&
      this.getTurn() !== this.settings.humanColor
    )
      return fail("It is the computer’s turn.", "NOT_YOUR_TURN");
    const from = command.from?.toLowerCase(),
      to = command.to?.toLowerCase();
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to))
      return fail("Use valid squares such as e2 and e4.", "INVALID_SQUARE");
    const choices = this.chess.moves({
      square: from as Square,
      verbose: true,
    }) as Move[];
    if (choices.some((m) => m.to === to && m.promotion) && !command.promotion)
      return fail("Choose a piece for promotion.", "PROMOTION_REQUIRED");
    let m: Move;
    try {
      m = this.chess.move({ from, to, promotion: command.promotion });
      if (!m) throw Error();
    } catch {
      return fail("That move is not legal in this position.", "ILLEGAL_MOVE");
    }
    const rev = ++this.revision;
    const color = m.color === "w" ? "white" : "black";
    this.clocks[color] += TIME_CONTROLS[this.settings.timeControl][1];
    this.history.push({
      from: m.from,
      to: m.to,
      san: m.san,
      fen: this.getFen(),
      captured: m.captured,
      color: m.color,
      promotion: m.promotion,
      clocks: { ...this.clocks },
    });
    this.isAnimating = true;
    try {
      this.emit({
        type: "move.started",
        from: m.from,
        to: m.to,
        color,
        san: m.san,
        timestamp: performance.now(),
      });
      if (m.captured)
        this.emit({
          type: "piece.captured",
          square: (m.flags.includes("e")
            ? `${m.to[0]}${m.from[1]}`
            : m.to) as Square,
          capturedPiece: m.captured,
          byColor: color,
          timestamp: performance.now(),
        });
      this.emitState();
      if (this.moveAnimationDuration)
        await new Promise((r) => setTimeout(r, this.moveAnimationDuration));
      if (rev !== this.revision)
        return fail("The game changed during this move.", "GAME_OVER");
    } finally {
      this.isAnimating = false;
    }
    this.clockAt = Date.now();
    const result: MoveResult = {
      success: true,
      move: {
        from: m.from,
        to: m.to,
        color: m.color,
        piece: m.piece,
        captured: m.captured,
        promotion: m.promotion,
        san: m.san,
        lan: m.lan,
        flags: m.flags,
      },
      fen: this.getFen(),
    };
    this.emit({ type: "move.completed", result, timestamp: performance.now() });
    const state = this.getState();
    if (state.checkmate)
      this.emit({
        type: "checkmate",
        winner: state.winner as StandardColor,
        timestamp: performance.now(),
      });
    else if (state.stalemate)
      this.emit({ type: "stalemate", timestamp: performance.now() });
    else if (state.draw)
      this.emit({
        type: "draw",
        reason: state.reason!,
        timestamp: performance.now(),
      });
    else if (state.inCheck)
      this.emit({
        type: "check",
        kingSquare: state.checkSquare!,
        turn: state.turn,
        timestamp: performance.now(),
      });
    this.emitState();
    if (this.running) void this.computerMove();
    return result;
  }
  private async computerMove() {
    if (
      this.settings.mode !== "computer" ||
      this.getTurn() === this.settings.humanColor ||
      this.isGameOver() ||
      this.isComputerThinking ||
      this.isAnimating
    )
      return;
    const rev = this.revision;
    this.isComputerThinking = true;
    this.engineError = undefined;
    this.emitState();
    try {
      const move = await this.engine.getBestMove(this.getFen());
      if (rev !== this.revision || !this.running) return;
      this.isComputerThinking = false;
      await this.move(move, "engine");
    } catch {
      if (rev === this.revision) {
        this.isComputerThinking = false;
        this.engineError = "Engine interrupted. Retry to continue this game.";
        this.emitState();
      }
    }
  }
  public async retryEngine() {
    this.engine.dispose();
    this.engineError = undefined;
    await this.start();
  }
  public async newGame(fen?: string, settings: Partial<GameSettings> = {}) {
    const next = new Chess(fen);
    this.engine.stop();
    this.revision++;
    this.chess = next;
    this.initialFen = next.fen();
    this.history = [];
    this.settings = { ...this.settings, ...settings };
    this.terminal = undefined;
    this.engineError = undefined;
    this.isAnimating = false;
    this.isComputerThinking = false;
    this.resetClock();
    this.syncBoard();
    if (this.running) await this.start();
  }
  public async undo() {
    if (
      this.isAnimating ||
      this.isComputerThinking ||
      !this.history.length ||
      this.terminal
    )
      return;
    this.engine.stop();
    this.revision++;
    this.chess.undo();
    this.history.pop();
    if (
      this.settings.mode === "computer" &&
      this.getTurn() !== this.settings.humanColor &&
      this.history.length
    ) {
      this.chess.undo();
      this.history.pop();
    }
    this.resetClock();
    if (this.history.length) this.clocks = { ...this.history.at(-1)!.clocks };
    this.syncBoard();
  }
  public resign(color = this.settings.humanColor) {
    if (this.isGameOver()) return;
    this.engine.stop();
    this.revision++;
    this.isAnimating = false;
    this.isComputerThinking = false;
    this.terminal = { winner: opposite(color), reason: "resignation" };
    this.emit({
      type: "game.resigned",
      winner: opposite(color),
      timestamp: performance.now(),
    });
    this.syncBoard();
  }
  public endDraw(reason = "draw by agreement") {
    if (this.isGameOver()) return;
    this.engine.stop();
    this.revision++;
    this.isAnimating = false;
    this.isComputerThinking = false;
    this.terminal = { winner: "draw", reason };
    this.emit({ type: "draw", reason, timestamp: performance.now() });
    this.syncBoard();
  }
  public async setDifficulty(difficulty: EngineDifficulty) {
    this.settings.difficulty = difficulty;
    await this.engine.setDifficulty(difficulty);
    this.emitState();
  }
  public serialize(): SavedGame {
    return {
      version: 2,
      initialFen: this.initialFen,
      moves: this.history.map((m) => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion as MoveCommand["promotion"],
        clocks: { ...m.clocks },
      })),
      settings: { ...this.settings },
      clocks: { ...this.clocks },
      terminal: this.terminal,
    };
  }
  public restore(saved: SavedGame) {
    if (
      ![1, 2].includes(saved.version) ||
      !Array.isArray(saved.moves) ||
      saved.moves.length > 2000 ||
      !saved.settings ||
      !["computer", "local", "puzzle", "online"].includes(
        saved.settings.mode,
      ) ||
      !["white", "black"].includes(saved.settings.humanColor) ||
      !(saved.settings.timeControl in TIME_CONTROLS) ||
      !["beginner", "easy", "medium", "hard", "expert"].includes(
        saved.settings.difficulty,
      ) ||
      !Number.isFinite(saved.clocks?.white) ||
      !Number.isFinite(saved.clocks?.black)
    )
      throw Error("Invalid saved game");
    const chess = new Chess(saved.initialFen);
    const history: HistoryEntry[] = [];
    for (const move of saved.moves) {
      const m = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (!m) throw Error("Invalid saved move");
      history.push({
        from: m.from,
        to: m.to,
        san: m.san,
        fen: chess.fen(),
        color: m.color,
        captured: m.captured,
        promotion: m.promotion,
        clocks: { ...(move.clocks ?? saved.clocks) },
      });
    }
    this.engine.stop();
    this.revision++;
    this.chess = chess;
    this.initialFen = saved.initialFen;
    this.history = history;
    this.settings = { ...saved.settings };
    this.clocks = { ...saved.clocks };
    this.terminal = saved.terminal;
    this.isAnimating = false;
    this.isComputerThinking = false;
    this.clockAt = Date.now();
    this.syncBoard();
  }
}
