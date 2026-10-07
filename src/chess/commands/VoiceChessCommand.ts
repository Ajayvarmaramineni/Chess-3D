import { Chess, PieceSymbol, Square } from 'chess.js';
import { MoveCommand } from '../ChessTypes';
import { ChessCommandParser } from './ChessCommandParser';

export type VoiceChessCommand =
  | { type: 'move'; command: MoveCommand }
  | { type: 'undo' | 'resign' | 'newGame' | 'stopVoice' }
  | { type: 'unknown'; raw: string };

const FILES: Record<string, string> = {
  a: 'a', ay: 'a',
  b: 'b', bee: 'b',
  c: 'c', see: 'c', sea: 'c',
  d: 'd', dee: 'd',
  e: 'e',
  f: 'f', ef: 'f',
  g: 'g', gee: 'g',
  h: 'h', aitch: 'h',
};

const RANKS: Record<string, string> = {
  one: '1', won: '1',
  two: '2', too: '2',
  three: '3', tree: '3',
  four: '4', for: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8', ate: '8',
};

const PIECES: Record<string, PieceSymbol> = {
  pawn: 'p', knight: 'n', horse: 'n', bishop: 'b', rook: 'r', castle: 'r', queen: 'q', king: 'k',
};

export function normalizeVoiceChessText(input: string): string {
  const tokens = input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const normalized: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const file = FILES[tokens[index]];
    const rank = RANKS[tokens[index + 1]];
    if (file && rank) {
      normalized.push(`${file}${rank}`);
      index += 1;
    } else {
      normalized.push(tokens[index]);
    }
  }
  return normalized.join(' ');
}

export function resolveVoiceCommand(input: string, fen: string): VoiceChessCommand {
  const normalized = normalizeVoiceChessText(input);
  if (/^(stop listening|stop voice|voice off|turn off voice)$/.test(normalized)) return { type: 'stopVoice' };

  const control = ChessCommandParser.parseCommand(normalized);
  if (control.type !== 'unknown' && control.type !== 'move') return control;
  if (control.type === 'move') return control;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { type: 'unknown', raw: input };
  }

  const legalMoves = chess.moves({ verbose: true });
  if (/castle|castling/.test(normalized)) {
    const queenside = /queen|long/.test(normalized);
    const kingside = /king|short/.test(normalized);
    const castle = legalMoves.find((move) => move.san === (queenside ? 'O-O-O' : 'O-O') && (queenside || kingside));
    return castle
      ? { type: 'move', command: { from: castle.from, to: castle.to } }
      : { type: 'unknown', raw: input };
  }

  const squares = normalized.match(/\b[a-h][1-8]\b/g) ?? [];
  const destination = squares.at(-1) as Square | undefined;
  const pieceName = Object.keys(PIECES).find((name) => new RegExp(`\\b${name}\\b`).test(normalized));
  if (!destination || !pieceName) return { type: 'unknown', raw: input };

  const promotionName = ['queen', 'rook', 'bishop', 'knight'].find((name) => normalized.includes(`promote to ${name}`));
  const promotion = promotionName ? PIECES[promotionName] as MoveCommand['promotion'] : undefined;
  const matches = legalMoves.filter((move) =>
    move.to === destination &&
    move.piece === PIECES[pieceName] &&
    (!promotion || move.promotion === promotion)
  );
  if (matches.length !== 1) return { type: 'unknown', raw: input };
  return {
    type: 'move',
    command: {
      from: matches[0].from,
      to: matches[0].to,
      ...(matches[0].promotion ? { promotion: (promotion ?? 'q') as MoveCommand['promotion'] } : {}),
    },
  };
}
