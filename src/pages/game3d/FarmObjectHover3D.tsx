import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FarmObject3D } from './farmCustomization3D';

export default function FarmObjectHover3D({ object, stage = 3 }: { object: FarmObject3D; stage?: 1|2|3 }) {
  const size=object.kind==='pond'?[9.1,.15,9.1]:object.kind==='house'||object.kind==='building'?[5.8,4.55,5.8]:object.kind==='tree'?(stage===1?[1.1,.45,1.1]:stage===2?[1.4,2,1.4]:[2.8,4.1,2.8]):object.kind==='portal'?[2.6,2.9,.5]:object.kind==='bench'?[1,1.1,.65]:object.kind==='flowers'?[1,.55,1]:[1.05,1.02,1.05];
  const [width,height,depth]=size;
  const geometry=useMemo(()=>{const box=new THREE.BoxGeometry(width,height,depth);const edges=new THREE.EdgesGeometry(box);box.dispose();return edges;},[width,height,depth]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group position={[object.x,height/2+.025,object.z]} rotation={[0,object.rotation*Math.PI/2,0]}>
    <lineSegments geometry={geometry} raycast={()=>{}} renderOrder={10}><lineBasicMaterial color="#a7eaff" toneMapped={false} depthTest={false} transparent opacity={.9}/></lineSegments>
  </group>;
}
