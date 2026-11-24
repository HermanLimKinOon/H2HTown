import type { TownPeers3D } from './townMultiplayer3D';

export const TOWN_CHAT_MAX_3D=240;
export const townChatTopic3D=(userId:string)=>`h2h-town-3d-chat:${userId}`;
type Point={x:number;z:number};
export type TownChatPacket3D=Point & {v:1;id:string;userId:string;clientId:string;toClientId:string;text:string;sentAt:number};
export type TownChatMessage3D={id:string;clientId:string;name:string;text:string;sentAt:number;own:boolean;toClientId?:string};
export const townConversation3D=(messages:TownChatMessage3D[],partnerId:string)=>messages.filter(message=>message.own?message.toClientId===partnerId:message.clientId===partnerId);

// Chat uses the entire highlighted 3×3 area; sharing the center tile is allowed.
export const isTownChatNearby3D=(a:Point,b:Point)=>
  Math.abs(Math.round(a.x)-Math.round(b.x))<=1&&Math.abs(Math.round(a.z)-Math.round(b.z))<=1;

export function townChatRecipients3D(sender:Point,peers:TownPeers3D,now:number) {
  return Object.values(peers).filter(peer=>now-peer.lastSeen<2000&&isTownChatNearby3D(sender,peer));
}

export function parseTownChat3D(value:unknown):TownChatPacket3D|null {
  if(!value||typeof value!=='object')return null;
  const p=value as TownChatPacket3D;
  if(p.v!==1||![p.id,p.userId,p.clientId,p.toClientId].every(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(id)))return null;
  if(![p.x,p.z,p.sentAt].every(Number.isFinite)||Math.abs(p.x)>23.55||Math.abs(p.z)>23.55)return null;
  if(typeof p.text!=='string'||p.text.length>TOWN_CHAT_MAX_3D)return null;
  const text=p.text.replace(/\p{Cc}/gu,' ').trim();
  if(!text)return null;
  return {v:1,id:p.id,userId:p.userId,clientId:p.clientId,toClientId:p.toClientId,text,sentAt:p.sentAt,x:p.x,z:p.z};
}

export function receiveTownChat3D(value:unknown,self:Point&{clientId:string},peers:TownPeers3D,seen:ReadonlySet<string>,now:number):TownChatMessage3D|null {
  const p=parseTownChat3D(value);
  if(!p||p.toClientId!==self.clientId||p.clientId===self.clientId||seen.has(p.id)||now-p.sentAt>=10000||p.sentAt-now>5000)return null;
  const sender=peers[p.clientId];
  if(!sender||sender.userId!==p.userId||now-sender.lastSeen>=2000||!isTownChatNearby3D(p,self)||!isTownChatNearby3D(sender,self))return null;
  return {id:p.id,clientId:p.clientId,name:sender.name,text:p.text,sentAt:p.sentAt,own:false};
}
