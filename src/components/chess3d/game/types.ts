import { Square, PieceSymbol } from "chess.js";

export type PieceColor = "white" | "purple";
export type ViewMode = "3d" | "2d";

export interface BoardPiece {
  id: string;
  square: Square;
  type: PieceSymbol; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
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

export interface CrystalChessBoardProps {
  initialFen?: string;
  purpleAtBottom?: boolean;
  interactive?: boolean;
  showLegalMoves?: boolean;
  enableCameraControls?: boolean;
  quality?: "performance" | "studio" | "medium" | "high" | "ultra";
  viewMode?: ViewMode;
  onMove?: (move: {
    from: Square;
    to: Square;
    san: string;
    fen: string;
  }) => void;
  onCheck?: (inCheck: boolean) => void;
  onCheckmate?: (winner: PieceColor | "draw") => void;
  onGameOver?: (result: {
    winner: PieceColor | "draw";
    reason: string;
  }) => void;
  onPositionChange?: (fen: string) => void;
}
