import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeSanMove } from '../src/components/chess3d/a11y/moveSpeech';

test('translates pawn moves', () => {
  assert.equal(describeSanMove('e4', 'white', 1), 'Move 1, White: Pawn to e4');
  assert.equal(describeSanMove('exd5', 'black'), 'Black: Pawn on file e captures on d5');
});

test('translates piece moves and captures', () => {
  assert.equal(describeSanMove('Nf3', 'white'), 'White: Knight to f3');
  assert.equal(describeSanMove('Bxf7+', 'white'), 'White: Bishop captures on f7, check');
  assert.equal(describeSanMove('Qxf7#', 'white'), 'White: Queen captures on f7, checkmate');
});

test('translates castling', () => {
  assert.equal(describeSanMove('O-O', 'white'), 'White: Castles kingside');
  assert.equal(describeSanMove('O-O-O', 'black'), 'Black: Castles queenside');
});

test('translates promotion', () => {
  assert.equal(describeSanMove('e8=Q#', 'white'), 'White: Pawn to e8, promotes to Queen, checkmate');
});

test('translates disambiguated moves', () => {
  assert.equal(describeSanMove('Nbd7', 'black'), 'Black: Knight from b to d7');
  assert.equal(describeSanMove('R1a3', 'white'), 'White: Rook from 1 to a3');
});
