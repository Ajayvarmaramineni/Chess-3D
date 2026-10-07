import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChessController } from '../src/chess/ChessController';
import { ChessCommandParser } from '../src/chess/commands/ChessCommandParser';
import { resolveVoiceCommand } from '../src/chess/commands/VoiceChessCommand';
const engine = () => ({ initialize: async()=>{}, setDifficulty: async()=>{}, getStatus: ()=>'ready' as const, stop(){}, dispose(){}, setPosition: async()=>{}, getBestMove: async()=>({from:'e7',to:'e5',rawUci:'e7e5'}) });
const game = (options = {}) => { const c = new ChessController({engine:engine(),autoPlayBlackWithEngine:false,...options}); c.moveAnimationDuration=0; return c; };
test('resigning ends the game and rejects subsequent moves',async()=>{const c=game();c.resign();assert.equal(c.getState().gameOver,true);assert.equal((await c.move({from:'e2',to:'e4'})).success,false);});
test('en passant reports the captured pawn square',async()=>{const c=game({initialFen:'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'});let square='';c.subscribe(e=>{if(e.type==='piece.captured')square=e.square;});await c.move({from:'e5',to:'d6'});assert.equal(square,'d5');});
test('undo emits a board synchronization event',async()=>{const c=game();await c.move({from:'e2',to:'e4'});let synced=false;c.subscribe(e=>{if(e.type==='game.started')synced=true;});await c.undo();assert.equal(synced,true);assert.equal(c.getTurn(),'white');});
test('reset during animation cannot complete the old move',async()=>{const c=game();c.moveAnimationDuration=20;let completed=0;c.subscribe(e=>{if(e.type==='move.completed')completed++;});const p=c.move({from:'e2',to:'e4'});await c.newGame();await p;assert.equal(completed,0);assert.equal(c.getTurn(),'white');});
test('promotion parser preserves underpromotion names',()=>{assert.equal(ChessCommandParser.parseMove('a7 to a8 knight').command?.promotion,'n');});
test('voice coordinates understand spoken files and ranks',()=>{
  assert.deepEqual(resolveVoiceCommand('move e two to e four', new ChessController({engine:engine(),autoPlayBlackWithEngine:false}).getFen()), {
    type:'move', command:{from:'e2',to:'e4'}
  });
});
test('voice moves can identify the only legal piece by name and destination',()=>{
  assert.deepEqual(resolveVoiceCommand('pawn to e four', new ChessController({engine:engine(),autoPlayBlackWithEngine:false}).getFen()), {
    type:'move', command:{from:'e2',to:'e4'}
  });
});
test('voice castling resolves from the current legal position',()=>{
  assert.deepEqual(resolveVoiceCommand('castle kingside', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), {
    type:'move', command:{from:'e1',to:'g1'}
  });
});
test('voice commands remain unknown when more than one piece matches',()=>{
  assert.equal(resolveVoiceCommand('rook to e two', '4k3/8/8/8/8/8/R6R/4K3 w - - 0 1').type, 'unknown');
});
test('voice mode recognizes hands-free control commands',()=>{
  assert.deepEqual(resolveVoiceCommand('stop listening', new ChessController({engine:engine(),autoPlayBlackWithEngine:false}).getFen()), {type:'stopVoice'});
});
test('new game options expose side, difficulty and clock',async()=>{const c=game();await c.newGame(undefined,{humanColor:'black',mode:'local',difficulty:'hard',timeControl:'3+2'});const s=c.getState();assert.equal(s.humanColor,'black');assert.equal(s.difficulty,'hard');assert.equal(s.clocks.white,180000);});
test('snapshot restores move history and terminal result',async()=>{const c=game();await c.move({from:'e2',to:'e4'});c.resign();const copy=game();copy.restore(c.serialize());assert.equal(copy.getFen(),c.getFen());assert.equal(copy.getState().history.length,1);assert.equal(copy.getState().gameOver,true);});
test('restored timed games retain per-move clocks when undoing',async()=>{
 const c=game();await c.newGame(undefined,{mode:'local',timeControl:'3+2'});
 const start=Date.now();c.tick(start+10_000);await c.move({from:'e2',to:'e4'});
 const afterWhite={...c.getState().clocks};c.tick(start+30_000);await c.move({from:'e7',to:'e5'});
 const copy=game();copy.restore(c.serialize());await copy.undo();
 assert.deepEqual(copy.getState().clocks,afterWhite);
});
test('a single remote move emits the normal animation and completion events',async()=>{
 const server=game();await server.newGame(undefined,{mode:'online'});await server.move({from:'e2',to:'e4'});
 const client=game();client.moveAnimationDuration=0;client.restore({...client.serialize(),settings:{...client.getState(),mode:'online'}} as any);
 const events:string[]=[];client.subscribe(event=>events.push(event.type));
 await client.syncRemote(server.serialize(),'black');
 assert.ok(events.includes('move.started'));assert.ok(events.includes('move.completed'));
 assert.equal(client.getFen(),server.getFen());
});
test('replay history contains exact resulting positions',async()=>{const c=game();await c.move({from:'e2',to:'e4'});assert.equal(c.getState().history[0].fen,c.getFen());assert.equal(c.getState().history[0].san,'e4');});
test('clock flag ends a timed game',async()=>{const c=game();await c.newGame(undefined,{mode:'local',timeControl:'3+2'});c.tick(Date.now()+181000);assert.equal(c.getState().reason,'timeout');assert.equal(c.getState().winner,'black');});
test('a cancelled engine startup cannot poison a later restart',async()=>{
 let attempts=0;
 const raceEngine={...engine(),initialize:()=>++attempts===1?new Promise<void>((_,reject)=>setTimeout(()=>reject(new Error('cancelled')),10)):Promise.resolve()};
 const c=new ChessController({engine:raceEngine});
 const stale=c.start();
 c.dispose();
 await c.start();
 await stale;
 assert.equal(c.getState().engineError,undefined);
 c.dispose();
});
test('castling moves both king and rook in the authoritative position',async()=>{const c=game({initialFen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'});await c.move({from:'e1',to:'g1'});assert.match(c.getFen(),/^r3k2r\/8\/8\/8\/8\/8\/8\/R4RK1 b/);});
test('underpromotion preserves the chosen piece',async()=>{const c=game({initialFen:'7k/P7/8/8/8/8/8/7K w - - 0 1'});const result=await c.move({from:'a7',to:'a8',promotion:'n'});assert.equal(result.move?.promotion,'n');assert.match(c.getFen(),/^N6k/);});
test('threefold repetition reports an understandable draw reason',async()=>{const c=game();for(const move of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8'],['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']] as const)await c.move({from:move[0],to:move[1]});assert.equal(c.getState().gameOver,true);assert.equal(c.getState().reason,'threefold repetition');});
test('fifty-move positions are identified as draws',()=>{const c=game({initialFen:'7k/8/8/8/8/8/R7/K7 w - - 100 51'});assert.equal(c.getState().gameOver,true);assert.equal(c.getState().reason,'draw by rule');});
test('an agreed draw ends the game with a clear reason',()=>{const c=game();c.endDraw('draw by agreement');assert.equal(c.getState().gameOver,true);assert.equal(c.getState().winner,'draw');assert.equal(c.getState().reason,'draw by agreement');});
