import { useLayoutEffect,useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import HouseFurnitureVisual3D from './HouseFurnitureVisual3D';
import type { HouseEditorState3D } from './useHouseEditor3D';
import { furnitureSize3D } from './houseCustomization3D';
export default function HouseEditScene3D({editor}:{editor:HouseEditorState3D}) {
  const ghost=useRef<THREE.Group>(null);
  useLayoutEffect(()=>{ghost.current?.traverse(object=>{if(object instanceof THREE.Mesh){object.raycast=()=>{};for(const material of Array.isArray(object.material)?object.material:[object.material]){material.transparent=true;material.opacity=.4;material.depthWrite=false;}}});},[editor.tile,editor.tool,editor.moving,editor.rotation]);
  if(!editor.active)return null;
  const id=editor.selected,object=id?(editor.layout.furniture[id]??editor.layout.catPositions[id]):null;
  const previewKind=editor.moving?editor.furniture?.kind:editor.tool!=='select'&&editor.tool!=='cats'?editor.tool:null;
  const hovered=editor.hover??(!editor.moving?id:null),item=hovered?editor.layout.furniture[hovered]??editor.layout.catPositions[hovered]:null;
  const dimensions=item&&hovered&&editor.layout.furniture[hovered]?furnitureSize3D(editor.layout.furniture[hovered]):{width:.8,depth:.8,height:.8};
  const [x,z]=(editor.tile??'0,0').split(',').map(Number),valid=editor.preview?.changed;
  return <>
    {item&&<group position={[item.x,.03,item.z]}><mesh raycast={()=>null}><boxGeometry args={[dimensions.width+.08,.03,dimensions.depth+.08]}/><meshBasicMaterial color="#88ddf3" wireframe toneMapped={false}/></mesh></group>}
    {editor.tile&&!item&&!editor.moving&&!previewKind&&<mesh position={[x,.04,z]} raycast={()=>null}><boxGeometry args={[1,.025,1]}/><meshBasicMaterial color="#88ddf3" wireframe toneMapped={false}/></mesh>}
    {editor.tile&&(editor.moving||previewKind)&&<group position={[x,.04,z]} rotation={[0,editor.rotation*Math.PI/2,0]}>
      {previewKind&&<group ref={ghost}><HouseFurnitureVisual3D kind={previewKind}/></group>}
      {!previewKind&&<group><mesh raycast={()=>null} position={[0,.3,0]} scale={[.7,.7,1.2]}><sphereGeometry args={[.34,12,8]}/><meshBasicMaterial color="#eacda2" transparent opacity={.4}/></mesh><mesh raycast={()=>null} position={[0,.48,.4]}><sphereGeometry args={[.23,12,8]}/><meshBasicMaterial color="#eacda2" transparent opacity={.4}/></mesh>{[-.13,.13].map(px=><mesh key={px} raycast={()=>null} position={[px,.7,.4]}><coneGeometry args={[.1,.25,3]}/><meshBasicMaterial color="#eacda2" transparent opacity={.4}/></mesh>)}</group>}
      <mesh raycast={()=>null}><boxGeometry args={[previewKind?furnitureSize3D({kind:previewKind,x,z,rotation:0}).width:1,.025,previewKind?furnitureSize3D({kind:previewKind,x,z,rotation:0}).depth:1]}/><meshBasicMaterial color={valid?'#5ce7b1':'#f87878'} wireframe toneMapped={false}/></mesh>
    </group>}
    {object&&!editor.moving&&<Html position={[object.x,2.2,object.z]} center zIndexRange={[35,20]}><div role="dialog" aria-label="House edit controls" className="w-48 rounded-xl bg-white p-3 text-center text-slate-800 shadow-xl" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}><p className="mb-2 text-xs font-bold">{editor.cat?'Cat':'Furniture'}</p><div className="flex justify-center gap-2"><button className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white" onClick={editor.move}>Move</button>{editor.furniture&&<button className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700" onClick={editor.remove}>Delete</button>}</div></div></Html>}


  </>;
}
