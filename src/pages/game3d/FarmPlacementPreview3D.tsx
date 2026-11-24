import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { previewFenceConnections3D, type FarmLayout3D, type FarmEditTool3D, type FarmObjectKind3D, type FarmHouseStyle3D } from './farmCustomization3D';
import FarmObjectVisual3D from './FarmObjectVisual3D';

export default function FarmPlacementPreview3D({ tile, tool, valid, rotation = 0, stage = 3, style, layout, sourceKey }: {
  layout: FarmLayout3D; sourceKey?: string | null;
  tile: string | null; tool: FarmEditTool3D | FarmObjectKind3D; valid: boolean; rotation?: number; stage?: 1|2|3; style?: FarmHouseStyle3D;
}) {
  const ghost=useRef<THREE.Group>(null);
  const objectKind=['pond','house','building','portal','tree','fence','flowers','bench'].includes(tool)?tool as FarmObjectKind3D:null;
  const fenceConnections=tool==='fence'&&tile?previewFenceConnections3D(layout,tile,rotation,sourceKey):undefined;
  useLayoutEffect(()=>{
    ghost.current?.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      object.raycast=()=>{};object.castShadow=false;object.receiveShadow=false;
      for(const material of Array.isArray(object.material)?object.material:[object.material]) {
        material.transparent=true;material.opacity=.42;material.depthWrite=false;
      }
    });
  },[tool,stage,tile,style,fenceConnections]);
  if(!tile)return null;
  const [x,z]=tile.split(',').map(Number);
  const width=tool==='pond'?9.1:(tool==='house'||tool==='building')?5:tool==='portal'?3:1;
  const depth=tool==='pond'?9.1:(tool==='house'||tool==='building')?4:tool==='portal'?3:1;
  const color=tool==='select'?'#a7eaff':valid?'#5ce7b1':'#f87878';
  return <group position={[x,.06,z]} rotation={[0,rotation*Math.PI/2,0]}>
    {objectKind&&<group ref={ghost}><FarmObjectVisual3D kind={objectKind} stage={stage} style={style} fenceConnections={fenceConnections}/></group>}
    {tool!=='select'&&<mesh raycast={()=>null}><boxGeometry args={[width,.02,depth]}/><meshBasicMaterial color={color} transparent opacity={.2} depthWrite={false}/></mesh>}
    {[-1,1].flatMap(side=>[
      <mesh key={`x${side}`} position={[side*width/2,.015,0]} raycast={()=>null}><boxGeometry args={[.05,.03,depth]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>,
      <mesh key={`z${side}`} position={[0,.015,side*depth/2]} raycast={()=>null}><boxGeometry args={[width,.03,.05]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>,
    ])}
    {(tool==='house'||tool==='building')&&<mesh position={[0,0,3.1]} raycast={()=>null}><boxGeometry args={[1.2,.02,2.2]}/><meshBasicMaterial color={color} transparent opacity={.2}/></mesh>}
  </group>;
}
