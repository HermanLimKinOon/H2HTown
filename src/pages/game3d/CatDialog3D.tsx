import { useEffect,useRef } from 'react';
import type { Game3DSave } from './game3d';
import { CAT_CATALOG_3D,CAT_RULES_3D,type CatCoat3D } from './cats3D';
export default function CatDialog3D({mode,save,message,onClose,onBuy,onBuyFood}:{mode:'shop'|null;save:Game3DSave;message:string;onClose:()=>void;onBuy:(coat:CatCoat3D)=>void;onBuyFood:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(mode&&!dialog.current?.open)dialog.current?.showModal();if(!mode&&dialog.current?.open)dialog.current.close();},[mode]);
  const button='rounded-lg bg-[#88628c] px-3 py-2 text-xs font-bold text-white disabled:opacity-40';
  return <dialog ref={dialog} aria-label="Cat Shop" onClose={onClose} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="fixed inset-0 z-[110] m-auto max-h-[85dvh] w-[min(94vw,600px)] overflow-y-auto rounded-2xl border-4 border-[#d4b6d6] bg-[#faf5f2] p-5 text-slate-800 shadow-xl backdrop:bg-black/50">
    <div className="flex justify-between"><div><h2 className="text-2xl font-bold">Cat Shop</h2><p className="mt-1 text-sm">🪙 {save.coins} coins · {save.inventory.petFood} pet food</p></div><button onClick={onClose} aria-label="Close cats" className="px-3 py-2 text-xl">×</button></div>
    <p className="my-4 text-sm">Place companions using Edit house → Cats. Click the pet bowl to feed them and click a cat to pet it. Owned: {save.cats.length}/{CAT_RULES_3D.total}.</p>
    <div className="space-y-3">{CAT_CATALOG_3D.map(coat=><div key={coat.id} className="flex items-center gap-4 rounded-xl bg-white p-3"><img src={coat.image} alt={coat.name} className="h-16 w-16"/><div className="flex-1"><h3 className="font-bold">{coat.name}</h3><p className="text-xs text-slate-500">{coat.description}</p><p className="mt-1 text-xs">{CAT_RULES_3D.price} coins</p></div><button className={button} disabled={save.coins<CAT_RULES_3D.price||save.cats.length>=CAT_RULES_3D.total} onClick={()=>onBuy(coat.id)}>Buy {coat.name}</button></div>)}</div>
    <button className={`${button} mt-3`} disabled={save.coins<10} onClick={onBuyFood}>Buy pet food · 10 coins</button>
    <p role="status" className="mt-4 text-sm font-semibold text-[#715175]">{message}</p>
  </dialog>;
}
