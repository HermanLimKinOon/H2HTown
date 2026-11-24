import { Client, type Room } from '@colyseus/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ColyseusSnapshot3D } from './colyseusTypes3D';
import { parseTownPose3D, townPeersFromPresence3D, type TownLocalPose3D, type TownPeers3D } from './townMultiplayer3D';

export type ColyseusStatus3D='connecting'|'online'|'reconnecting'|'offline'|'error';
export type ColyseusOptions3D={endpoint:string;friendsOrigin?:string;client:SupabaseClient;userId:string;world:string;serverId?:string;getPose:()=>TownLocalPose3D;onPeers:(peers:TownPeers3D)=>void;onPositionAuthority?:(owned:boolean)=>void;onStatus:(status:ColyseusStatus3D)=>void;onCorrection:(pose:TownLocalPose3D)=>void;onRoomInfo?:(info:{count:number;limit:number;world:string})=>void;onError?:(message:string)=>void};

export function normalizeColyseusWorld3D(world:string,userId:string):string|null {
 if(world==='town')return world;
 if(world==='farm')return `farm:${userId}`;
 return /^farm:[a-zA-Z0-9-]{1,100}$/.test(world)?world:null;
}
function errorMessage(reason:unknown):string {
 const raw=reason&&typeof reason==='object'&&'message' in reason?String(reason.message):String(reason??'');
 if(/already connected/i.test(raw))return 'This player is already connected in another tab. Use a separate local test player or close the other game tab.';
 if(/full|capacity|maximum|limit.*10/i.test(raw))return 'The local server is full (10 players). Try again shortly.';
 if(/unauthori[sz]ed|auth|token|sign.?in|expired|lease/i.test(raw))return 'Your game session needs to reconnect. Sign in and wait for communication to connect, then retry.';
 if(/world|scope|revok|access|permission/i.test(raw))return 'This world is no longer available. Return to your own farm and reconnect.';
 return 'Local multiplayer is unavailable. Start the local server with npm run game:server, then retry.';
}
function correction(value:unknown):TownLocalPose3D|null {
 if(!value||typeof value!=='object')return null;const pose=value as TownLocalPose3D;
 if(![pose.x,pose.y,pose.z,pose.yaw].every(Number.isFinite)||Math.abs(pose.x)>23.55||Math.abs(pose.z)>23.55||pose.y<0||pose.y>4||pose.moving!==false||pose.running!==false)return null;
 return {x:pose.x,y:pose.y,z:pose.z,yaw:pose.yaw,moving:false,running:false};
}
/** Only messages from the active authenticated room may replace its peer set. */
export function parseColyseusSnapshot3D(value:unknown,world:string,serverId:string,selfId:string,userId:string,previous:TownPeers3D={},now=Date.now()):{peers:TownPeers3D;count:number;limit:number}|null {
 if(!value||typeof value!=='object')return null;const packet=value as ColyseusSnapshot3D;
 if(packet.positionWriter!==undefined&&typeof packet.positionWriter!=='boolean')return null;
 if(packet.world!==world||packet.serverId!==serverId||packet.selfId!==selfId||!Number.isInteger(packet.count)||packet.count<1||packet.count>10||packet.limit!==10||!Array.isArray(packet.players)||packet.players.length>10||packet.players.length>packet.count)return null;
 const entries:Record<string,unknown[]>={},ids=new Set<string>(),users=new Set<string>();
 for(const peer of packet.players){
  const pose=parseTownPose3D(peer);if(!pose||typeof peer.name!=='string'||peer.name.length>80||!peer.name.trim()||ids.has(pose.clientId)||users.has(pose.userId))return null;
  // Avatar payloads are normalized by the shared renderer, with a bounded input.
  try{if(JSON.stringify({appearance:peer.appearance,choice:peer.choice}).length>24576)return null;}catch{return null;}
  if(pose.clientId===selfId&&pose.userId!==userId)return null;
  ids.add(pose.clientId);users.add(pose.userId);
  if(pose.clientId!==selfId&&pose.userId!==userId)entries[pose.clientId]=[peer];
 }
 return {peers:townPeersFromPresence3D(entries,selfId,now,previous),count:packet.count,limit:10};
}

