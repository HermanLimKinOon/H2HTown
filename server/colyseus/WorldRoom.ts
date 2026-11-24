import type {MmoPresence3D} from '../../src/pages/game3d/mmoCommunicationTypes3D';
import {Room,ServerError,type Client,type AuthContext} from '@colyseus/core';
import {townObstacles3D,freshTownLayout3D} from '../../src/pages/game3d/townCustomization3D';
import {farmObstacles3D} from '../../src/pages/game3d/farmCustomization3D';
import type {Obstacle3} from '../../src/pages/game3d/game3d';
import {allowedOrigin,authorize,Capacity,Movement,visible,type VerifiedSession} from './authority';
type RoomAuth={token:string;session:VerifiedSession};
type Entry={client:Client;session:VerifiedSession;token:string;movement:Movement;verifiedAt:number;refreshing:boolean;closed:boolean;persisting:boolean;persistSeq:number;persisted:boolean;initialized:boolean;dirty:boolean;lastPersist:number};
type Dependencies={verify:(token:string)=>Promise<VerifiedSession>;capacity:Capacity;persistPose?:(token:string,lease:string,seq:number,position:{x:number;z:number})=>Promise<MmoPresence3D>;friendsOrigin?:string;now?:()=>number;obstacles?:(session:VerifiedSession)=>readonly Obstacle3[]};
export function createWorldRoom(deps:Dependencies){
 const now=deps.now??(()=>performance.now());
 const obstacles=deps.obstacles??((session:VerifiedSession)=>session.world==='town'?townObstacles3D(session.townLayout??freshTownLayout3D()):farmObstacles3D(session.farmLayout!));
 return class WorldRoom extends Room {
  private world='';private serverId='';private disposed=false;private entries=new Map<string,Entry>();
  static async onAuth(token:string,options:unknown,context:AuthContext):Promise<RoomAuth>{
   if(!allowedOrigin(context.headers.get('origin'),deps.friendsOrigin))throw new ServerError(403,'Local browser origin required');
   try{return{token,session:await authorize(token,options,deps.verify)};}catch(error){throw new ServerError(403,error instanceof Error?error.message:'Unauthorized');}
  }
  onCreate(options:{world:string;serverId?:string}){
   this.world=options.world;this.serverId=options.serverId??'local-1';this.maxClients=10;this.maxMessagesPerSecond=40;this.seatReservationTimeout=5;
   this.onMessage('pose',(client:Client,payload:unknown)=>{const entry=this.entries.get(client.sessionId);if(!entry||entry.closed)return;
    if(now()-entry.verifiedAt>=5000){this.close(entry,'Expired session');return;}
    const result=entry.movement.propose(payload);if(result.accepted){entry.dirty=true;entry.initialized=true;}if(!result.accepted)client.send('correction',entry.movement.correction());if(result.disconnect)this.close(entry,'Invalid movement or message limit');
   });
   this.onMessage('*',(client:Client)=>{const entry=this.entries.get(client.sessionId);if(entry)this.close(entry,'Unsupported message');});
   this.setSimulationInterval(()=>this.sendSnapshots(),100);
   if(deps.persistPose)this.clock.setInterval(()=>{for(const entry of this.entries.values())if(entry.dirty||now()-entry.lastPersist>=1000)void this.persist(entry);},200);
   this.clock.setInterval(()=>{for(const entry of this.entries.values())void this.refresh(entry);},1000);
  }
  async onJoin(client:Client,options:unknown){
   const auth=client.auth as RoomAuth|undefined;if(!auth||typeof auth.token!=='string')throw new ServerError(403,'Unauthorized');
   let session:VerifiedSession;try{session=await authorize(auth.token,options,deps.verify);}catch{throw new ServerError(403,'Unauthorized or expired session');}
   if(this.disposed||client.state>=4)throw new ServerError(409,'Connection closed');
   if(session.world!==this.world||session.serverId!==this.serverId)throw new ServerError(403,'Inactive world');
   try{deps.capacity.claim(session.userId,client.sessionId);}catch(error){throw new ServerError(409,error instanceof Error?error.message:'Server full');}
   try{const movement=new Movement(session,obstacles(session),now);const entry:Entry={client,session,token:auth.token,movement,verifiedAt:now(),refreshing:false,closed:false,persisting:false,persistSeq:session.seq,persisted:false,initialized:!session.allowInitialPosition,dirty:true,lastPersist:now()};
    this.entries.set(client.sessionId,entry);if(movement.updateObstacles(obstacles(session)))client.send('correction',movement.correction());
   }catch{deps.capacity.release(session.userId,client.sessionId);this.entries.delete(client.sessionId);throw new ServerError(403,'Inactive world');}
  }
  onLeave(client:Client){const entry=this.entries.get(client.sessionId);if(entry){entry.closed=true;deps.capacity.release(entry.session.userId,client.sessionId);this.entries.delete(client.sessionId);}}
  onDispose(){this.disposed=true;for(const entry of this.entries.values()){entry.closed=true;deps.capacity.release(entry.session.userId,entry.client.sessionId);}this.entries.clear();}
  private close(entry:Entry,reason:string){if(entry.closed)return;entry.closed=true;deps.capacity.release(entry.session.userId,entry.client.sessionId);this.entries.delete(entry.client.sessionId);entry.client.leave(4003,reason);}
  private async persist(entry:Entry){
   if(!deps.persistPose||!entry.initialized||entry.closed||entry.persisting||this.entries.get(entry.client.sessionId)!==entry)return;
   entry.persisting=true;entry.dirty=false;
   const position={x:entry.movement.pose.x,z:entry.movement.pose.z},revision=entry.session.roomRevision??0;
   const current=()=>!entry.closed&&this.entries.get(entry.client.sessionId)===entry;
   try{
    let result=await deps.persistPose(entry.token,entry.session.leaseId,++entry.persistSeq,position);
    if(!current())return;entry.persistSeq=Math.max(entry.persistSeq,result.seq);
    // An HTTP tick may already be in flight during ownership handoff. Retry once
    // with the returned sequence; every attempt still passes SQL authorization.
    if(result.accepted===false){result=await deps.persistPose(entry.token,entry.session.leaseId,++entry.persistSeq,position);if(!current())return;entry.persistSeq=Math.max(entry.persistSeq,result.seq);}
    if(result.world_id!==this.world||result.server_id!==this.serverId)throw new Error('Inactive world');
    if((entry.session.roomRevision??0)!==revision)return;
    entry.lastPersist=now();
    if(result.accepted===false){entry.movement.adopt(result);entry.client.send('correction',entry.movement.correction());entry.dirty=true;}
    else entry.persisted=true;
   }catch{if(current())this.close(entry,'Position synchronization unavailable');}finally{entry.persisting=false;}
  }
  private async refresh(entry:Entry){
   if(entry.closed||entry.refreshing)return;entry.refreshing=true;
   try{const session=await deps.verify(entry.token);if(entry.closed||this.entries.get(entry.client.sessionId)!==entry)return;
    if(session.userId!==entry.session.userId||session.world!==this.world||session.serverId!==this.serverId||session.leaseId!==entry.session.leaseId){this.close(entry,'Inactive world or lease');return;}
    const corrected=(session.roomRevision??0)!==(entry.session.roomRevision??0);
    if(corrected)entry.movement.adopt(session);
    entry.movement.updateObstacles(obstacles(session));entry.session=session;entry.persistSeq=Math.max(entry.persistSeq,session.seq);entry.verifiedAt=now();
    if(corrected)entry.client.send('correction',entry.movement.correction());
   }catch{this.close(entry,'Unauthorized or expired session');}finally{entry.refreshing=false;}
  }
  private sendSnapshots(){
   const active=[...this.entries.values()];for(const entry of active)if(now()-entry.verifiedAt>=5000)this.close(entry,'Expired session');
   const ready=active.filter(entry=>!entry.closed);
   for(const recipient of ready){const players=ready.filter(entry=>visible(recipient.session,entry.session)).map(entry=>({v:1 as const,userId:entry.session.userId,clientId:entry.client.sessionId,...entry.movement.pose,name:entry.session.name,appearance:entry.session.appearance,choice:entry.session.choice,lastSeen:Date.now()}));
    recipient.client.send('snapshot',{world:this.world,serverId:this.serverId,selfId:recipient.client.sessionId,players,count:players.length,limit:deps.capacity.limit,positionWriter:Boolean(deps.persistPose&&recipient.persisted)});
   }
  }
 };
}
