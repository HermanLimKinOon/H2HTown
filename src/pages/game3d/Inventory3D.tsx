import { CAT_CATALOG_3D } from './cats3D';
import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../game/assets';
import { assignHotbar3D, type Game3DSave, type Hotbar3D, type ToolId3D } from './game3d';
import { toolDetails3D } from './toolDetails3D';

export default function Inventory3D({ open, save, onChange, onClose }: { open: boolean; save: Game3DSave; onChange: (save: Game3DSave) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState(0);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const quantity = (item: ToolId3D) => item === 'seeds' ? '∞' : item === 'carrot' ? save.inventory.carrot : item === 'wood' ? save.inventory.wood : item === 'petFood' ? save.inventory.petFood : item === 'chicken' || item === 'chickenFeed' || item === 'egg' ? save.inventory[item] : undefined;
  const assign = (item: ToolId3D) => onChange({ ...save, hotbar: assignHotbar3D(save.hotbar, target, item) });
  const clear = () => { const hotbar = [...save.hotbar] as Hotbar3D; hotbar[target] = null; onChange({ ...save, hotbar }); };
  return <dialog ref={dialog} aria-labelledby="inventory-3d-title" onClose={onClose} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 z-[100] m-auto max-h-[86dvh] w-[min(94vw,620px)] overflow-y-auto game-inventory border p-0 shadow-2xl backdrop:bg-black/60">
    <div className="p-4 sm:p-6">
      <div className="game-dialog-header mb-4 flex items-start justify-between"><div><h2 id="inventory-3d-title" className="font-heading text-2xl font-bold">3D Inventory</h2><p className="text-xs text-slate-500">Choose a hotbar slot, then choose an item from the 24-slot bag.</p></div><button type="button" autoFocus onClick={onClose} aria-label="Close 3D inventory" className="game-icon-button">×</button></div>
      <div className="mb-2 grid grid-cols-8 gap-1.5" role="group" aria-label="Choose 3D hotbar slot">
        {save.hotbar.map((item, index) => <button type="button" key={index} aria-pressed={target === index} aria-label={`Configure 3D slot ${index + 1}`} onClick={() => setTarget(index)} className="game-inventory-slot"><span className="absolute left-1 top-1 text-[9px]">{index + 1}</span>{item && <img src={assetUrl(toolDetails3D[item].image)} alt="" className="mx-auto h-2/3 w-2/3 object-contain" />}</button>)}
      </div>
      <div className="mb-3 flex items-center justify-between text-xs"><span>Assigning to slot <strong>{target + 1}</strong></span><button type="button" onClick={clear} className="rounded-lg border border-slate-200 bg-emerald-50 px-3 py-1.5">Clear slot</button></div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="3D bag inventory">
        {save.bag.map((item, index) => item ? <button type="button" key={index} onClick={() => assign(item)} aria-label={`${toolDetails3D[item].name}, assign to 3D hotbar slot ${target + 1}`} className="game-inventory-slot"><img src={assetUrl(toolDetails3D[item].image)} alt="" className="mx-auto h-3/4 w-3/4 object-contain" />{quantity(item) !== undefined && <span className="absolute bottom-1 right-1 text-xs font-black">{quantity(item)}</span>}</button> : <button type="button" key={index} disabled aria-label={`Empty 3D inventory slot ${index + 1}`} className="game-inventory-slot opacity-45" />)}
      </div>
      {save.cats.length>0&&<section className="mt-4 border-t border-slate-200 pt-3" aria-label="Owned cats"><h3 className="font-bold">Cats</h3><p className="my-2 text-xs">Use Edit house → Cats to place companions. Click the pet bowl to feed them.</p><div className="flex flex-wrap gap-2">{save.cats.map(cat=>{const coat=CAT_CATALOG_3D.find(item=>item.id===cat.coat)!;return <div key={cat.id} className="rounded-lg bg-emerald-50 p-2 text-center text-xs"><img src={coat.image} alt="" className="mx-auto h-12 w-12"/>{coat.name}<span className="block opacity-75">{cat.houseId===null?'In bag':cat.houseId==='house'?'Main house':'House'}</span></div>;})}</div></section>}
      <fieldset className="mt-4 border-t border-slate-200 pt-3"><legend className="text-sm font-bold">Growth timing</legend><div className="mt-2 grid grid-cols-2 gap-3">{(['carrotSeconds', 'treeSeconds', 'eggSeconds'] as const).map(key => <label key={key} className="text-xs">{key === 'carrotSeconds' ? 'Carrot' : key==='eggSeconds'?'Egg':'Tree'} · seconds {key==='eggSeconds'?'per egg':'per stage'}<input type="number" min="1" step="1" value={save.growth[key]} onChange={event => { const value = Number(event.target.value); if (value >= 1) onChange({ ...save, growth: { ...save.growth, [key]: value } }); }} className="mt-1 w-full border border-slate-200 bg-white p-2" /></label>)}</div></fieldset>
    </div>
  </dialog>;
}
