import { ChessController } from "../ChessController";
import { ChessCommandParser } from "../commands/ChessCommandParser";
import {
  ChessGameState,
  ChessLegalMove,
  EngineDifficulty,
  EngineStatus,
  MoveCommand,
  MoveResult,
} from "../ChessTypes";
import { ChessEventListener } from "../events/ChessEvents";

/**
 * Future Atlas / Jarvis Voice Assistant Skill Boundary.
 *
 * Exposes a clean, serializable, async-ready interface for the voice agent.
 * Voice skills simply call:
 *    await skillAdapter.executeMove("e2 to e4");
 *    or
 *    await skillAdapter.executeMove({ from: "e2", to: "e4" });
 *
 * NO speech recognition, microphone, or voice synthesis is implemented here.
 * This adapter makes the entire chess subsystem voice-ready for Atlas.
 */
export class ChessSkillAdapter {
  private controller: ChessController;

  constructor(controller: ChessController) {
    this.controller = controller;
  }

  /**
   * Execute move via structured MoveCommand OR natural/deterministic text ("e2 to e4").
   */
  public async executeMove(
    commandOrText: MoveCommand | string,
  ): Promise<MoveResult> {
    if (typeof commandOrText === "string") {
      const parsed = ChessCommandParser.parseMove(commandOrText);
      if (!parsed.success || !parsed.command) {
        return {
          success: false,
          error: parsed.error || `Could not parse command "${commandOrText}"`,
          errorCode: "INVALID_COMMAND",
          fen: this.controller.getFen(),
        };
      }
      return this.controller.move(parsed.command);
    }

    return this.controller.move(commandOrText);
  }

  /**
   * Get serializable game state for Atlas AI understanding.
   */
  public getState(): ChessGameState {
    return this.controller.getState();
  }

  /**
   * Get legal moves for a piece or whole board.
   */
  public getLegalMoves(square?: string): ChessLegalMove[] {
    return this.controller.getLegalMoves(square);
  }

  /**
   * Start a new game.
   */
  public async newGame(fen?: string): Promise<void> {
    return this.controller.newGame(fen);
  }

  /**
   * Take back previous move.
   */
  public async undo(): Promise<void> {
    return this.controller.undo();
  }

  /**
   * Concede game.
   */
  public resign(): void {
    this.controller.resign();
  }

  /**
   * Set engine strength ('beginner' | 'easy' | 'medium' | 'hard' | 'expert').
   */
  public async setDifficulty(difficulty: EngineDifficulty): Promise<void> {
    return this.controller.setDifficulty(difficulty);
  }

  /**
   * Check engine readiness ('ready' | 'thinking' | 'loading' | 'error').
   */
  public getEngineStatus(): EngineStatus {
    return this.controller.getState().engineStatus;
  }

  /**
   * Subscribe to game events (e.g. computer moved, in check, checkmate).
   */
  public onEvent(listener: ChessEventListener): () => void {
    return this.controller.subscribe(listener);
  }
}
