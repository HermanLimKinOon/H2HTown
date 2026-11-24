import { useEffect,useRef,useState } from 'react';
import type { Game3DSave } from './game3d';
import { POULTRY_RULES_3D } from './poultry3D';
import { toolDetails3D } from './toolDetails3D';
import { assetUrl } from '../game/assets';
export default function Shop3D({open,save,message,onClose,onBuy,onSell}:{open:boolean;save:Game3DSave;message:string;onClose:()=>void;onBuy:(item:'petFood'|'chicken'|'chickenFeed')=>void;onSell:(item:'carrot'|'wood'|'egg',quantity:number)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),[tab,setTab]=useState<'buy'|'sell'>('sell');
  useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open&&dialog.current?.open)dialog.current.close();},[open]);
  const buys=[{item:'petFood' as const,price:10},{item:'chicken' as const,price:POULTRY_RULES_3D.chickenBuy},{item:'chickenFeed' as const,price:POULTRY_RULES_3D.feedBuy}];
  const sells=[{item:'carrot' as const,price:5},{item:'wood' as const,price:1},{item:'egg' as const,price:POULTRY_RULES_3D.eggSell}];
  const button='rounded-lg border border-amber-200/50 bg-[#45633c] px-3 py-2 text-sm font-bold disabled:opacity-40';
  return <dialog ref={dialog} aria-label="Meadow Shop" onClose={onClose} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="fixed inset-0 z-[110] m-auto max-h-[85dvh] w-[min(92vw,560px)] overflow-y-auto rounded-xl border-4 border-[#c99b4c] bg-[#554332] p-5 text-[#fff0c8] shadow-xl backdrop:bg-black/55">
    <div className="flex justify-between"><div><h2 className="text-2xl font-bold">Meadow Shop</h2><p className="mt-1">🪙 {save.coins} coins</p></div><button aria-label="Close shop" onClick={onClose} className="px-3">×</button></div>
    <div role="tablist" aria-label="Shop sections" className="my-4 grid grid-cols-2 gap-2">{(['buy','sell'] as const).map(value=><button key={value} role="tab" aria-selected={tab===value} onClick={()=>setTab(value)} className={`rounded-lg border-2 border-[#b49a6a] py-2 font-bold capitalize ${tab===value?'bg-[#ae8e5c]':'bg-[#3d3026]'}`}>{value}</button>)}</div>
    <section role="tabpanel" aria-label={tab==='buy'?'Buy items':'Sell items'} className="space-y-3">{(tab==='buy'?buys:sells).map(({item,price})=><div key={item} className="flex flex-wrap items-center gap-3 rounded-lg bg-[#49392d] p-3"><img src={assetUrl(toolDetails3D[item].image)} alt="" className="h-14 w-14 object-contain"/><div className="flex-1"><h3 className="font-bold">{toolDetails3D[item].name}</h3><p className="text-xs">In bag: {save.inventory[item]} · {price} coins {tab==='sell'?'each':''}</p></div>{tab==='buy'?<button className={button} disabled={save.coins<price} onClick={()=>onBuy(item as 'petFood'|'chicken'|'chickenFeed')}>Buy {toolDetails3D[item].name}</button>:<div className="flex gap-2"><button className={button} disabled={save.inventory[item]<1} onClick={()=>onSell(item as 'carrot'|'wood'|'egg',1)}>Sell 1 {toolDetails3D[item].name}</button><button className={button} disabled={save.inventory[item]<1} onClick={()=>onSell(item as 'carrot'|'wood'|'egg',save.inventory[item])}>Sell all {toolDetails3D[item].name}</button></div>}</div>)}</section>
    <p className="mt-3 text-xs">Place chickens from your bag using your coop’s controls on the farm.</p><p role="status" className="mt-4 text-sm text-[#ffd77e]">{message}</p>
  </dialog>;
}
