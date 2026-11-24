import type { SupabaseClient } from '@supabase/supabase-js';
import { TOWN_ROOM_3D,acceptTownPose3D,townPeersFromPresence3D,pruneTownPeers3D,parseTownPose3D,type TownLocalPose3D,type TownProfile3D,type TownPeers3D } from './townMultiplayer3D';

export type TownConnectionStatus3D='connecting'|'online'|'reconnecting'|'offline';
export function connectTown3D(client:SupabaseClient,options:{
  userId:string;clientId:string;getPose:()=>TownLocalPose3D;getProfile:()=>TownProfile3D;
  onPeers:(peers:TownPeers3D)=>void;onStatus:(status:TownConnectionStatus3D)=>void;
}) {
  let peers:TownPeers3D={},sequence=0,ready=false,disposed=false;
  const packet=()=>({v:1 as const,userId:options.userId,clientId:options.clientId,seq:sequence++,...options.getPose()});
  const update=(next:TownPeers3D)=>{if(disposed)return;peers=next;options.onPeers(peers);};
  const channel=client.channel(TOWN_ROOM_3D,{config:{private:true,broadcast:{self:false,ack:false},presence:{key:options.clientId}}});
  const track=()=>channel.track({...options.getProfile(),...packet()});
  channel.on('presence',{event:'sync'},()=>update(townPeersFromPresence3D(channel.presenceState(),options.clientId,Date.now(),peers)))
    .on('broadcast',{event:'pose'},({payload})=>{
      const pose=parseTownPose3D(payload),now=Date.now();
      if(!pose)return;
      // A throttled/background tab can recover after stale-avatar expiry without rejoining.
      const known=peers[pose.clientId]?peers:townPeersFromPresence3D(channel.presenceState(),options.clientId,now,peers);
      update(acceptTownPose3D(known,payload,options.clientId,now));
    })
    .subscribe(status=>{
      if(disposed)return;
      ready=status==='SUBSCRIBED';
      if(ready){options.onStatus('online');void track();}
      else {update({});options.onStatus(status==='CLOSED'?'offline':'reconnecting');}
    });
  options.onStatus('connecting');
  const timer=setInterval(()=>{
    if(!ready||disposed)return;
    const now=Date.now();
    void channel.send({type:'broadcast',event:'pose',payload:packet()});
    const fresh=pruneTownPeers3D(peers,now);if(fresh!==peers)update(fresh);
  },100);
  return ()=>{
    if(disposed)return Promise.resolve();
    disposed=true;ready=false;clearInterval(timer);
    // Leave the room without racing the SDK's asynchronous last-channel socket shutdown.
    return channel.unsubscribe().then(()=>{}).finally(()=>channel.teardown());
  };
}
