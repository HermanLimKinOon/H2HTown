import {useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {nearestHudTarget3D} from './hudActions3D';
type Target={id:string;x:number;z:number};
/** Contextual HTML labels: scene objects remain clickable even when their label is hidden. */
export default function WorldInteractionLabel3D({target,targets,player,height,label,onClick}:{target:Target;targets:Target[];player?:MutableRefObject<{x:number;z:number}>;height:number;label:string;onClick:()=>void}){
 const button=useRef<HTMLButtonElement>(null),projected=useRef(new THREE.Vector3());
 useFrame(({camera})=>{
  const nearest=player?nearestHudTarget3D(player.current,targets,8):target;
  const point=projected.current.set(target.x,height,target.z).project(camera);
  const visible=nearest?.id===target.id&&point.z>=-1&&point.z<=1&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1;
  if(button.current)button.current.style.display=visible?'flex':'none';
 });
 return <Html zIndexRange={[12,1]} position={[0,height,0]} center calculatePosition={(object,camera,size)=>{
  const point=new THREE.Vector3().setFromMatrixPosition(object.matrixWorld).project(camera);
  const half=Math.min(96,size.width*.24),bottom=size.width<=1000?220:170;
  return [Math.max(half+12,Math.min(size.width-half-12,(point.x*.5+.5)*size.width)),Math.max(104,Math.min(size.height-bottom,(-point.y*.5+.5)*size.height))];
 }}><button ref={button} type="button" className="game-world-label" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onClick();}}>{label}</button></Html>;
}
