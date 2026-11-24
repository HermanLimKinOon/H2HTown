import {useCallback,useEffect,useState} from 'react';
import type {ShopRequest3D} from './ShopProductsEditor3D';
export type MerchantNotice3D={id:string;application_id:string;shop_name:string;status:string;body:string;created_at:string;read_at:string|null;audience:'player'|'admin'};
type Snapshot={notifications:MerchantNotice3D[];unread:number};
const empty:Snapshot={notifications:[],unread:0};
export function useMerchantNotifications3D(request:ShopRequest3D){
 const [data,setData]=useState<Snapshot>(empty),[error,setError]=useState('');
 useEffect(()=>{let stopped=false,running=false,timer:ReturnType<typeof setTimeout>;
  const refresh=async()=>{if(running||stopped)return;running=true;clearTimeout(timer);try{const next:Snapshot=await request('merchant_notices');if(!stopped){setData(next);setError('');}}catch{/* Retry after reconnect; retain previously received notices. */}finally{running=false;if(!stopped)timer=setTimeout(()=>void refresh(),15000);}};
  const changed=()=>{clearTimeout(timer);void refresh();};
  void refresh();window.addEventListener('game-merchant-updated',changed);
  return()=>{stopped=true;clearTimeout(timer);window.removeEventListener('game-merchant-updated',changed);};
 },[request]);
 const acknowledge=useCallback(async(id:string)=>{try{await request('merchant_ack',id);window.dispatchEvent(new Event('game-merchant-updated'));}catch(e){setError(e instanceof Error?e.message:'Could not mark notification as read.');}},[request]);
 return {...data,error,acknowledge};
}
