import HouseFurnitureVisual3D from './HouseFurnitureVisual3D';
import { DEFAULT_HOUSE_LAYOUT_3D,type HouseLayout3D } from './houseCustomization3D';
import type { HouseEditorState3D } from './useHouseEditor3D';
import { isCameraDrag3D } from './cameraControls3D';

export default function PlayerHouse3D({ onExit, onMirror, onGround, layout=DEFAULT_HOUSE_LAYOUT_3D, editor, onFurnitureSelect }: { onGround:(point:{x:number;z:number})=>void; onExit: () => void; onMirror: () => void;layout?:HouseLayout3D;editor?:HouseEditorState3D;onFurnitureSelect?:(id:string)=>void }) {
  return <>
    <color attach="background" args={['#d9cbb5']} />
    <hemisphereLight intensity={1.8} color="#fff1d3" groundColor="#a18b70" />
    <directionalLight position={[4, 12, 5]} intensity={1.7} castShadow />
    <mesh position={[0, -0.12, 0]} receiveShadow onPointerMove={event=>{if(editor?.active)editor.setTile(`${Math.round(event.point.x)},${Math.round(event.point.z)}`);}} onPointerOut={()=>editor?.setTile(null)} onClick={event=>{if(editor?.active&&event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();editor.ground(`${Math.round(event.point.x)},${Math.round(event.point.z)}`);}else if(!editor?.active&&event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();onGround({x:event.point.x,z:event.point.z});}}}><boxGeometry args={[12, 0.24, 12]} /><meshStandardMaterial color="#bd956c" /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[0, 0.004, i - 5.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 0.018]} /><meshStandardMaterial color="#a17b53" /></mesh>)}
    <mesh position={[0, 1.6, -6]} receiveShadow><boxGeometry args={[12, 3.2, 0.25]} /><meshStandardMaterial color="#f1e5cc" /></mesh>
    <mesh position={[-6, 1.6, 0]} receiveShadow><boxGeometry args={[0.25, 3.2, 12]} /><meshStandardMaterial color="#dfd0b6" /></mesh>
    <group position={[-5.8, 0, 1.5]} onClick={event => { event.stopPropagation(); if (!editor?.active && event.nativeEvent.button === 0) onMirror(); }}>
      <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[0.16, 2.2, 1.35]} /><meshStandardMaterial color="#b38c54" metalness={0.35} roughness={0.5} /></mesh>
      <mesh position={[0.095, 1.6, 0]}><boxGeometry args={[0.04, 1.96, 1.1]} /><meshStandardMaterial color="#b8dce1" metalness={0.85} roughness={0.12} /></mesh>
      <mesh position={[0.12, 2.15, -0.25]} rotation={[0.18, 0, 0]}><boxGeometry args={[0.045, 0.65, 0.07]} /><meshBasicMaterial color="#ecffff" transparent opacity={0.65} /></mesh>
    </group>
    <mesh position={[0, 1.9, -5.85]}><boxGeometry args={[2.4, 1.3, 0.08]} /><meshStandardMaterial color="#9ed6de" emissive="#7ab5c4" emissiveIntensity={0.3} /></mesh>
    {Object.entries(layout.furniture).filter(([id])=>!(editor?.moving&&editor.selected===id)).map(([id,item])=><group key={id} position={[item.x,0,item.z]} rotation={[0,item.rotation*Math.PI/2,0]}
      onPointerOver={event=>{if(editor?.active&&editor.tool==='select'&&!editor.moving){event.stopPropagation();editor.setHover(id);}}} onPointerOut={()=>editor?.setHover(null)}
      onClick={event=>{if(!editor?.active&&event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();onFurnitureSelect?.(id);return;}if(editor?.active&&event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();if(editor.tool==='select'&&!editor.moving)editor.select(id);else editor.ground(`${Math.round(event.point.x)},${Math.round(event.point.z)}`);}}}>
      <HouseFurnitureVisual3D kind={item.kind}/>
    </group>)}
    <mesh position={[0, 0.02, 5.6]} rotation={[-Math.PI / 2, 0, 0]} onClick={event=>{if(!editor?.active&&event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();onExit();}}}><planeGeometry args={[2, 0.7]} /><meshStandardMaterial color="#538b7e" /></mesh>
  </>;
}
