import { useEffect,useRef } from 'react';
import type { Game3DSave } from './game3d';
import { coopChickens3D,eggReady3D,POULTRY_RULES_3D } from './poultry3D';
export default function CoopDialog3D({coopId,save,now,message,onAction,onClose}:{coopId:string|null;save:Game3DSave;now:number;message:string;onAction:(action:'place'|'feed'|'collect'|'return')=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(coopId&&!dialog.current?.open)dialog.current?.showModal();if(!coopId&&dialog.current?.open)dialog.current.close();},[coopId]);
  const chickens=coopId?coopChickens3D(save,coopId):[],hungry=chickens.filter(c=>c.fedAt===null).length,ready=chickens.filter(c=>eggReady3D(save,c,now)).length;
  const button='rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40';
  return <dialog ref={dialog} aria-label="Chicken coop" onClose={onClose} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="fixed inset-0 z-[110] m-auto max-h-[85dvh] w-[min(94vw,540px)] overflow-y-auto rounded-2xl border-4 border-amber-200 bg-[#faf5e6] p-5 text-slate-800 shadow-xl backdrop:bg-black/50">
    <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Chicken coop · {chickens.length}/{POULTRY_RULES_3D.capacity}</h2><button type="button" onClick={onClose} aria-label="Close chicken coop" className="px-3 py-2">×</button></div>
    <p className="my-3 text-sm">In bag: {save.inventory.chicken} chickens · {save.inventory.chickenFeed} feed · {save.inventory.egg} eggs</p>
    <p className="mb-4 text-xs">Each chicken needs one feed to lay one egg in {save.growth.eggSeconds} seconds. Buy chickens and feed, and sell eggs at Meadow Shop in town.</p>
    <div className="mb-4 space-y-2">{chickens.map((chicken,index)=>{const ready=eggReady3D(save,chicken,now),seconds=chicken.fedAt===null?0:Math.max(0,Math.ceil(save.growth.eggSeconds-((save.farmPausedAt??now)-chicken.fedAt)/1000));return <div key={chicken.id} className="flex items-center gap-3 rounded-lg bg-white p-2"><img src="/game3d/items/chicken.svg" alt="" className="h-10 w-10"/><span className="text-sm">Chicken {index+1}</span><span className="ml-auto text-xs font-semibold">{ready?'Egg ready':chicken.fedAt===null?'Needs feed':`Laying · ${seconds}s`}</span></div>;})}{!chickens.length&&<p className="rounded-lg bg-white p-4 text-sm">Your coop is empty. Place a chicken from your bag.</p>}</div>
    <div className="grid grid-cols-2 gap-2"><button className={button} disabled={save.inventory.chicken<1||chickens.length>=POULTRY_RULES_3D.capacity} onClick={()=>onAction('place')}>Place chicken</button><button className={button} disabled={!hungry||save.inventory.chickenFeed<hungry} onClick={()=>onAction('feed')}>Feed hungry ({hungry})</button><button className={button} disabled={!ready} onClick={()=>onAction('collect')}>Collect eggs ({ready})</button><button className={button} disabled={!hungry} onClick={()=>onAction('return')}>Return chicken to bag</button></div>
    {hungry>save.inventory.chickenFeed&&<p className="mt-2 text-xs">Need {hungry} feed to feed all hungry chickens.</p>}
    <p role="status" className="mt-4 text-sm text-teal-900">{message}</p>
  </dialog>;
}
