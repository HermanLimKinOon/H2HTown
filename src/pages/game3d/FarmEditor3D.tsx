import { FARM_EDIT_CATEGORIES_3D, FARM_HOUSE_CATALOG_3D, FARM_DECORATION_CATALOG_3D, type FarmEditTool3D, type FarmHouseStyle3D } from './farmCustomization3D';

export default function FarmEditor3D({ tool, houseStyle, dirty, canUndo, message, onTool, onHouseStyle, onUndo, onSave, onCancel }: {
  tool: FarmEditTool3D; houseStyle: FarmHouseStyle3D; dirty: boolean; canUndo: boolean; message: string;
  onTool: (tool: FarmEditTool3D) => void; onHouseStyle: (style: FarmHouseStyle3D) => void; onUndo: () => void; onSave: () => void; onCancel: () => void;
}) {
  const category=tool==='path'||tool==='grass'?'terrace':tool;
  const decoration=FARM_DECORATION_CATALOG_3D.find(item=>item.id===tool);
  return <aside aria-label="Customize private farm" className="game-editor-panel absolute bottom-4 left-1/2 z-40 w-[min(96vw,760px)] -translate-x-1/2 rounded-2xl border border-white/80 bg-[#fafbf6]/95 p-4 text-slate-800 shadow-xl backdrop-blur-md">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-bold">Make yourself at home</h2><p className="mt-1 text-xs text-slate-600">Select an object to edit, or choose a category to build.</p></div>
      <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-800">{dirty?'Unsaved changes · Time frozen':'Time frozen'}</span>
    </div>
    <div role="group" aria-label="Farm editing categories" className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
      {FARM_EDIT_CATEGORIES_3D.map(item=><button key={item.id} type="button" aria-label={item.label} aria-pressed={category===item.id} onClick={()=>onTool(item.id==='terrace'?(category==='terrace'?tool:'path'):item.tools[0])} className={`rounded-xl border px-1 py-2 text-xs font-semibold ${category===item.id?'border-teal-700 bg-teal-700 text-white':'border-slate-200 bg-white hover:border-teal-400'}`}>
        <span aria-hidden="true" className="mb-1 block text-lg">{item.icon}</span>{item.label}
      </button>)}
    </div>
    {category==='house'&&<div role="group" aria-label="House styles" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-teal-50/70 p-2">
      <span className="mr-1 text-xs font-semibold text-teal-900">House styles</span>
      {FARM_HOUSE_CATALOG_3D.map(house=><button key={house.id} type="button" aria-label={house.name} aria-pressed={houseStyle===house.id} onClick={()=>onHouseStyle(house.id)} className={`flex items-center gap-3 rounded-xl border p-1.5 pr-3 text-left text-xs font-semibold ${houseStyle===house.id?'border-teal-700 bg-white text-teal-900':'border-slate-200 bg-white'}`}><img src={house.preview} alt={`${house.name} preview`} width={80} height={65} className="h-16 w-20 rounded-lg object-contain"/><span>{house.name}<span className="mt-1 block text-[10px] font-normal text-slate-500">5 × 4 tiles</span></span></button>)}
      <span className="text-[10px] text-slate-500">Click a clear tile to build · R to rotate</span>
    </div>}
    {decoration&&<div aria-label={`${decoration.name} selection preview`} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-teal-50/70 p-2">
      <div className="flex items-center gap-3 rounded-xl border border-teal-700 bg-white p-1.5 pr-3">
        <img src={decoration.preview} alt={`${decoration.name} preview`} width={80} height={65} className="h-16 w-20 rounded-lg object-contain"/>
        <div className="text-xs font-semibold">{decoration.name}<span className="mt-1 block text-[10px] font-normal text-slate-500">1 × 1 tile</span></div>
      </div>
      <span className="text-[10px] text-slate-500">{decoration.id==='fence'?'Place on neighbouring tiles to connect rows and corners':'Click a clear tile to place · R to rotate'}</span>
    </div>}
    {category==='terrace'&&<div role="group" aria-label="Terrace materials" className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2">
      <span className="mr-1 text-xs font-semibold text-amber-900">Terrace</span>
      {(['path','grass'] as const).map(material=><button key={material} type="button" aria-pressed={tool===material} onClick={()=>onTool(material)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${tool===material?'border-teal-700 bg-white text-teal-900':'border-slate-200 bg-white'}`}><span aria-hidden="true" className={`h-4 w-4 rounded ${material==='path'?'bg-[#d8bb80]':'bg-[#80bd54]'}`}/>{material==='path'?'Path':'Grass'}</button>)}
    </div>}
    <p role="status" className="mt-3 min-h-8 text-xs leading-relaxed text-slate-600">{message}</p>
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <button type="button" onClick={onUndo} disabled={!canUndo} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Undo</button>
      <div className="ml-auto flex gap-2"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={onSave} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">Save farm</button></div>
    </div>
  </aside>;
}
