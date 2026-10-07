import { Square } from "chess.js";

export const SQUARE_SIZE = 1.0;
export const BOARD_SURFACE_Y = 0.2; // Height of the board surface where pieces rest

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

/**
 * Maps a chess square (e.g. 'e4') to 3D world coordinates.
 * White side is at +Z, Purple (Black) side is at -Z.
 * File 'a' is at -3.5, File 'h' is at +3.5.
 * Rank '1' is at +3.5, Rank '8' is at -3.5.
 */
export function squareToWorld(
  square: Square,
  squareSize = SQUARE_SIZE,
): [number, number, number] {
  const file = square[0];
  const rank = square[1];

  const fileIdx = FILES.indexOf(file as any);
  const rankIdx = RANKS.indexOf(rank as any);

  if (fileIdx === -1 || rankIdx === -1) {
    return [0, BOARD_SURFACE_Y, 0];
  }

  // x from -3.5 to +3.5
  const x = (fileIdx - 3.5) * squareSize;
  // z from +3.5 (rank 1) to -3.5 (rank 8)
  const z = (3.5 - rankIdx) * squareSize;
  const y = BOARD_SURFACE_Y;

  return [x, y, z];
}

/**
 * Maps 3D world coordinates back to a chess square string (e.g. 'e4').
 */
export function worldToSquare(
  x: number,
  z: number,
  squareSize = SQUARE_SIZE,
): Square | null {
  const fileIdx = Math.round(x / squareSize + 3.5);
  const rankIdx = Math.round(3.5 - z / squareSize);

  if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) {
    return null;
  }

  return `${FILES[fileIdx]}${RANKS[rankIdx]}` as Square;
}

/**
 * Standard chess square color:
 * a1 (0,0) is dark.
 * sum of fileIdx + rankIdx: if even -> dark, if odd -> light.
 */
export function isDarkSquare(square: Square): boolean {
  const fileIdx = FILES.indexOf(square[0] as any);
  const rankIdx = RANKS.indexOf(square[1] as any);
  return (fileIdx + rankIdx) % 2 === 0;
}
