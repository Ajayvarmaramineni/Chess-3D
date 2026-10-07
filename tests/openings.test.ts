import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identifyOpening} from '../src/chess/openings';
const line=(...san:string[])=>san.map(move=>({san:move}));
test('identifies the deepest matching opening line',()=>{assert.equal(identifyOpening(line('e4','e5','Nf3','Nc6','Bb5')),'Ruy López');assert.equal(identifyOpening(line('e4','c5')),'Sicilian Defense');});
test('returns null before an opening family is known',()=>assert.equal(identifyOpening([]),null));
