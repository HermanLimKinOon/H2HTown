import {useEffect,useRef,useState} from 'react';
import {normalizeHouseLayout3D,type HouseLayout3D} from './houseCustomization3D';
import type {useWorldEditing3D} from './useWorldEditing3D';
type Options={request:ReturnType<typeof useWorldEditing3D>['request'];userId:string|null;houseId:string;active:boolean;editing:boolean;onLayout:(layout:HouseLayout3D)=>void};
export function useHouseWorld3D(options:Options){
 const live=useRef(options);live.current=options;
 const [record,setRecord]=useState<{world:string;version:number}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {request,userId,houseId,active,editing}=options,world=`house:${userId}:${houseId}`;
 useEffect(()=>{if(!active||!userId||editing)return;let disposed=false,timer:ReturnType<typeof setTimeout>;
  const load=async()=>{try{const next=await request('read',world);if(disposed)return;setRecord({world,version:next.version});setError('');if(next.data)live.current.onLayout(normalizeHouseLayout3D(next.data));}catch(e){if(!disposed){setRecord(null);setError(e instanceof Error?e.message:'House unavailable.');}}finally{if(!disposed)timer=setTimeout(()=>void load(),5000);}};
  void load();return()=>{disposed=true;clearTimeout(timer);};
 },[request,userId,world,active,editing]);
 const save=async(layout:HouseLayout3D)=>{if(busy||!record||record.world!==world)return false;setBusy(true);try{const next=await request('save',world,layout,record.version);setRecord({world,version:next.version});setError('');return true;}catch(e){setError(e instanceof Error?e.message:'House save failed.');return false;}finally{setBusy(false);}};
 return {ready:active&&record?.world===world,error,busy,save};
}
