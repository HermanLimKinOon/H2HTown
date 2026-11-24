import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Game3DSave } from './game3d';
import { coopChickens3D, eggReady3D } from './poultry3D';
function Chicken({index,frozen}:{index:number;frozen:boolean}) {
  const root=useRef<Group>(null),time=useRef(index*2.1);
  useFrame((_,delta)=>{
    if(!root.current)return;
    if(!frozen)time.current+=Math.min(delta,.1)*.65;
    const t=time.current,dx=Math.cos(t)*1.65,dz=Math.cos(t*1.3)*.6;
    root.current.position.set(Math.sin(t)*1.65,.2+(!frozen?Math.abs(Math.sin(t*12))*.025:0),.8+Math.sin(t*1.3)*.6);
    root.current.rotation.y=Math.atan2(dx,dz);
  });
  return <group ref={root}>
    <mesh castShadow scale={[.8,1,1.3]}><sphereGeometry args={[.2,10,8]}/><meshStandardMaterial color="#fff2d7"/></mesh>
    <mesh position={[0,.19,.18]} castShadow><sphereGeometry args={[.13,10,8]}/><meshStandardMaterial color="#fff7e3"/></mesh>
    <mesh position={[0,.21,.32]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.06,.13,6]}/><meshStandardMaterial color="#eba83b"/></mesh>
    <mesh position={[0,.34,.18]}><sphereGeometry args={[.06,8,6]}/><meshStandardMaterial color="#d34437"/></mesh>
    {[-1,1].map(side=><group key={side}><mesh position={[side*.1,.23,.23]}><sphereGeometry args={[.023,6,6]}/><meshStandardMaterial color="#26211e"/></mesh><mesh position={[side*.085,-.16,.02]}><boxGeometry args={[.025,.14,.04]}/><meshStandardMaterial color="#e6a83a"/></mesh></group>)}
    <mesh position={[0,.07,-.21]} rotation={[.5,0,0]}><coneGeometry args={[.12,.22,5]}/><meshStandardMaterial color="#e6d7bc"/></mesh>
  </group>;
}
export default function CoopChickens3D({save,coopId,now,editing}:{save:Game3DSave;coopId:string;now:number;editing:boolean}) {
  return <>{coopChickens3D(save,coopId).map((chicken,index)=><group key={chicken.id}>
    <Chicken index={index} frozen={editing}/>
    {eggReady3D(save,chicken,now)&&<mesh position={[-1.1+index*.4,.13,-.05]} scale={[.75,1,.75]} castShadow><sphereGeometry args={[.13,10,8]}/><meshStandardMaterial color="#ffefcc"/></mesh>}
  </group>)}</>;
}
