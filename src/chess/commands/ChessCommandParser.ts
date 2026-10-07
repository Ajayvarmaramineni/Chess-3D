import { MoveCommand } from "../ChessTypes";
import { ChessCommand, ParseMoveResult } from "./ChessCommandTypes";

/**
 * Deterministic command parser for chess moves and control commands.
 * Handles:
 *  - "e2 to e4", "move e2 to e4", "pawn e2 to e4", "e2 e4"
 *  - "e7 to e8 queen", "e7 e8 q", "pawn e7 to e8 queen"
 *  - "new game", "restart", "undo", "resign"
 *
 * Normalizes uppercase/lowercase, punctuation, extra whitespace.
 * Pure deterministic matching — zero LLM overhead.
 */
export class ChessCommandParser {
  private static SQUARE_REGEX = /^[a-h][1-8]$/;

  private static PROMOTION_MAP: Record<string, "q" | "r" | "b" | "n"> = {
    queen: "q",
    q: "q",
    rook: "r",
    r: "r",
    bishop: "b",
    b: "b",
    knight: "n",
    n: "n",
    horse: "n",
  };

  /**
   * Parse a raw input string into a structured MoveCommand.
   */
  public static parseMove(input: string): ParseMoveResult {
    if (!input || typeof input !== "string") {
      return { success: false, error: "Empty command input" };
    }

    // Clean and normalize input
    const cleaned = input
      .trim()
      .toLowerCase()
      .replace(/[,;:.!?]/g, " ")
      .replace(/\s+/g, " ");

    if (!cleaned) {
      return { success: false, error: "Empty command input" };
    }

    const tokens = cleaned.split(" ").filter(Boolean);

    // Remove leading conversational/decorative tokens
    const filteredTokens: string[] = [];
    const ignoredWords = new Set([
      "move",
      "play",
      "put",
      "push",
      "slide",
      "piece",
      "pawn",
      "knight",
      "horse",
      "bishop",
      "rook",
      "castle",
      "queen",
      "king",
      "the",
      "my",
    ]);

    for (const tok of tokens) {
      if (!ignoredWords.has(tok) || this.PROMOTION_MAP[tok] || tok === "to") {
        filteredTokens.push(tok);
      }
    }

    // Try finding two valid squares in order
    let from: string | null = null;
    let to: string | null = null;
    let promotion: "q" | "r" | "b" | "n" | undefined = undefined;

    // Pattern 1: Tokens containing squares
    for (let i = 0; i < filteredTokens.length; i++) {
      const tok = filteredTokens[i];

      if (tok === "to") {
        continue;
      }

      // Check if token is a 4-char UCI string like "e2e4" or "e7e8q"
      if (tok.length === 4 || tok.length === 5) {
        const potentialFrom = tok.slice(0, 2);
        const potentialTo = tok.slice(2, 4);
        if (
          this.SQUARE_REGEX.test(potentialFrom) &&
          this.SQUARE_REGEX.test(potentialTo)
        ) {
          from = potentialFrom;
          to = potentialTo;
          if (tok.length === 5) {
            const promoChar = tok[4];
            if (this.PROMOTION_MAP[promoChar]) {
              promotion = this.PROMOTION_MAP[promoChar];
            }
          }
          break;
        }
      }

      if (this.SQUARE_REGEX.test(tok)) {
        if (!from) {
          from = tok;
        } else if (!to) {
          to = tok;
        }
      } else if (this.PROMOTION_MAP[tok]) {
        promotion = this.PROMOTION_MAP[tok];
      }
    }

    if (!from || !to) {
      return {
        success: false,
        error: `Could not determine valid from/to squares from "${input}"`,
      };
    }

    const command: MoveCommand = {
      from,
      to,
      ...(promotion ? { promotion } : {}),
    };

    return { success: true, command };
  }

  /**
   * Parse any game command (move, newGame, undo, resign).
   */
  public static parseCommand(input: string): ChessCommand {
    const cleaned = input.trim().toLowerCase();

    if (
      cleaned === "new game" ||
      cleaned === "restart" ||
      cleaned === "reset"
    ) {
      return { type: "newGame" };
    }

    if (cleaned === "undo" || cleaned === "take back") {
      return { type: "undo" };
    }

    if (
      cleaned === "resign" ||
      cleaned === "give up" ||
      cleaned === "surrender"
    ) {
      return { type: "resign" };
    }

    const moveRes = this.parseMove(input);
    if (moveRes.success && moveRes.command) {
      return { type: "move", command: moveRes.command };
    }

    return { type: "unknown", raw: input };
  }
}
