import {useCallback,useEffect,useRef,useState,type MutableRefObject} from 'react';
import {connectColyseus3D,normalizeColyseusWorld3D,type ColyseusStatus3D} from './colyseusConnection3D';
import type {TownLocalPose3D,TownPeers3D} from './townMultiplayer3D';
import type {GameIdentity3D} from './useGameIdentity3D';

type Options={enabled:boolean;endpoint:string;friendsOrigin?:string;world:string;pose:MutableRefObject<TownLocalPose3D>;identity:GameIdentity3D;onCorrection:(pose:TownLocalPose3D)=>void};
export function useColyseusMultiplayer3D(options:Options){
 const live=useRef(options);live.current=options;
 const [peers,setPeers]=useState<TownPeers3D>({}),[status,setStatus]=useState<ColyseusStatus3D>('offline'),[error,setError]=useState(''),[roomCount,setCount]=useState(0),[limit,setLimit]=useState(10),[attempt,setAttempt]=useState(0);
 const [ownsPosition,setOwnsPosition]=useState(false);
 const closed=useRef<Promise<void>>(Promise.resolve());
 const owner=useRef<{client:GameIdentity3D['client'];userId:string;world:string;endpoint:string}|null>(null);
 const {enabled,endpoint,identity}=options,{client,userId}=identity;
 const world=normalizeColyseusWorld3D(options.world,userId??'')??options.world;
 const available=Boolean(enabled&&client&&userId);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 useEffect(()=>{
  if(!enabled||!client||!userId){owner.current=null;setOwnsPosition(false);setPeers({});setCount(0);setStatus('offline');setError('');return;}
  let disposed=false,connection:ReturnType<typeof connectColyseus3D>|null=null;
  const current=()=>!disposed&&live.current.enabled&&live.current.identity.client===client&&live.current.identity.userId===userId&&(normalizeColyseusWorld3D(live.current.world,userId)??live.current.world)===world&&live.current.endpoint===endpoint;
  owner.current={client,userId,world,endpoint};setOwnsPosition(false);setPeers({});setCount(0);setStatus('connecting');setError('');
  void closed.current.then(()=>{
   if(!current())return;
   connection=connectColyseus3D({endpoint,friendsOrigin:live.current.friendsOrigin,client,userId,world,onPositionAuthority:owned=>{if(current())setOwnsPosition(owned);},getPose:()=>live.current.pose.current,onPeers:next=>{if(current())setPeers(next);},onStatus:next=>{if(current())setStatus(next);},onError:message=>{if(current())setError(message);},onCorrection:pose=>{if(current())live.current.onCorrection(pose);},onRoomInfo:info=>{if(current()){setCount(info.count);setLimit(info.limit);}}});
  });
  return()=>{disposed=true;owner.current=null;const previous=closed.current;const stopping=connection?.stop()??Promise.resolve();closed.current=Promise.all([previous,stopping]).then(()=>{});};
 },[enabled,client,userId,world,endpoint,attempt]);
 // Never render peers from the previous account or world before effect cleanup.
 const matches=owner.current?.client===client&&owner.current?.userId===userId&&owner.current?.world===world&&owner.current?.endpoint===endpoint;
 return {ownsPosition:available&&matches&&ownsPosition,peers:available&&matches?peers:{},status:!available?'offline' as const:matches?status:'connecting' as const,error:available&&matches?error:'',name:identity.name,available,retry,roomCount:available&&matches?roomCount:0,limit};
}
