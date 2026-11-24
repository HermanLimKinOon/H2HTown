import {useCallback,useEffect,useRef,useState} from 'react';
import {type SupabaseClient} from '@supabase/supabase-js';
import websiteSupabase from '@/lib/supabase';
import {isLocalTownBackend3D} from './townMultiplayer3D';
import {createGameAccount3D,type GameAccountState3D} from './gameAccount3D';

export type GameIdentity3D={client:SupabaseClient|null;userId:string|null;name:string;status:GameAccountState3D['status'];error:string;retry:()=>void;localTest:boolean;signIn:(email:string,password:string)=>Promise<boolean>;signUp:(email:string,password:string)=>Promise<'signed-in'|'verify-email'|'error'>;signOut:()=>Promise<void>};
export function useGameIdentity3D(characterName:string):GameIdentity3D{
 const friends=import.meta.env.MODE==='friends',url=import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
 const localTest=friends||isLocalTownBackend3D(url,window.location.hostname,import.meta.env.DEV);
 const client=websiteSupabase;
 const [state,setState]=useState<GameAccountState3D>({session:null,status:'connecting',error:''}),[attempt,setAttempt]=useState(0);
 const account=useRef<ReturnType<typeof createGameAccount3D>|null>(null);
 useEffect(()=>{
  const service=createGameAccount3D(client,setState);account.current=service;client.auth.startAutoRefresh();void service.start();
  return()=>{service.stop();if(account.current===service)account.current=null;};
 },[client,attempt]);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 const signIn=useCallback((email:string,password:string)=>account.current?.signIn(email,password)??Promise.resolve(false),[]);
 const signUp=useCallback((email:string,password:string)=>account.current?.signUp(email,password)??Promise.resolve('error' as const),[]);
 const signOut=useCallback(()=>account.current?.signOut()??Promise.resolve(),[]);
 const userId=state.session?.user.id??null;
 return{client,userId,name:`${characterName||'Farmer'}${localTest&&userId?` ${userId.slice(0,4)}`:''}`.slice(0,32),status:state.status,error:state.error,retry,localTest,signIn,signUp,signOut};
}
