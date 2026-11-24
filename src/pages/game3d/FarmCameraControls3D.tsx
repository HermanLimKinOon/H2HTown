import {useEffect,useState} from 'react';
import type { FarmCameraAction3D } from './farmCamera3D';

export default function FarmCameraControls3D({ onAction, indoor=false }: { indoor?:boolean;onAction: (action: FarmCameraAction3D) => void }) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{setOpen(!matchMedia('(any-pointer: coarse), (max-width:1000px)').matches);},[]);
  const button=(action: FarmCameraAction3D,label: string,text: string)=><button type="button" onClick={()=>onAction(action)} aria-label={label} title={label} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 hover:bg-teal-50">{text}</button>;
  const key=(text: string)=><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{text}</kbd>;
  return <details open={open} onToggle={e=>setOpen(e.currentTarget.open)} aria-label="Farm edit controls" className="game-editor-controls game-surface">
    <summary>Edit controls</summary>
    <dl className="space-y-2 text-[11px]">
      <div><dt className="mb-1 flex gap-1">{['W','A','S','D'].map(letter=><span key={letter}>{key(letter)}</span>)}</dt><dd>Move camera · arrows also work</dd></div>
      <div className="flex items-center justify-between gap-2"><dt>{key('Q')} {key('E')}</dt><dd>Rotate camera</dd></div>
      <div className="flex items-center justify-between gap-2"><dt>{key('R')}</dt><dd>Rotate object</dd></div>
      <div className="flex items-center justify-between gap-2"><dt className="font-semibold">Scroll wheel</dt><dd>Zoom</dd></div>
      <div className="flex items-center justify-between gap-2"><dt className="font-semibold">Right drag</dt><dd>Rotate view</dd></div>
      <div className="flex items-center justify-between gap-2"><dt className="font-semibold">Left click</dt><dd>Select / place</dd></div>
      {!indoor&&<div className="flex items-center justify-between gap-2"><dt className="font-semibold">Hold + drag</dt><dd>Terrain / fence</dd></div>}
      {!indoor&&<div className="flex items-center justify-between gap-2"><dt className="font-semibold">Drag back</dt><dd>Undo this stroke</dd></div>}
      <div className="flex items-center justify-between gap-2"><dt>{key('Esc')}</dt><dd>Cancel edits</dd></div>
    </dl>
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Camera</p>
      <div className="grid grid-cols-4 gap-1">{button('left','Rotate camera left','↶')}{button('zoomOut','Zoom out','−')}{button('zoomIn','Zoom in','+')}{button('right','Rotate camera right','↷')}</div>
      <div className="mt-1 flex gap-1">{button('up','Pan view up','↑')}{button('down','Pan view down','↓')}{button('reset','Reset camera view','Reset')}</div>
    </div>
    <p className="mt-3 text-[10px] leading-relaxed text-teal-700">Time stays frozen while editing.</p>
  </details>;
}
