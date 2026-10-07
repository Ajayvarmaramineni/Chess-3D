import { Square, PieceSymbol } from "chess.js";

export type PieceColor = "white" | "purple"; // 'purple' corresponds to Black in the 3D crystal theme
export type StandardColor = "white" | "black";
export type ViewMode = "3d" | "2d";
export type EngineDifficulty =
  "beginner" | "easy" | "medium" | "hard" | "expert";
export type EngineStatus =
  "uninitialized" | "loading" | "ready" | "thinking" | "error";

export interface MoveCommand {
  from: string; // e.g. "e2"
  to: string; // e.g. "e4"
  promotion?: "q" | "r" | "b" | "n";
}

export type MoveErrorCode =
  | "NOT_YOUR_TURN"
  | "INVALID_SQUARE"
  | "ILLEGAL_MOVE"
  | "GAME_OVER"
  | "ANIMATION_IN_PROGRESS"
  | "COMPUTER_THINKING"
  | "PROMOTION_REQUIRED"
  | "INVALID_COMMAND"
  | "ENGINE_ERROR";

export interface MoveResult {
  success: boolean;
  move?: {
    from: Square;
    to: Square;
    color: "w" | "b";
    piece: PieceSymbol;
    captured?: PieceSymbol;
    promotion?: PieceSymbol;
    san: string;
    lan: string;
    flags: string;
  };
  error?: string;
  errorCode?: MoveErrorCode;
  fen: string;
}

export interface ChessLegalMove {
  from: Square;
  to: Square;
  isCapture: boolean;
  promotion?: boolean;
}

export interface ChessGameState extends GameSettings {
  initialFen: string;
  history: HistoryEntry[];
  clocks: Record<StandardColor, number>;
  reason?: string;
  engineError?: string;
  fen: string;
  pgn: string;
  turn: StandardColor;
  moveNumber: number;
  lastMove?: {
    from: string;
    to: string;
    san?: string;
  };
  inCheck: boolean;
  checkSquare?: Square | null;
  checkmate: boolean;
  stalemate: boolean;
  draw: boolean;
  gameOver: boolean;
  isAnimating: boolean;
  isComputerThinking: boolean;
  engineStatus: EngineStatus;
  difficulty: EngineDifficulty;
  legalMoves?: ChessLegalMove[];
  winner?: StandardColor | "draw";
}

export interface BoardPiece {
  id: string;
  square: Square;
  type: PieceSymbol;
  color: PieceColor;
  captured?: boolean;
}

export interface MoveAnimation {
  pieceId: string;
  from: [number, number, number];
  to: [number, number, number];
  startTime: number;
  duration: number;
  onComplete?: () => void;
}

export interface CaptureAnimation {
  pieceId: string;
  startTime: number;
  duration: number;
}

export type GameMode = "computer" | "local" | "puzzle" | "online";
export type TimeControl = "untimed" | "3+2" | "5+0" | "10+0";
export interface GameSettings {
  humanColor: StandardColor;
  mode: GameMode;
  difficulty: EngineDifficulty;
  timeControl: TimeControl;
}
export interface HistoryEntry {
  from: Square;
  to: Square;
  san: string;
  fen: string;
  captured?: PieceSymbol;
  color: "w" | "b";
  promotion?: PieceSymbol;
  clocks: Record<StandardColor, number>;
}
export interface SavedGame {
  version: 1 | 2;
  initialFen: string;
  moves: Array<MoveCommand & { clocks?: Record<StandardColor, number> }>;
  settings: GameSettings;
  clocks: Record<StandardColor, number>;
  terminal?: { winner: StandardColor | "draw"; reason: string };
}
