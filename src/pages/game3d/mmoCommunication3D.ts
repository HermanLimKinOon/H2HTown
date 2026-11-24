import type {MmoMessage3D} from './mmoCommunicationTypes3D';

export function parseMmoMessage3D(value:unknown,live=false,now=Date.now()):MmoMessage3D|null {
  if(!value||typeof value!=='object')return null;
  const m=value as MmoMessage3D,id=String(m.id??'');
  if(!/^\d{1,30}$/.test(id)||!['local','world','party','guild','private','system'].includes(m.channel))return null;
  if(typeof m.sender_name!=='string'||!m.sender_name.trim()||m.sender_name.length>80||typeof m.body!=='string'||Array.from(m.body).length>400||!m.body.trim())return null;
  if(!Number.isFinite(Date.parse(m.created_at))||!['text','emote','announcement'].includes(m.kind))return null;
  if(m.channel!=='system'&&typeof m.sender_id!=='string')return null;
  if(m.origin&&(!Number.isFinite(m.origin.x)||!Number.isFinite(m.origin.z)))return null;
  const result={...m,id,sender_name:m.sender_name.trim(),body:m.body.replace(/\p{Cc}/gu,' ').trim()};
  delete result.receivedAt;delete result.pending;delete result.failed;
  if(live)result.receivedAt=now;
  return result;
}

export function mergeMmoMessages3D(previous:MmoMessage3D[],incoming:MmoMessage3D[],limit=600):MmoMessage3D[] {
  const reconciled=new Set(incoming.filter(m=>!m.pending&&m.nonce).map(m=>`${m.sender_id}:${m.nonce}`));
  const byId=new Map(previous.filter(m=>!(m.pending&&m.nonce&&reconciled.has(`${m.sender_id}:${m.nonce}`))).map(m=>[m.id,m]));
  for(const message of incoming){const old=byId.get(message.id);byId.set(message.id,{...old,...message,receivedAt:old?.receivedAt??message.receivedAt});}
  return [...byId.values()].sort((a,b)=>{
    const time=Date.parse(a.created_at)-Date.parse(b.created_at);if(time)return time;
    if(/^\d+$/.test(a.id)&&/^\d+$/.test(b.id))return BigInt(a.id)<BigInt(b.id)?-1:BigInt(a.id)>BigInt(b.id)?1:0;
    return a.id.localeCompare(b.id);
  }).slice(-limit);
}

export function mmoErrorText3D(error:unknown):string {
  const raw=error&&typeof error==='object'&&'message' in error?String(error.message):String(error||'');
  const mappings:[RegExp,string][]=[
    [/inactive client lease/i,'This player session was replaced by another tab. Close the other game tab or use a separate local test player.'],
    [/rate|cooldown|too.fast|spam/i,'Please wait a moment before sending another message.'],
    [/duplicate.*(text|message)|repeat/i,'Please avoid repeating the same message.'],
    [/not_in_group|membership|not.*member|no.*(party|guild)/i,'Join a party or guild before using this channel.'],
    [/permission|forbidden|not_authorized|not_allowed/i,'You do not have permission to do that.'],
    [/blocked/i,'Messages cannot be exchanged with this player.'],
    [/stale|presence|lease|session.*(missing|expired)|not_connected/i,'Reconnecting to your world. Please try again shortly.'],
    [/invalid.*(body|message)|too.long|length/i,'Write a message of 1–400 characters.'],
    [/invite.*(expired|invalid|missing)/i,'This invitation is no longer available.'],
    [/already.*(party|guild|group)/i,'Leave your current group before joining another.'],
    [/fetch|network|timeout|connection/i,'Connection interrupted. Please try again.'],
  ];
  return mappings.find(([pattern])=>pattern.test(raw))?.[1]||raw.replace(/\p{Cc}/gu,' ').slice(0,180)||'The request could not be completed.';
}
