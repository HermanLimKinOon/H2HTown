import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ToolId3D } from './game3d';

function Carrot() {
  return <group rotation={[.2,0,-.3]}><mesh><coneGeometry args={[.055,.26,8]} /><meshStandardMaterial color="#ed8734" /></mesh><mesh position={[0,.16,0]}><sphereGeometry args={[.06,6,4]} /><meshStandardMaterial color="#509a36" /></mesh></group>;
}

// Separate component so the held item meshes can be replaced independently.
export default function CustomCharacterItem3D({tool,harvestUntil=0}:{tool:ToolId3D|null;harvestUntil?:number}) {
  const held=useRef<Group>(null),carrot=useRef<Group>(null);
  useFrame(()=>{const harvesting=Date.now()<harvestUntil;if(held.current)held.current.visible=!harvesting;if(carrot.current)carrot.current.visible=harvesting;});
  return <group rotation={[.1,0,-.15]}>
    <group ref={held}>
      {(tool==='hoe'||tool==='axe')&&<group><mesh position={[0,-.22,0]}><cylinderGeometry args={[.018,.02,.85,8]} /><meshStandardMaterial color="#81532e" /></mesh><mesh position={[0,-.62,.06]}><boxGeometry args={tool==='axe'?[.28,.18,.045]:[.07,.11,.24]} /><meshStandardMaterial color="#a9b3b8" metalness={.3} roughness={.5} /></mesh></group>}
      {tool==='wateringCan'&&<group position={[0,-.12,.08]}><mesh><boxGeometry args={[.22,.2,.18]} /><meshStandardMaterial color="#62c8cf" /></mesh><mesh position={[0,0,.2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.04,.25,8]} /><meshStandardMaterial color="#62c8cf" /></mesh><mesh position={[0,.15,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.09,.015,6,12,Math.PI]} /><meshStandardMaterial color="#46939a" /></mesh></group>}
      {tool==='carrot'&&<Carrot />}
      {(tool==='seeds'||tool==='petFood')&&<mesh position={[0,-.08,.03]}><boxGeometry args={[.13,.18,.08]} /><meshStandardMaterial color={tool==='seeds'?'#c9a46c':'#7b9a6a'} /></mesh>}
      {tool==='wood'&&<mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.065,.065,.3,8]} /><meshStandardMaterial color="#8f633f" /></mesh>}
    </group>
    <group ref={carrot}><Carrot /></group>
  </group>;
}
