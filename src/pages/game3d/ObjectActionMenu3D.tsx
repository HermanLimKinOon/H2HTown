import { useEffect,useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
export type ObjectMenuAction3D={id:string;label:string;icon?:string;disabled?:boolean;reason?:string;danger?:boolean;onSelect:()=>void};
export type ObjectMenuState3D={title:string;icon?:string;detail?:string;position:[number,number,number];actions:ObjectMenuAction3D[]};
export default function ObjectActionMenu3D({title,icon='✦',detail,position,actions,onClose,closeOnAction=true}:ObjectMenuState3D&{onClose:()=>void;closeOnAction?:boolean}) {
  const dialog=useRef<HTMLDivElement>(null);
  const closeHandler=useRef(onClose);
  useEffect(()=>{closeHandler.current=onClose;});
  useEffect(()=>{dialog.current?.focus({preventScroll:true});const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();closeHandler.current();}};window.addEventListener('keydown',close,true);return()=>window.removeEventListener('keydown',close,true);},[]);
  return <Html position={position} center zIndexRange={[20000000,19000000]} calculatePosition={(object,camera,size)=>{
    const p=new THREE.Vector3().setFromMatrixPosition(object.matrixWorld).project(camera),half=Math.min(170,size.width*.44);
    return [Math.max(half+8,Math.min(size.width-half-8,(p.x*.5+.5)*size.width)),Math.max(145,Math.min(size.height-190,(-p.y*.5+.5)*size.height))];
  }}>
    <div ref={dialog} tabIndex={-1} role="dialog" aria-label={`${title} actions`} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} className="relative w-[min(88vw,340px)] rounded-[2rem] border border-white/80 bg-[#eff7f3]/95 p-3 text-slate-800 shadow-[0_12px_36px_#183b3540] outline-none backdrop-blur-md">
      <button type="button" onClick={onClose} aria-label="Close object actions" className="absolute right-3 top-2 h-7 w-7 rounded-full bg-white/80 text-slate-500">×</button>
      <div className="grid items-center gap-2 pt-2" style={{gridTemplateColumns:'minmax(0,1fr) 80px minmax(0,1fr)'}}>
        <div style={{gridColumn:2,gridRow:actions.length>=3?2:1}} className="flex min-h-20 flex-col items-center justify-center text-center"><span aria-hidden="true" className="mb-1 flex h-9 w-9 rotate-45 items-center justify-center rounded-lg border-2 border-teal-300 bg-white shadow-sm"><span className="-rotate-45 text-xl text-teal-700">{icon}</span></span><h3 className="mt-1 max-w-20 text-[11px] font-bold leading-tight">{title}</h3></div>
        {actions.map((action,index)=>{
          const slots=actions.length<=2?[[1,1],[3,1]]:actions.length===3?[[2,1],[1,2],[3,2]]:actions.length===4?[[2,1],[1,2],[3,2],[2,3]]:[[2,1],[1,2],[3,2],[1,3],[3,3],[2,4]];
          const [column,row]=slots[index]??[2,4];
          return <button key={action.id} type="button" style={{gridColumn:column,gridRow:row}} disabled={action.disabled} title={action.disabled?action.reason:undefined} onClick={()=>{if(closeOnAction)onClose();action.onSelect();}} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full border border-white bg-white px-2 py-2 text-center text-[11px] font-semibold leading-tight shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:transform-none disabled:bg-slate-100 disabled:opacity-50 ${action.danger?'text-red-700':'text-teal-900'}`}><span aria-hidden="true" className="text-lg">{action.icon??'✦'}</span><span>{action.label}{action.disabled&&action.reason&&<span className="mt-0.5 block text-[9px] font-normal text-slate-500">{action.reason}</span>}</span></button>;
        })}
      </div>
      {detail&&<p className="mt-3 text-center text-[10px] leading-snug text-slate-500">{detail}</p>}

    </div>
  </Html>;
}
