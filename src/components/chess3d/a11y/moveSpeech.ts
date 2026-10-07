const PIECE_NAMES: Record<string, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
};

export function describeSanMove(san: string, color?: 'white' | 'black', moveNumber?: number): string {
  if (!san) return '';

  const prefix = moveNumber
    ? `Move ${moveNumber}, ${color === 'white' ? 'White' : color === 'black' ? 'Black' : ''}: `
    : color
      ? `${color === 'white' ? 'White' : 'Black'}: `
      : '';

  let isCheckmate = false;
  let isCheck = false;
  let cleanSan = san;

  if (cleanSan.endsWith('#')) {
    isCheckmate = true;
    cleanSan = cleanSan.slice(0, -1);
  } else if (cleanSan.endsWith('+')) {
    isCheck = true;
    cleanSan = cleanSan.slice(0, -1);
  }

  let description = '';

  if (cleanSan === 'O-O') {
    description = 'Castles kingside';
  } else if (cleanSan === 'O-O-O') {
    description = 'Castles queenside';
  } else {
    let promotionPiece = '';
    if (cleanSan.includes('=')) {
      const parts = cleanSan.split('=');
      cleanSan = parts[0];
      promotionPiece = PIECE_NAMES[parts[1]] || parts[1];
    }

    const isCapture = cleanSan.includes('x');
    const firstChar = cleanSan[0];
    const isPawn = firstChar >= 'a' && firstChar <= 'h';

    if (isPawn) {
      if (isCapture) {
        const [fromFile, toSquare] = cleanSan.split('x');
        description = `Pawn on file ${fromFile} captures on ${toSquare}`;
      } else {
        description = `Pawn to ${cleanSan}`;
      }
    } else {
      const pieceName = PIECE_NAMES[firstChar] || firstChar;
      const rest = cleanSan.slice(1);

      if (isCapture) {
        const parts = rest.split('x');
        const disambiguation = parts[0];
        const toSquare = parts[1];
        description = disambiguation
          ? `${pieceName} from ${disambiguation} captures on ${toSquare}`
          : `${pieceName} captures on ${toSquare}`;
      } else {
        const toSquare = rest.slice(-2);
        const disambiguation = rest.slice(0, -2);
        description = disambiguation
          ? `${pieceName} from ${disambiguation} to ${toSquare}`
          : `${pieceName} to ${toSquare}`;
      }
    }

    if (promotionPiece) {
      description += `, promotes to ${promotionPiece}`;
    }
  }

  if (isCheckmate) {
    description += ', checkmate';
  } else if (isCheck) {
    description += ', check';
  }

  return `${prefix}${description}`;
}