export function connectColyseus3D(options:ColyseusOptions3D):{closed:Promise<void>;stop:()=>Promise<void>} {
 let stopped=false,generation=0,attempt=0,seq=0,lastSnapshot=0;
 let room:Room|null=null,peers:TownPeers3D={},history:TownPeers3D={};
 let poseTimer:ReturnType<typeof setTimeout>|undefined,retryTimer:ReturnType<typeof setTimeout>|undefined;
 let pendingJoin:Promise<void>=Promise.resolve(),leaving:Promise<void>=Promise.resolve(),stopPromise:Promise<void>|null=null;
 let resolveClosed:()=>void=()=>{};const closed=new Promise<void>(resolve=>{resolveClosed=resolve;});
 const world=normalizeColyseusWorld3D(options.world,options.userId),serverId=options.serverId??'local-1';
 const active=(token:number)=>!stopped&&generation===token;
 const clearPose=()=>{clearTimeout(poseTimer);poseTimer=undefined;};
 const clearPeers=()=>{options.onPositionAuthority?.(false);peers={};history={};options.onPeers(peers);options.onRoomInfo?.({count:0,limit:10,world:world??options.world});};
 const leaveRoom=(old:Room|null):Promise<void>=>{
  if(!old)return Promise.resolve();
  old.reconnection.enabled=false;
  const next=Promise.resolve().then(()=>old.leave(true)).then(()=>{},()=>{});
  leaving=Promise.all([leaving,next]).then(()=>{});return next;
 };
 const reconnect=(reason:unknown,status:ColyseusStatus3D='reconnecting')=>{
  if(stopped||retryTimer)return;generation++;clearPose();const old=room;room=null;void leaveRoom(old);clearPeers();options.onError?.(errorMessage(reason));options.onStatus(status);
  const delay=Math.min(15000,500*2**Math.min(attempt++,5));retryTimer=setTimeout(()=>{retryTimer=undefined;pendingJoin=join();},delay);
 };
 const sendPose=(token:number,ownRoom:Room)=>{
  if(!active(token)||room!==ownRoom)return;
  if(Date.now()-lastSnapshot>3500){reconnect(new Error('Snapshot connection timed out'));return;}
  const next=Object.fromEntries(Object.entries(peers).filter(([,peer])=>Date.now()-peer.lastSeen<2500));
  if(Object.keys(next).length!==Object.keys(peers).length){peers=next;options.onPeers(peers);}
  try{
   const pose=options.getPose();
   if([pose.x,pose.y,pose.z,pose.yaw].every(Number.isFinite)&&Math.abs(pose.x)<=23.55&&Math.abs(pose.z)<=23.55&&pose.y>=0&&pose.y<=4&&typeof pose.moving==='boolean'&&typeof pose.running==='boolean')ownRoom.send('pose',{seq:++seq,x:pose.x,y:pose.y,z:pose.z,yaw:pose.yaw,moving:pose.moving,running:pose.moving&&pose.running});
  }catch(reason){reconnect(reason);return;}
  poseTimer=setTimeout(()=>sendPose(token,ownRoom),100);
 };
 const join=async()=>{
  if(stopped)return;const token=++generation;options.onStatus(attempt?'reconnecting':'connecting');
  try{
   if(!world)throw new Error('Unavailable world');
   const endpoint=new URL(options.endpoint);const friends=Boolean(options.friendsOrigin&&endpoint.origin===options.friendsOrigin&&endpoint.protocol==='https:'&&/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(endpoint.hostname)&&!endpoint.port&&endpoint.pathname==='/multiplayer'&&!endpoint.search&&!endpoint.hash);if(!['ws:','wss:','http:','https:'].includes(endpoint.protocol)||(!friends&&!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))||endpoint.username||endpoint.password)throw new Error('Invalid local endpoint');
   await leaving;if(!active(token))return;
   const session=await options.client.auth.getSession();if(!active(token))return;
   if(session.error||!session.data.session?.access_token||session.data.session.user.id!==options.userId)throw new Error('Authentication session unavailable');
   const sdk=new Client(options.endpoint);sdk.auth.token=session.data.session.access_token;
   const next=await sdk.joinOrCreate('h2h_world',{world,serverId});
   if(!active(token)){await leaveRoom(next);return;}
   next.reconnection.enabled=false;room=next;seq=0;lastSnapshot=Date.now();
   next.onMessage('snapshot',(value:unknown)=>{
    if(!active(token)||room!==next)return;
    const parsed=parseColyseusSnapshot3D(value,world,serverId,next.sessionId,options.userId,history);if(!parsed)return;
    options.onPositionAuthority?.((value as ColyseusSnapshot3D).positionWriter===true);history=parsed.peers;peers=Object.fromEntries(Object.entries(history).filter(([,peer])=>Date.now()-peer.lastSeen<2500));lastSnapshot=Date.now();
    const self=(value as ColyseusSnapshot3D).players.find(peer=>peer.clientId===next.sessionId&&peer.userId===options.userId);if(self)seq=Math.max(seq,self.seq);
    options.onPeers(peers);options.onRoomInfo?.({count:parsed.count,limit:parsed.limit,world});
   });
   next.onMessage('correction',(value:unknown)=>{if(!active(token)||room!==next)return;const pose=correction(value);if(pose)options.onCorrection(pose);});
   next.onError((_code,message)=>{if(active(token)&&room===next)reconnect(new Error(message??'Connection error'),'error');});
   next.onDrop((_code,reason)=>{if(active(token)&&room===next)reconnect(new Error(reason??'Connection dropped'));});
   next.onLeave((_code,reason)=>{if(active(token)&&room===next)reconnect(new Error(reason??'Connection closed'));});
   attempt=0;options.onError?.('');options.onStatus('online');sendPose(token,next);
  }catch(reason){if(active(token))reconnect(reason,'error');}
 };
 const stop=():Promise<void>=>{
  if(stopPromise)return stopPromise;stopped=true;generation++;clearTimeout(retryTimer);retryTimer=undefined;clearPose();const old=room;room=null;void leaveRoom(old);
  stopPromise=Promise.all([pendingJoin,leaving]).then(()=>leaving).then(()=>{resolveClosed();});return stopPromise;
 };
 // Start after the returned handle exists, so immediate cleanup can cancel a join.
 pendingJoin=Promise.resolve().then(join);
 return {closed,stop};
}
