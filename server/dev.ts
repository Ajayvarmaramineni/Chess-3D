import {createServer} from 'vite';
import {createRoomServer} from './rooms';
const rooms=createRoomServer();rooms.listen(3001,'0.0.0.0');
const vite=await createServer({server:{port:3000,host:'0.0.0.0'}});await vite.listen();vite.printUrls();
async function shutdown(){await vite.close();rooms.close(()=>process.exit());}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
