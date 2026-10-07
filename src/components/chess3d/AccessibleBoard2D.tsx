import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessLegalMove } from '../../chess/ChessTypes';

const GLYPHS: Record<string, string> = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};

const FILES = 'abcdefgh';
const pieceName = (type: string) =>
  ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[type] ?? type);

interface Props {
  fen: string;
  flipped: boolean;
  selectedSquare: Square | null;
  legalMoves: ChessLegalMove[];
  checkSquare: Square | null;
  disabled?: boolean;
  onSquareClick: (square: Square) => void | Promise<void>;
  onMove?: (from: Square, to: Square) => void | Promise<void>;
}

export function AccessibleBoard2D({
  fen,
  flipped,
  selectedSquare,
  legalMoves,
  checkSquare,
  disabled,
  onSquareClick,
  onMove,
}: Props) {
  const board = useMemo(() => {
    const map = new Map<Square, ReturnType<Chess['get']>>();
    new Chess(fen)
      .board()
      .flat()
      .forEach((piece) => {
        if (piece) map.set(piece.square, piece);
      });
    return map;
  }, [fen]);

  const squares = useMemo(() => {
    const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = flipped ? [...FILES].reverse() : [...FILES];
    return ranks.flatMap((rank) => files.map((file) => `${file}${rank}` as Square));
  }, [flipped]);

  const [focusIndex, setFocusIndex] = useState(56);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => setFocusIndex(56), [flipped]);

  const targets = useMemo(
    () => new Map(legalMoves.map((move) => [move.to, move.isCapture])),
    [legalMoves],
  );

  const moveFocus = (index: number) => {
    const next = Math.max(0, Math.min(63, index));
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'Home') {
      event.preventDefault();
      const rowStart = Math.floor(index / 8) * 8;
      moveFocus(rowStart);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const rowEnd = Math.floor(index / 8) * 8 + 7;
      moveFocus(rowEnd);
      return;
    }

    const delta =
      event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowLeft'
          ? -1
          : event.key === 'ArrowDown'
            ? 8
            : event.key === 'ArrowUp'
              ? -8
              : 0;

    if (!delta) return;
    event.preventDefault();

    const column = index % 8;
    // Prevent horizontal wrap-around
    if ((delta === 1 && column === 7) || (delta === -1 && column === 0)) return;
    // Prevent vertical jump across edges
    if ((delta === 8 && index >= 56) || (delta === -8 && index < 8)) return;

    moveFocus(index + delta);
  };

  return (
    <div className="board-2d-shell">
      <div
        className="board-2d"
        role="grid"
        aria-label="Interactive chess board. Use arrow keys to move and Enter to select."
      >
        {Array.from({ length: 8 }, (_, row) => (
          <div className="board-2d-row" role="row" key={row}>
            {squares.slice(row * 8, row * 8 + 8).map((square, column) => {
              const index = row * 8 + column;
              const piece = board.get(square);
              const dark = (FILES.indexOf(square[0]) + Number(square[1])) % 2 === 0;
              const legal = targets.has(square);
              const isSelected = selectedSquare === square;
              const isChecked = checkSquare === square;

              const label = `${square}, ${
                piece ? `${piece.color === 'w' ? 'white' : 'black'} ${pieceName(piece.type)}` : 'empty'
              }${isSelected ? ', selected' : ''}${
                legal ? (targets.get(square) ? ', legal capture' : ', legal move') : ''
              }${isChecked ? ', in check' : ''}`;

              return (
                <button
                  key={square}
                  ref={(element) => {
                    refs.current[index] = element;
                  }}
                  role="gridcell"
                  type="button"
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={label}
                  aria-selected={isSelected}
                  disabled={disabled}
                  draggable={!!piece && !disabled}
                  className={`square-2d ${dark ? 'dark' : 'light'} ${
                    isSelected ? 'selected' : ''
                  } ${legal ? (targets.get(square) ? 'capture' : 'legal') : ''} ${
                    isChecked ? 'check' : ''
                  }`}
                  onFocus={() => setFocusIndex(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  onClick={() => void onSquareClick(square)}
                  onDragStart={() => setDraggedSquare(square)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedSquare && onMove) void onMove(draggedSquare, square);
                    setDraggedSquare(null);
                  }}
                  onDragEnd={() => setDraggedSquare(null)}
                >
                  {piece && <span aria-hidden="true">{GLYPHS[`${piece.color}${piece.type}`]}</span>}
                  {index % 8 === 0 && (
                    <small className="rank-label" aria-hidden="true">
                      {square[1]}
                    </small>
                  )}
                  {index >= 56 && (
                    <small className="file-label" aria-hidden="true">
                      {square[0]}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
