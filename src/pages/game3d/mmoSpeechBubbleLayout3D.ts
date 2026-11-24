import type { MmoMessage3D } from './mmoCommunicationTypes3D';

export const MMO_BUBBLE_LIMIT_3D=5;
export const MMO_BUBBLE_TEXT_LIMIT_3D=100;
export type MmoBubbleRect3D={id:string;x:number;y:number;width:number;height:number};

/** Keep user text literal. React escapes markup at the rendering boundary. */
export function mmoBubbleText3D(value:unknown):string {
  if(typeof value!=='string')return '';
  const clean=value.replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/\s+/g,' ').trim();
  const chars=Array.from(clean);
  return chars.length>MMO_BUBBLE_TEXT_LIMIT_3D?chars.slice(0,MMO_BUBBLE_TEXT_LIMIT_3D-1).join('')+'…':clean;
}

export function mmoBubbleLifetime3D(text:string):number {
  return Math.min(6000,4000+Array.from(text).length*20);
}

export function activeMmoBubbles3D(messages:readonly MmoMessage3D[],now:number,limit=24):MmoMessage3D[] {
  const newest=new Map<string,MmoMessage3D>();
  for(const message of messages){
    if(message.channel!=='local'||!message.sender_id||message.pending||message.failed||!Number.isFinite(message.receivedAt)||message.receivedAt!>now||!mmoBubbleText3D(message.body))continue;
    const previous=newest.get(message.sender_id);
    if(!previous||message.receivedAt!>previous.receivedAt!||(message.receivedAt===previous.receivedAt&&newerMessageId(message.id,previous.id)))newest.set(message.sender_id,message);
  }
  return [...newest.values()].filter(message=>now-message.receivedAt!<mmoBubbleLifetime3D(mmoBubbleText3D(message.body)))
    .sort((a,b)=>b.receivedAt!-a.receivedAt!).slice(0,Math.max(0,limit));
}

function newerMessageId(a:string,b:string):boolean {
  if(/^\d+$/.test(a)&&/^\d+$/.test(b))return BigInt(a)>BigInt(b);
  return a>b;
}

export function mmoBubbleOnscreen3D(ndc:{x:number;y:number;z:number},viewZ:number):boolean {
  return [ndc.x,ndc.y,ndc.z,viewZ].every(Number.isFinite)&&viewZ<0&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&Math.abs(ndc.z)<=1;
}

/** Inputs are in newest-first priority order; crowded bubbles disappear. */
export function layoutMmoBubbles3D(candidates:readonly MmoBubbleRect3D[],width:number,height:number,limit=MMO_BUBBLE_LIMIT_3D):MmoBubbleRect3D[] {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<48||height<48)return [];
  const placed:MmoBubbleRect3D[]=[];
  const margin=8,gap=8;
  for(const candidate of candidates){
    if(placed.length>=limit)break;
    if(![candidate.x,candidate.y,candidate.width,candidate.height].every(Number.isFinite)||candidate.width<=0||candidate.height<=0||candidate.width>width-margin*2||candidate.height>height-margin*2)continue;
    // Reject offscreen head anchors before clamping the actual bubble rectangle.
    if(candidate.x<0||candidate.x>width||candidate.y<0||candidate.y>height)continue;
    for(const offset of [0,1,2]){
      const x=Math.max(margin,Math.min(width-margin-candidate.width,candidate.x-candidate.width/2));
      const y=Math.max(margin,Math.min(height-margin-candidate.height,candidate.y-candidate.height-12-offset*(candidate.height+gap)));
      const rect={...candidate,x,y};
      if(placed.every(other=>rect.x+rect.width+gap<=other.x||other.x+other.width+gap<=rect.x||rect.y+rect.height+gap<=other.y||other.y+other.height+gap<=rect.y)){
        placed.push(rect);break;
      }
    }
  }
  return placed;
}
