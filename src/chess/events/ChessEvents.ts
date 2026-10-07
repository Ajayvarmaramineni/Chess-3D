import { Square } from "chess.js";
import { ChessGameState, MoveResult } from "../ChessTypes";

export type ChessEventType =
  | "game.started"
  | "move.started"
  | "move.completed"
  | "move.rejected"
  | "computer.thinking"
  | "computer.move"
  | "piece.captured"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "game.resigned"
  | "state.changed";

export interface BaseChessEvent {
  type: ChessEventType;
  timestamp: number;
}

export interface GameStartedEvent extends BaseChessEvent {
  type: "game.started";
  fen: string;
}

export interface MoveStartedEvent extends BaseChessEvent {
  type: "move.started";
  from: Square;
  to: Square;
  color: "white" | "black";
  san?: string;
}

export interface MoveCompletedEvent extends BaseChessEvent {
  type: "move.completed";
  result: MoveResult;
}

export interface MoveRejectedEvent extends BaseChessEvent {
  type: "move.rejected";
  from: string;
  to: string;
  error: string;
}

export interface ComputerThinkingEvent extends BaseChessEvent {
  type: "computer.thinking";
  fen: string;
}

export interface ComputerMoveEvent extends BaseChessEvent {
  type: "computer.move";
  from: Square;
  to: Square;
  san: string;
}

export interface PieceCapturedEvent extends BaseChessEvent {
  type: "piece.captured";
  square: Square;
  capturedPiece: string;
  byColor: "white" | "black";
}

export interface CheckEvent extends BaseChessEvent {
  type: "check";
  kingSquare: Square;
  turn: "white" | "black";
}

export interface CheckmateEvent extends BaseChessEvent {
  type: "checkmate";
  winner: "white" | "black";
}

export interface StalemateEvent extends BaseChessEvent {
  type: "stalemate";
}

export interface DrawEvent extends BaseChessEvent {
  type: "draw";
  reason: string;
}

export interface GameResignedEvent extends BaseChessEvent {
  type: "game.resigned";
  winner: "white" | "black";
}

export interface StateChangedEvent extends BaseChessEvent {
  type: "state.changed";
  state: ChessGameState;
}

export type ChessEvent =
  | GameStartedEvent
  | MoveStartedEvent
  | MoveCompletedEvent
  | MoveRejectedEvent
  | ComputerThinkingEvent
  | ComputerMoveEvent
  | PieceCapturedEvent
  | CheckEvent
  | CheckmateEvent
  | StalemateEvent
  | DrawEvent
  | GameResignedEvent
  | StateChangedEvent;

export type ChessEventListener = (event: ChessEvent) => void;
