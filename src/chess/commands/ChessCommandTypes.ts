import { MoveCommand } from "../ChessTypes";

export interface ParseMoveResult {
  success: boolean;
  command?: MoveCommand;
  error?: string;
}

export type ChessCommand =
  | { type: "move"; command: MoveCommand }
  | { type: "newGame" }
  | { type: "undo" }
  | { type: "resign" }
  | { type: "unknown"; raw: string };
