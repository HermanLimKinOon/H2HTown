import type {IncomingHttpHeaders} from 'node:http';
import {loadEnvFile} from 'node:process';
import {pathToFileURL} from 'node:url';
import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Capacity,allowedOrigin,PLAYER_LIMIT} from './authority';
import {createSessionVerifier,createPoseWriter} from './auth';
import {createWorldRoom} from './WorldRoom';
export async function startLocalServer(){
 for(const file of ['.env.local','.env']){try{loadEnvFile(file);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('Invalid local environment file');}}
 const port=Number(process.env.COLYSEUS_PORT??2567);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local server port');
 const verify=createSessionVerifier(process.env.SUPABASE_URL??process.env.VITE_PUBLIC_SUPABASE_URL??process.env.VITE_SUPABASE_URL??'',process.env.SUPABASE_ANON_KEY??process.env.VITE_PUBLIC_SUPABASE_ANON_KEY??process.env.VITE_SUPABASE_ANON_KEY??'');
 const persistPose=createPoseWriter(process.env.SUPABASE_URL??process.env.VITE_PUBLIC_SUPABASE_URL??process.env.VITE_SUPABASE_URL??'',process.env.SUPABASE_ANON_KEY??process.env.VITE_PUBLIC_SUPABASE_ANON_KEY??process.env.VITE_SUPABASE_ANON_KEY??'');
 const capacity=new Capacity(PLAYER_LIMIT);
 const originAllowed=(origin:string|undefined|null)=>allowedOrigin(origin,process.env.H2H_FRIENDS_ORIGIN);
 const transport=new WebSocketTransport({maxPayload:4096,perMessageDeflate:false,beforeUpgrade:request=>originAllowed(request.headers.get('origin'))?undefined:new Response('Allowed game origin required',{status:403})});
 const server=new Server({transport,greet:false,gracefullyShutdown:true,express:app=>{
  app.use((request:{headers:IncomingHttpHeaders},response:{status:(code:number)=>{json:(body:unknown)=>void}},next:()=>void)=>{if(!originAllowed(request.headers.origin)){response.status(403).json({error:'Allowed game origin required'});return;}next();});
  app.get('/health',(_request:unknown,response:{json:(body:unknown)=>void})=>response.json({ok:true,players:capacity.count,limit:capacity.limit}));
 }});
 server.define('h2h_world',createWorldRoom({verify,capacity,persistPose,friendsOrigin:process.env.H2H_FRIENDS_ORIGIN})).filterBy(['world','serverId']);
 await server.listen(port,'127.0.0.1');return{server,capacity,port};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 startLocalServer().then(({port})=>{process.stdout.write(`Local 3D movement server listening on http://127.0.0.1:${port} (10 players)\n`);}).catch(()=>{process.stderr.write('Local 3D movement server failed to start; check loopback Supabase public configuration and port.\n');process.exitCode=1;});
}
