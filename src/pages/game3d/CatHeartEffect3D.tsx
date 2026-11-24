import { useEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

export default function CatHeartEffect3D({pettedAt,hidden=false}:{pettedAt:number|null;hidden?:boolean}) {
  const root=useRef<THREE.Group>(null),material=useRef<THREE.MeshBasicMaterial>(null);
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape();
    shape.moveTo(0,-.45);
    shape.bezierCurveTo(-.15,-.25,-.5,-.05,-.5,.2);
    shape.bezierCurveTo(-.5,.5,-.15,.55,0,.28);
    shape.bezierCurveTo(.15,.55,.5,.5,.5,.2);
    shape.bezierCurveTo(.5,-.05,.15,-.25,0,-.45);
    return new THREE.ShapeGeometry(shape,16);
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    if(!root.current||!material.current)return;
    const phase=pettedAt===null?2:(Date.now()-pettedAt)/2400;
    root.current.visible=!hidden&&phase>=0&&phase<1;
    if(!root.current.visible)return;
    // Start above the name label and face the camera so the small heart stays readable.
    root.current.position.y=1.7+phase*.55;
    root.current.scale.setScalar(.38+Math.sin(Math.min(1,phase*5)*Math.PI/2)*.07);
    material.current.opacity=Math.max(0,Math.min(1,phase*12,(1-phase)*3));
  });
  return <group ref={root} position={[0,1.7,0]} visible={false}>
    <Billboard><mesh geometry={geometry} raycast={()=>null} renderOrder={1000}>
      <meshBasicMaterial ref={material} color="#f36b91" transparent depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/>
    </mesh></Billboard>
  </group>;
}
