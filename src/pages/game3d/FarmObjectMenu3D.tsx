import { Html } from '@react-three/drei';
import { getFarmObject3D, type FarmLayout3D } from './farmCustomization3D';
export default function FarmObjectMenu3D({ selection, layout, onMove, onDelete, onClose }: {
  selection: string; layout: FarmLayout3D; onMove: () => void; onDelete: () => void; onClose: () => void;
}) {
  const object=getFarmObject3D(layout,selection);if(!object)return null;
  return <Html position={[object.x,(object.kind==='house'||object.kind==='building')?5.1:object.kind==='tree'?4:object.kind==='portal'?3.5:1.5,object.z]} center zIndexRange={[35,20]}>
    <div role="dialog" aria-label="Farm object actions" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} className="w-52 rounded-xl border border-teal-200 bg-white p-3 text-slate-800 shadow-xl">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">{object.label}</h3><button type="button" onClick={onClose} aria-label="Deselect farm object" className="px-1 text-slate-500">×</button></div>
      <div className="flex gap-2"><button type="button" onClick={onMove} className="flex-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Move</button>{object.canDelete&&<button type="button" onClick={onDelete} className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Delete</button>}</div>
    </div>
  </Html>;
}
