import type { RealtimeChannel,SupabaseClient } from '@supabase/supabase-js';
import { parseTownChat3D,receiveTownChat3D,townChatRecipients3D,townChatTopic3D,type TownChatMessage3D } from './townChat3D';
import type { TownLocalPose3D,TownPeers3D,TownProfile3D } from './townMultiplayer3D';

export type TownChatSendResult3D={ok:boolean;message?:string};
export function connectTownChat3D(client:SupabaseClient,options:{
  userId:string;clientId:string;getPose:()=>TownLocalPose3D;getPeers:()=>TownPeers3D;getProfile:()=>TownProfile3D;
  isTownOnline:()=>boolean;onMessage:(message:TownChatMessage3D)=>void;onReady:(ready:boolean)=>void;
}) {
  let disposed=false,ready=false,lastSent=-Infinity;
  const seen=new Set<string>(),lastReceived=new Map<string,number>();
  const outboxes=new Map<string,RealtimeChannel>();
  const remember=(id:string)=>{seen.add(id);if(seen.size>200)seen.delete(seen.values().next().value);};
  const inbox=client.channel(townChatTopic3D(options.userId),{config:{private:true,broadcast:{self:false,ack:true}}});
  inbox.on('broadcast',{event:'nearby-chat'},({payload})=>{
    if(disposed||!ready||!options.isTownOnline())return;
    const now=Date.now(),self={...options.getPose(),clientId:options.clientId};
    const message=receiveTownChat3D(payload,self,options.getPeers(),seen,now);
    if(!message||now-(lastReceived.get(message.clientId)??-Infinity)<500)return;
    remember(message.id);lastReceived.set(message.clientId,now);options.onMessage(message);
  }).subscribe(status=>{if(disposed)return;ready=status==='SUBSCRIBED';options.onReady(ready);});

  return {
    async send(text:string,toClientId:string):Promise<TownChatSendResult3D> {
      if(disposed||!ready||!options.isTownOnline())return {ok:false,message:'Connect to the town to chat.'};
      const now=Date.now(),pose=options.getPose();
      const packet=parseTownChat3D({v:1,id:crypto.randomUUID(),userId:options.userId,clientId:options.clientId,toClientId:options.clientId,text,sentAt:now,x:pose.x,z:pose.z});
      if(!packet)return {ok:false,message:'Write a message of 1–240 characters.'};
      if(now-lastSent<1000)return {ok:false,message:'Wait a moment before sending again.'};
      const recipients=townChatRecipients3D(pose,options.getPeers(),now).filter(peer=>peer.clientId===toClientId);
      if(!recipients.length)return {ok:false,message:'This player is not inside your highlighted tiles.'};
      lastSent=now;
      const results=await Promise.allSettled(recipients.map(peer=>{
        // Send only to nearby users' private inboxes, never to the shared town topic.
        let channel=peer.userId===options.userId?inbox:outboxes.get(peer.userId);
        if(!channel){channel=client.channel(townChatTopic3D(peer.userId),{config:{private:true}});outboxes.set(peer.userId,channel);}
        return channel.send({type:'broadcast',event:'nearby-chat',payload:{...packet,toClientId:peer.clientId}});
      }));
      if(disposed)return {ok:false,message:'You left the town.'};
      if(!results.some(result=>result.status==='fulfilled'&&result.value==='ok'))return {ok:false,message:'Message could not be sent. Try again.'};
      remember(packet.id);
      options.onMessage({id:packet.id,clientId:packet.clientId,toClientId,name:options.getProfile().name,text:packet.text,sentAt:now,own:true});
      return {ok:true};
    },
    async stop() {
      if(disposed)return;
      disposed=true;ready=false;
      const channels=[inbox,...outboxes.values()];
      await Promise.all(channels.map(channel=>channel.unsubscribe().finally(()=>channel.teardown())));
      seen.clear();lastReceived.clear();outboxes.clear();
    },
  };
}
