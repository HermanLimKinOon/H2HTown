import { normalizeAppearance3D, type FarmerAppearance3D } from './game3d';
import { normalizeCharacterChoice3D, type CharacterChoice3D } from './characterChoice3D';

export const TOWN_ROOM_3D = 'h2h-town-3d-v1';
export type TownLocalPose3D = { x:number; y:number; z:number; yaw:number; moving:boolean; running:boolean };
export type TownPose3D = TownLocalPose3D & { v:1; userId:string; clientId:string; seq:number };
export type TownProfile3D = { name:string; appearance:FarmerAppearance3D; choice:CharacterChoice3D };
export type TownPeer3D = TownPose3D & TownProfile3D & { lastSeen:number };
export type TownPeers3D = Record<string,TownPeer3D>;

export function isLocalTownBackend3D(url:string,host:string,dev:boolean):boolean {
  const local=(name:string)=>['localhost','127.0.0.1','[::1]'].includes(name);
  try { const endpoint=new URL(url);return dev&&local(host)&&local(endpoint.hostname)&&endpoint.protocol==='http:'; }
  catch { return false; }
}

export function parseTownPose3D(value:unknown):TownPose3D|null {
  if(!value||typeof value!=='object')return null;
  const p=value as TownPose3D;
  if(p.v!==1||![p.userId,p.clientId].every(id=>typeof id==='string'&&id.length>0&&id.length<=100))return null;
  if(!Number.isSafeInteger(p.seq)||p.seq<0||![p.x,p.y,p.z,p.yaw].every(Number.isFinite))return null;
  if(Math.abs(p.x)>23.55||Math.abs(p.z)>23.55||p.y<0||p.y>4||typeof p.moving!=='boolean'||typeof p.running!=='boolean')return null;
  return {v:1,userId:p.userId,clientId:p.clientId,seq:p.seq,x:p.x,y:p.y,z:p.z,yaw:p.yaw,moving:p.moving,running:p.moving&&p.running};
}

export function townPeersFromPresence3D(state:Record<string,unknown[]>,self:string,now:number,previous:TownPeers3D={}):TownPeers3D {
  const result:TownPeers3D={};
  for(const [key,entries] of Object.entries(state))for(const entry of entries) {
    const pose=parseTownPose3D(entry);
    if(!pose||pose.clientId===self||pose.clientId!==key)continue;
    const profile=entry as Partial<TownProfile3D>;
    const old=previous[key];
    result[key]={...pose,name:typeof profile.name==='string'?profile.name.trim().slice(0,32)||'Farmer':'Farmer',
      appearance:normalizeAppearance3D(profile.appearance),choice:normalizeCharacterChoice3D(profile.choice),lastSeen:now};
    if(old&&old.userId===pose.userId&&old.seq>pose.seq)result[key]={...result[key],...old};
  }
  return result;
}

export function acceptTownPose3D(peers:TownPeers3D,value:unknown,self:string,now:number):TownPeers3D {
  const pose=parseTownPose3D(value);
  if(!pose||pose.clientId===self)return peers;
  const old=peers[pose.clientId];
  if(!old||pose.userId!==old.userId||pose.seq<=old.seq)return peers;
  return {...peers,[pose.clientId]:{...old,...pose,lastSeen:now}};
}

export function pruneTownPeers3D(peers:TownPeers3D,now:number):TownPeers3D {
  const entries=Object.entries(peers).filter(([,peer])=>now-peer.lastSeen<8000);
  return entries.length===Object.keys(peers).length?peers:Object.fromEntries(entries);
}
export const isTownPeerMoving3D=(peer:TownPeer3D,now:number)=>peer.moving&&now-peer.lastSeen<800;

export function interpolateTownPose3D(current:{x:number;y:number;z:number;yaw:number},target:{x:number;y:number;z:number;yaw:number},delta:number) {
  const alpha=1-Math.exp(-14*Math.min(.1,Math.max(0,delta)));
  const snap=Math.hypot(target.x-current.x,target.z-current.z)>8;
  return {x:snap?target.x:current.x+(target.x-current.x)*alpha,y:current.y+(target.y-current.y)*alpha,
    z:snap?target.z:current.z+(target.z-current.z)*alpha,
    yaw:current.yaw+Math.atan2(Math.sin(target.yaw-current.yaw),Math.cos(target.yaw-current.yaw))*alpha};
}
