import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {freshTownLayout3D,normalizeTownLayout3D,type TownLayout3D} from './townCustomization3D';
export type WorldEditRecord3D={world:string;version:number;data:unknown};
export function useWorldEditing3D(client:SupabaseClient|null,userId:string|null){
 const [state,setState]=useState<{user:string|null;role:'admin'|'player'|null;town:TownLayout3D}>({user:null,role:null,town:freshTownLayout3D()});
 const identity=useRef(userId);identity.current=userId;
 const request=useCallback(async(action:string,world='town',data:unknown=null,version:number|null=null)=>{
  if(!client||!userId)throw Error('Sign in first.');
  const {data:result,error}=await client.rpc('mmo_world_editor',{p_action:action,p_world:world,p_data:data,p_version:version});
  if(identity.current!==userId)throw Error('Account changed.');
  if(error)throw Error(error.message);return result;
 },[client,userId]);
 useEffect(()=>{let stopped=false;let timer:ReturnType<typeof setTimeout>;
  const refresh=async()=>{try{const role=await request('role'),town=await request('read');if(!stopped)setState({user:userId,role:role.role==='admin'?'admin':'player',town:normalizeTownLayout3D(town.data)});}catch{if(!stopped)setState(current=>({...current,user:userId,role:null}));}finally{if(!stopped)timer=setTimeout(()=>void refresh(),5000);}};
  void refresh();return()=>{stopped=true;clearTimeout(timer);};
 },[request,userId]);
 return {role:state.user===userId?state.role:null,town:state.user===userId?state.town:freshTownLayout3D(),request};
}
