import {useEffect,useRef,useState} from 'react';
import {connectTown3D,type TownConnectionStatus3D} from './townConnection3D';
import type {TownLocalPose3D,TownPeers3D,TownProfile3D} from './townMultiplayer3D';
import type {GameIdentity3D} from './useGameIdentity3D';

// This stream animates remote players; it cannot authorize communication recipients.
export function useTownMultiplayer3D(enabled:boolean,pose:React.MutableRefObject<TownLocalPose3D>,profile:Omit<TownProfile3D,'name'>,identity:GameIdentity3D) {
  const latest=useRef(profile);latest.current=profile;
  const [peers,setPeers]=useState<TownPeers3D>({});
  const [status,setStatus]=useState<TownConnectionStatus3D|'error'|'solo'>('solo');
  const [attempt,setAttempt]=useState(0);
  const clientId=useRef(crypto.randomUUID());
  const closed=useRef<Promise<void>>(Promise.resolve());
  const {client,userId,name}=identity;
  useEffect(()=>{
    if(!enabled||!client||!userId){setPeers({});setStatus('solo');return;}
    let disposed=false,stop:(()=>Promise<void>)|undefined;
    setStatus('connecting');
    void closed.current.then(()=>{
      if(disposed)return;
      stop=connectTown3D(client,{userId,clientId:clientId.current,getPose:()=>pose.current,getProfile:()=>({...latest.current,name}),
        onPeers:next=>{if(!disposed)setPeers(next);},onStatus:next=>{if(!disposed)setStatus(next);}});
    });
    return ()=>{disposed=true;closed.current=stop?.()??Promise.resolve();};
  },[enabled,client,userId,name,pose,attempt]);
  useEffect(()=>{
    if(!enabled||!client||status!=='offline')return;
    const timer=window.setTimeout(()=>setAttempt(value=>value+1),2000);
    return ()=>window.clearTimeout(timer);
  },[status,enabled,client]);
  return {peers,status,error:identity.error,name,available:!!client,retry:()=>{identity.retry();setAttempt(value=>value+1);}};
}
