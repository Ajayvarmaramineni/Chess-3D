import express from 'express';
import {createServer,IncomingMessage} from 'node:http';
import {randomBytes} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {ChessController,TIME_CONTROLS} from '../src/chess/ChessController';
import {StandardColor,TimeControl} from '../src/chess/ChessTypes';
const id=()=>randomBytes(24).toString('hex');
const session=(req:IncomingMessage)=>req.headers.cookie?.match(/(?:^|;\s*)crystal_session=([a-f0-9]{48})(?:;|$)/)?.[1];
const sameOrigin=(req:IncomingMessage)=>{try{const origin=req.headers.origin;if(!origin)return false;const configured=process.env.APP_ORIGIN;if(configured)return new URL(origin).origin===new URL(configured).origin;const host=(req.headers['x-forwarded-host'] as string)?.split(',')[0].trim()||req.headers.host;const originUrl=new URL(origin),hostUrl=new URL(`http://${host}`);if(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1','::1'].includes(originUrl.hostname)&&['localhost','127.0.0.1','::1'].includes(hostUrl.hostname))return true;return originUrl.host===host;}catch{return false;}};
export function createRoomServer(){
 const app=express(),server=createServer(app),wss=new WebSocketServer({noServer:true,maxPayload:2048});
 type RoomSocket=WebSocket&{sessionId?:string;color?:StandardColor;alive?:boolean};
 const rooms=new Map<string,{game:ChessController;seats:Partial<Record<StandardColor,string>>;claims:Partial<Record<StandardColor,string>>;sockets:Set<RoomSocket>;created:number;joined:boolean;started:boolean;drawOffer?:StandardColor;rematchVotes:Set<StandardColor>}>();
 const limits=new Map<string,{at:number;count:number}>();
 app.disable('x-powered-by');
 const trustProxy=process.env.TRUST_PROXY;
 if(trustProxy)app.set('trust proxy',/^\d+$/.test(trustProxy)?Number(trustProxy):trustProxy);
 app.use((_req,res,next)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
  if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
 });
 app.use(express.json({limit:'2kb',strict:true}));
 app.use('/api',(req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  if(!sameOrigin(req)){res.status(403).json({error:'Request origin rejected'});return;}
  const key=req.ip||req.socket.remoteAddress||'unknown',now=Date.now();let bucket=limits.get(key);
  if(!bucket||now-bucket.at>60000){bucket={at:now,count:0};limits.set(key,bucket);}
  if(++bucket.count>40){res.status(429).json({error:'Too many requests. Try again in a minute.'});return;}
  next();
 });
 const getSession=(req:express.Request,res:express.Response)=>{const sid=session(req)??id();res.cookie('crystal_session',sid,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:86400000,path:'/'});return sid;};
 const send=(ws:RoomSocket,data:string)=>{if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>524288){ws.close(1013,'Connection is too slow');return;}ws.send(data);};
 const broadcast=(room:typeof rooms extends Map<string,infer R>?R:never)=>{const data=JSON.stringify({type:'state',saved:room.game.serialize(),ready:room.started,connected:room.sockets.size,drawOffer:room.drawOffer,rematchVotes:[...room.rematchVotes]});room.sockets.forEach(ws=>send(ws,data));};
 const broadcastClock=(room:typeof rooms extends Map<string,infer R>?R:never)=>{const data=JSON.stringify({type:'clock',clocks:room.game.getState().clocks,ready:room.started,connected:room.sockets.size});room.sockets.forEach(ws=>send(ws,data));};
 app.post('/api/rooms',(req,res)=>{
  if(rooms.size>=500){res.status(503).json({error:'All rooms are busy. Try again later.'});return;}
  const {color='white',timeControl='untimed',clientId}=req.body??{};
  if(!['white','black'].includes(color)||!Object.hasOwn(TIME_CONTROLS,timeControl)||typeof clientId!=='string'||!/^[a-f0-9-]{36}$/.test(clientId)){res.status(400).json({error:'Invalid game settings'});return;}
  const roomId=id(),sid=getSession(req,res),game=new ChessController({mode:'online',humanColor:color,timeControl:timeControl as TimeControl});game.moveAnimationDuration=0;
  const room={game,seats:{[color]:sid},claims:{[color]:clientId},sockets:new Set<RoomSocket>(),created:Date.now(),joined:false,started:false,rematchVotes:new Set<StandardColor>()};rooms.set(roomId,room);res.status(201).json({room:roomId,color});
 });
 app.post('/api/rooms/:room/join',(req,res)=>{
  const room=rooms.get(String(req.params.room));if(!room){res.status(404).json({error:'This room has expired or does not exist.'});return;}
  const sid=getSession(req,res),clientId=req.body?.clientId;let color=(Object.entries(room.seats).find(([,s])=>s===sid)?.[0]) as StandardColor|undefined;
  if(!color&&typeof clientId==='string')color=(Object.entries(room.claims).find(([,claim])=>claim===clientId)?.[0]) as StandardColor|undefined;
  if(color)room.seats[color]=sid;
  if(!color){if(typeof clientId!=='string'||!/^[a-f0-9-]{36}$/.test(clientId)){res.status(400).json({error:'Invalid room client'});return;}color=room.seats.white?'black':'white';if(room.seats[color]){res.status(409).json({error:'Both seats in this room are taken.'});return;}room.seats[color]=sid;room.claims[color]=clientId;room.joined=true;room.game.pauseClock();}
  res.json({room:req.params.room,color});broadcast(room);
 });
 server.on('upgrade',(req,socket,head)=>{
  if(!sameOrigin(req)){socket.destroy();return;}
  const url=new URL(req.url??'/', 'http://localhost');const room=rooms.get(url.searchParams.get('room')??'');const sid=session(req);
  if(url.pathname!=='/room-socket'||!room||!sid||!Object.values(room.seats).includes(sid)){socket.destroy();return;}
  const color=Object.entries(room.seats).find(([,s])=>s===sid)![0] as StandardColor;
  wss.handleUpgrade(req,socket,head,ws=>{
   // A seat has one active connection; reconnect replaces an abandoned tab.
   for(const other of room.sockets)if(other.sessionId===sid)other.close(4001,'Seat reconnected');
   const roomSocket=ws as RoomSocket;roomSocket.sessionId=sid;roomSocket.color=color;roomSocket.alive=true;room.sockets.add(roomSocket);
   roomSocket.on('pong',()=>{roomSocket.alive=true;});
   if(room.joined&&!room.started&&new Set([...room.sockets].filter(client=>client.readyState===WebSocket.OPEN).map(client=>client.color)).size===2){room.started=true;room.game.pauseClock();}
   broadcast(room);
   let count=0,windowAt=Date.now();
   ws.on('message',async raw=>{
    if(Date.now()-windowAt>10000){count=0;windowAt=Date.now();}if(++count>40){ws.close(1008,'Too many messages');return;}
    try{
     const message=JSON.parse(raw.toString());
     const reject=(error:string)=>ws.send(JSON.stringify({type:'result',id:message.id,result:{success:false,error,fen:room.game.getFen()}}));
     if(!room.started){reject('Waiting for your friend to connect.');return;}
     if(message.type==='resign'){room.game.resign(color);room.drawOffer=undefined;broadcast(room);return;}
     if(message.type==='draw_offer'){if(room.game.isGameOver()){reject('This game has ended.');return;}room.drawOffer=color;broadcast(room);return;}
     if(message.type==='draw_response'){
      if(!room.drawOffer||room.drawOffer===color){reject('There is no draw offer to answer.');return;}
      if(message.accept===true)room.game.endDraw('draw by agreement');
      room.drawOffer=undefined;broadcast(room);return;
     }
     if(message.type==='rematch'){
      if(!room.game.isGameOver()){reject('Finish the current game before requesting a rematch.');return;}
      room.rematchVotes.add(color);
      if(room.rematchVotes.size===2){room.rematchVotes.clear();room.drawOffer=undefined;await room.game.newGame(undefined,{mode:'online'});}
      broadcast(room);return;
     }
     if(message.type!=='move'||typeof message.id!=='string'||message.id.length>80||typeof message.command?.from!=='string'||typeof message.command?.to!=='string'||(message.command.promotion&&!['q','r','b','n'].includes(message.command.promotion))){reject('Invalid move request');return;}
     if(room.game.getTurn()!==color){reject('It is your opponent’s turn.');return;}
     const result=await room.game.move(message.command);broadcast(room);ws.send(JSON.stringify({type:'result',id:message.id,result}));
    }catch{ws.send(JSON.stringify({type:'error',error:'Invalid request'}));}
   });
   ws.on('close',()=>{room.sockets.delete(ws);broadcast(room);});
  });
 });
 const timer=setInterval(()=>{
  for(const [roomId,room]of rooms){if(Date.now()-room.created>86400000){room.sockets.forEach(ws=>ws.close());room.game.dispose();rooms.delete(roomId);}else if(room.started){const wasOver=room.game.isGameOver();room.game.tick();if(!wasOver&&room.game.isGameOver())broadcast(room);else broadcastClock(room);}else room.game.pauseClock();}
  for(const [key,bucket]of limits)if(Date.now()-bucket.at>60000)limits.delete(key);
 },500);timer.unref();
 const heartbeat=setInterval(()=>{wss.clients.forEach(client=>{const ws=client as RoomSocket;if(ws.alive===false){ws.terminate();return;}ws.alive=false;ws.ping();});},30000);heartbeat.unref();
 server.on('close',()=>{clearInterval(timer);clearInterval(heartbeat);wss.clients.forEach(ws=>ws.terminate());wss.close();rooms.forEach(r=>r.game.dispose());});
 app.use(express.static('dist'));app.get('*',(_req,res)=>res.sendFile('index.html',{root:'dist'}));
 return server;
}
