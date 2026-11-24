import { getFenceConnections3D, type FarmLayout3D } from './farmCustomization3D';
import { FarmDecorationVisual3D } from './FarmObjectVisual3D';
export default function FarmDecorations3D({ layout, onSelect, hiddenObject, onHover }: { layout: FarmLayout3D; onSelect: (key: string) => void; hiddenObject?: string | null; onHover?: (id: string | null) => void }) {
  return <>{Object.entries(layout.decorations).filter(([key])=>key!==hiddenObject).map(([key,item]) => {
    const [x,z]=key.split(',').map(Number);
    return <group key={key} position={[x,0,z]} rotation={[0,item.rotation*Math.PI/2,0]} onPointerOver={event=>{if(onHover){event.stopPropagation();onHover(key);}}} onPointerOut={()=>onHover?.(null)} onClick={event=>{event.stopPropagation();if(event.nativeEvent.button===0&&event.delta<=6)onSelect(key);}}>
      <FarmDecorationVisual3D kind={item.kind} fenceConnections={item.kind==='fence'?getFenceConnections3D(layout,key):undefined}/>
    </group>;
  })}</>;
}
