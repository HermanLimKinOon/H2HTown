import { useEffect, useRef, useState } from 'react';
import type { SocialFarmModel3D } from './socialFarmTypes3D';
import { createSocialFarmClient3D, type SocialFarmOptions3D } from './socialFarmClient3D';

const empty:SocialFarmModel3D={status:'connecting',error:'',busy:false,state:null,profile:null,selfId:null,visiting:null,farm:null,peers:{},findPlayers:async()=>[],loadProfile:async()=>{},saveProfile:async()=>false,friend:async()=>false,invite:async()=>false,respond:async()=>false,revoke:async()=>false,leave:async()=>{},refresh:async()=>{},clearError:()=>{},act:async()=>false};
/** Getter refs keep movement/save renders from reconnecting the polling service. */
export function useSocialFarm3D(options:SocialFarmOptions3D):SocialFarmModel3D {
 const live=useRef(options);live.current=options;
 const [model,setModel]=useState<SocialFarmModel3D>(empty);
 const owner=useRef<{client:SocialFarmOptions3D['client'];userId:string|null}|null>(null);
 const {client,userId,ready}=options;
 useEffect(()=>{
  if(!client||!userId){owner.current=null;setModel({...empty,status:'offline',selfId:userId});return;}
  let disposed=false;
  const service=createSocialFarmClient3D({client,userId,get ready(){return live.current.ready&&live.current.userId===userId&&live.current.client===client;},getOwnSave:()=>live.current.getOwnSave(),getWorld:()=>live.current.getWorld(),getOwner:()=>live.current.getOwner(),getAvatar:()=>live.current.getAvatar(),getPose:()=>live.current.getPose(),onFarm:farm=>{if(live.current.userId===userId&&live.current.client===client)live.current.onFarm(farm);},onVisit:farm=>{if(live.current.userId===userId&&live.current.client===client)live.current.onVisit(farm);},onChange:next=>{if(!disposed&&live.current.userId===userId&&live.current.client===client)setModel(next);}});
  owner.current={client,userId};setModel(service.snapshot());void service.start();
  return()=>{disposed=true;service.stop();owner.current=null;};
 },[client,userId]);
 if(!client||!userId||owner.current?.client!==client||owner.current?.userId!==userId)return {...empty,status:ready?'connecting':'offline',selfId:userId};
 return ready?model:{...model,status:'connecting'};
}
