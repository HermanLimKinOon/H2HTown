import {Suspense,useEffect,useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {BufferGeometry,DoubleSide,ExtrudeGeometry,Float32BufferAttribute,Group,OrthographicCamera,Shape,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {OsmTownData3D,CityFeature3D,CityPoint3D} from './osmTown3D';
import {buildCityCollision3D} from './osmTown3D';
import {movementVector3D,stepJump3D,type JumpState3D} from './cameraControls3D';
import FarmerModel3D from './FarmerModel3D';
import MirrorHumanPreview3D from './MirrorHumanPreview3D';
import type {FarmerAppearance3D} from './game3d';
import type {CharacterChoice3D} from './characterChoice3D';
import type {MobileInput3D} from './touchInput3D';
export type CityView3D={mode:'overview'|'walk';yaw:number;pitch:number;zoom:number;focus:CityPoint3D;teleport:CityPoint3D|null};
function polygon(feature:CityFeature3D,y:number,extrude=false){
 const shape=new Shape();feature.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
 const geometry=new ExtrudeGeometry(shape,{depth:extrude?Math.max(2,feature.height-feature.base):.02,bevelEnabled:false,steps:1,curveSegments:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,extrude?feature.base:y,0);return geometry;
}
function ribbons(features:CityFeature3D[],y:number,widen=0){
 const vertices:number[]=[];
 for(const f of features)for(let i=1;i<f.points.length;i++){
  const a=f.points[i-1],b=f.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)continue;const nx=-dz/len*(f.width+widen)/2,nz=dx/len*(f.width+widen)/2;
  const l=[a.x+nx,y,a.z+nz],r=[a.x-nx,y,a.z-nz],bl=[b.x+nx,y,b.z+nz],br=[b.x-nx,y,b.z-nz];vertices.push(...l,...bl,...r,...r,...bl,...br);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
function joined(parts:BufferGeometry[]){if(!parts.length)return new BufferGeometry();const result=mergeGeometries(parts,false)??new BufferGeometry();parts.forEach(g=>g.dispose());return result;}
function CityGeometry({city,onSelect}:{city:OsmTownData3D;onSelect:(feature:CityFeature3D)=>void}){
 const batches=useMemo(()=>{
  const sets=Array.from({length:4},()=>({parts:[] as BufferGeometry[],ranges:[] as {end:number;feature:CityFeature3D}[],triangles:0}));
  for(const feature of city.buildings){const part=polygon(feature,0,true),set=sets[Math.abs(feature.id)%4];set.triangles+=part.getAttribute('position').count/3;set.ranges.push({end:set.triangles,feature});set.parts.push(part);}
  const buildings=sets.map(set=>({geometry:joined(set.parts),ranges:set.ranges}));
  return{buildings,roads:ribbons(city.roads.filter(f=>f.kind==='road'),.085),curbs:ribbons(city.roads.filter(f=>f.kind==='road'),.06,2.5),paths:ribbons(city.roads.filter(f=>f.kind==='footway'),.09),rivers:ribbons(city.water.filter(f=>f.kind==='river'),.045),water:joined(city.water.filter(f=>f.kind==='water-area').map(f=>polygon(f,.035))),parks:joined(city.parks.map(f=>polygon(f,.03)))};
 },[city]);
 useEffect(()=>()=>{batches.buildings.forEach(b=>b.geometry.dispose());[batches.roads,batches.curbs,batches.paths,batches.rivers,batches.water,batches.parks].forEach(g=>g.dispose());},[batches]);
 const click=(event:ThreeEvent<MouseEvent>,ranges:{end:number;feature:CityFeature3D}[])=>{if(event.delta>5||event.button!==0)return;const feature=ranges.find(r=>(event.faceIndex??-1)<r.end)?.feature;if(feature){event.stopPropagation();onSelect(feature);}};
 return <>
  <mesh geometry={batches.parks} raycast={()=>{}}><meshStandardMaterial color="#9ab795" side={DoubleSide}/></mesh>
  <mesh geometry={batches.rivers} raycast={()=>{}}><meshStandardMaterial color="#6fadb5" side={DoubleSide}/></mesh>
  <mesh geometry={batches.water} raycast={()=>{}}><meshStandardMaterial color="#6fadb5" side={DoubleSide}/></mesh>
  <mesh geometry={batches.curbs} raycast={()=>{}}><meshStandardMaterial color="#eee7d7" side={DoubleSide}/></mesh>
  <mesh geometry={batches.roads} raycast={()=>{}}><meshStandardMaterial color="#768382" side={DoubleSide}/></mesh>
  <mesh geometry={batches.paths} raycast={()=>{}}><meshStandardMaterial color="#c4b8a0" side={DoubleSide}/></mesh>
  {batches.buildings.map((batch,i)=><mesh key={i} geometry={batch.geometry} onClick={e=>click(e,batch.ranges)}><meshStandardMaterial color={['#d0c7b4','#b4c6c4','#dfd8c6','#9eb5b7'][i]} roughness={.8}/></mesh>)}
 </>;
}
export default function OSMTownScene3D({city,view,keys,mobile,appearance,choice,onSelect,onHint,onLocation}:{city:OsmTownData3D;view:MutableRefObject<CityView3D>;keys:MutableRefObject<Set<string>>;mobile:MutableRefObject<MobileInput3D>;appearance:FarmerAppearance3D;choice:CharacterChoice3D;onSelect:(feature:CityFeature3D)=>void;onHint:(message:string)=>void;onLocation:(point:CityPoint3D)=>void}){
 const avatar=useRef<Group>(null),position=useRef({...city.spawn}),jump=useRef<JumpState3D>({y:0,velocity:0,grounded:true}),movement=useRef({moving:false,running:false}),space=useRef(false),target=useRef<CityPoint3D|null>(null),marker=useRef<Group>(null);
 const stand=useMemo(()=>buildCityCollision3D(city),[city]),cameraTarget=useRef(new Vector3()),facing=useRef(Math.PI),lastHint=useRef(0),lastLocation=useRef(0);
 useFrame(({camera,size},dt)=>{
  const delta=Math.min(dt,.05),v=view.current,k=keys.current;
  if(v.teleport){position.current={...v.teleport};v.focus={...v.teleport};v.teleport=null;target.current=null;jump.current={y:0,velocity:0,grounded:true};}
  const right=Number(k.has('d')||k.has('ArrowRight'))-Number(k.has('a')||k.has('ArrowLeft'))+mobile.current.right;
  const forward=Number(k.has('w')||k.has('ArrowUp'))-Number(k.has('s')||k.has('ArrowDown'))+mobile.current.forward;
  const vector=movementVector3D(right,forward,v.yaw),running=k.has('Shift');
  if(v.mode==='overview'){v.focus.x+=vector.x*delta*240;v.focus.z+=vector.z*delta*240;v.focus.x=Math.max(city.bounds.minX,Math.min(city.bounds.maxX,v.focus.x));v.focus.z=Math.max(city.bounds.minZ,Math.min(city.bounds.maxZ,v.focus.z));movement.current={moving:false,running:false};}
  else{
   let dx=vector.x,dz=vector.z;if(right||forward)target.current=null;
   if(target.current){const length=Math.hypot(target.current.x-position.current.x,target.current.z-position.current.z);if(length<.7){target.current=null;}else{dx=(target.current.x-position.current.x)/length;dz=(target.current.z-position.current.z)/length;}}
   const speed=(running?7.8:4.3)*delta,old={...position.current};
   if(stand({x:old.x+dx*speed,z:old.z+dz*speed}))position.current={x:old.x+dx*speed,z:old.z+dz*speed};else{if(stand({x:old.x+dx*speed,z:old.z}))position.current.x+=dx*speed;if(stand({x:position.current.x,z:old.z+dz*speed}))position.current.z+=dz*speed;}
   const moved=Math.hypot(position.current.x-old.x,position.current.z-old.z)>.0001;
   if(target.current&&!moved&&Math.hypot(dx,dz)>.1){target.current=null;if(Date.now()-lastHint.current>2000){onHint('A building blocks that direction. Use WASD or the joystick to walk around it.');lastHint.current=Date.now();}}
   movement.current={moving:moved,running:running&&moved};if(moved)facing.current=Math.atan2(dx,dz);
   const held=k.has(' ')||mobile.current.jump;jump.current=stepJump3D(jump.current,delta,held&&!space.current);space.current=held;
   if(avatar.current){avatar.current.position.set(position.current.x,jump.current.y,position.current.z);avatar.current.rotation.y=facing.current;}
  }
  if(avatar.current)avatar.current.visible=v.mode==='walk';
  if(marker.current){marker.current.visible=v.mode==='walk'&&target.current!==null;if(target.current)marker.current.position.set(target.current.x,.13,target.current.z);}
  const focus=v.mode==='walk'?position.current:v.focus,desired=cameraTarget.current.set(focus.x,v.mode==='walk'?1.3:0,focus.z);
  camera.position.set(desired.x-Math.sin(v.yaw)*1400*Math.cos(v.pitch),desired.y+1400*Math.sin(v.pitch),desired.z-Math.cos(v.yaw)*1400*Math.cos(v.pitch));camera.lookAt(desired);if(Date.now()-lastLocation.current>500){lastLocation.current=Date.now();onLocation({...focus});}
  if(camera instanceof OrthographicCamera){const zoom=v.mode==='overview'?Math.min(size.width/2450,size.height/1800)*v.zoom:v.zoom;if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}}
 });
 return <>
  <color attach="background" args={['#d9e5df']}/><ambientLight intensity={1.4}/><hemisphereLight intensity={1.2} color="#fff5de" groundColor="#829889"/><directionalLight position={[800,1400,600]} intensity={1.8}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[(city.bounds.minX+city.bounds.maxX)/2,0,(city.bounds.minZ+city.bounds.maxZ)/2]} onClick={e=>{if(e.delta>5||e.button!==0)return;e.stopPropagation();if(view.current.mode==='walk'){const p={x:e.point.x,z:e.point.z};if(stand(p)){target.current=p;onHint('Walking to the selected point. Buildings stop movement.');}else onHint('Choose a spot outside buildings.');}else{view.current.focus={x:e.point.x,z:e.point.z};}}}><planeGeometry args={[city.bounds.maxX-city.bounds.minX,city.bounds.maxZ-city.bounds.minZ]}/><meshStandardMaterial color="#dcd8c7"/></mesh>
  <CityGeometry city={city} onSelect={onSelect}/>
  <group ref={avatar} position={[city.spawn.x,0,city.spawn.z]}><Suspense fallback={null}>{choice.model==='farmer'?<FarmerModel3D appearance={appearance} movement={movement} selectedTool={null} action="hoe" actionUntil={0}/>:<MirrorHumanPreview3D appearance={choice.customLook} movement={movement}/>}</Suspense><mesh rotation={[-Math.PI/2,0,0]} position={[0,.1,0]} raycast={()=>{}}><ringGeometry args={[.6,.9,24]}/><meshBasicMaterial color="#2d8d73" side={DoubleSide}/></mesh></group>
  <group ref={marker} visible={false}><mesh rotation={[-Math.PI/2,0,0]} raycast={()=>{}}><ringGeometry args={[.6,.9,24]}/><meshBasicMaterial color="#dc9d3c" side={DoubleSide}/></mesh></group>
 </>;
}
