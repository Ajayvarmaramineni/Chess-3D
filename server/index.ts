import {createRoomServer} from './rooms';
const port=Number(process.env.PORT||3001);
createRoomServer().listen(port,'0.0.0.0',()=>console.log(`Chess room server listening on ${port}`));
