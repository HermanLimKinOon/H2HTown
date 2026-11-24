import { useState } from 'react';
import { HOUSE_FURNITURE_3D,HOUSE_FURNITURE_CATEGORIES_3D,type HouseFurnitureCategory3D } from './houseCustomization3D';
import { CAT_CATALOG_3D } from './cats3D';
import type { HouseEditorState3D } from './useHouseEditor3D';
export default function HouseEditorPanel3D({editor,houseId}:{editor:HouseEditorState3D;houseId:string}) {
  const [category,setCategory]=useState<HouseFurnitureCategory3D|'select'|'cats'>('select');
  const group=HOUSE_FURNITURE_CATEGORIES_3D.find(item=>item.id===category);
  const items=HOUSE_FURNITURE_3D.filter(item=>item.category===category);
  const chooseCategory=(value:typeof category)=>{setCategory(value);editor.choose(value==='cats'?'cats':'select');};
  return <aside aria-label="Customize house" className="game-editor-panel absolute bottom-4 left-1/2 z-40 w-[min(96vw,760px)] -translate-x-1/2 rounded-2xl border bg-white/95 p-4 text-slate-800 shadow-xl">
    <h2 className="font-bold">Arrange your house</h2><p className="mt-1 text-xs text-slate-500">Furniture and cats only · Player hidden · Cats paused · R rotates 90°</p>
    <div role="group" aria-label="House furnishing categories" className="mt-3 flex gap-2 overflow-x-auto pb-2">
      <button aria-label="Select" aria-pressed={category==='select'} className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold ${category==='select'?'border-teal-700 bg-teal-50':''}`} onClick={()=>chooseCategory('select')}>↖ Select</button>
      {HOUSE_FURNITURE_CATEGORIES_3D.map(item=><button key={item.id} aria-label={`${item.name} category`} aria-pressed={category===item.id} onClick={()=>chooseCategory(item.id)} className={`shrink-0 rounded-xl border p-2 text-xs font-semibold ${category===item.id?'border-teal-700 bg-teal-50':''}`}><img src={item.image} alt="" className="mx-auto mb-1 h-9 w-11 object-contain"/>{item.name}</button>)}
      <button aria-label="Cats category" aria-pressed={category==='cats'} className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold ${category==='cats'?'border-teal-700 bg-teal-50':''}`} onClick={()=>chooseCategory('cats')}>Cats</button>
    </div>
    {group&&<div role="group" aria-label={`${group.name} furniture choices`} className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-teal-50/60 p-2">
      <h3 className="mb-2 text-xs font-bold text-teal-900">{group.name}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map(item=><button key={item.id} aria-label={`Place ${item.name}`} aria-pressed={editor.tool===item.id} onClick={()=>editor.choose(item.id)} className={`flex items-center gap-2 rounded-lg border bg-white p-2 text-left ${editor.tool===item.id?'border-teal-700 ring-1 ring-teal-700':'border-slate-200'}`}><img src={item.image} alt={`${item.name} preview`} className="h-12 w-14 object-contain"/><span className="text-xs font-semibold">{item.name}<span className="mt-1 block text-[10px] font-normal text-slate-500">{item.width} × {item.depth}</span></span></button>)}</div>
    </div>}
    {category==='cats'&&<div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">{editor.cats.filter(cat=>cat.houseId===null||cat.houseId===houseId).map(cat=>{const style=CAT_CATALOG_3D.find(item=>item.id===cat.coat)!;return <button key={cat.id} onClick={()=>editor.selectCat(cat.id)} className="flex items-center gap-2 rounded-lg border p-2 text-xs"><img src={style.image} alt="" className="h-8 w-8"/>{style.name} · {cat.houseId===null?'In bag':'Here'}</button>;})}{!editor.cats.some(cat=>cat.houseId===null||cat.houseId===houseId)&&<p className="text-xs">Buy a cat at the Cat Shop in H2H Town first.</p>}</div>}
    <p role="status" className="my-3 min-h-5 text-xs text-slate-600">{editor.message}</p><div className="flex gap-2 border-t pt-3"><button disabled={!editor.history.length} onClick={editor.undo} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Undo</button><button onClick={editor.cancel} className="ml-auto rounded-lg px-3 py-2 text-xs">Cancel</button><button onClick={editor.save} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">Save house</button></div>
  </aside>;
}
