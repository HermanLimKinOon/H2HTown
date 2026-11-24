import {KLCitySkyline3D,KLTownStreetscape3D} from './KualaLumpurTown3D';
import WorldInteractionLabel3D from './WorldInteractionLabel3D';
import type {MutableRefObject} from 'react';
import {isWorldShop3D} from './worldShop3D';
import type {ThreeEvent} from '@react-three/fiber';
import TownObjectVisual3D from './TownObjectVisual3D';
import { FarmPortalVisual3D } from './FarmObjectVisual3D';
import type { FarmTransform3D } from './farmCustomization3D';
import { Html } from '@react-three/drei';
import { type TownShopId3D } from './townLayout3D';
import {freshTownLayout3D,getTownObject3D,type TownLayout3D} from './townCustomization3D';
import { isCameraDrag3D } from './cameraControls3D';

export function TravelGate3D({ onTravel, town = false, editing = false, transform = {x:0,z:12,rotation:0}, onSelect, onHover }: { onTravel: () => void; town?: boolean; editing?: boolean; transform?: FarmTransform3D; onSelect?: () => void; onHover?: (id: string | null) => void }) {
  return <group position={[transform.x, 0, transform.z]} rotation={[0,transform.rotation*Math.PI/2,0]} onPointerOver={event=>{if(onHover){event.stopPropagation();onHover('portal');}}} onPointerOut={()=>onHover?.(null)} onClick={event=>{event.stopPropagation();if(event.nativeEvent.button===0&&!isCameraDrag3D(event.delta)){if(editing)onSelect?.();else onTravel();}}}>
    <FarmPortalVisual3D/>
    {!editing && <Html zIndexRange={[12,1]} position={[0, 3.2, 0]} center>
      <button type="button" onClick={onTravel} className="game-world-label">{town ? '🏡 Return to private farm' : '✦ Visit H2H Town'}</button>
    </Html>}
  </group>;
}

export default function TownWorld3D({onShop,onTalk,onTravel,onGround,onPlot,playerPosition,plotActionLabel='Apply for shop',layout=freshTownLayout3D(),onSelect,onHover,onObjectHover,hiddenObject}: {
 playerPosition?:MutableRefObject<{x:number;z:number}>;layout?:TownLayout3D;onSelect?:(id:string)=>void;onHover?:(point:{x:number;z:number}|null)=>void;onObjectHover?:(id:string|null)=>void;hiddenObject?:string|null;
 plotActionLabel?:string;onPlot?:(id:string)=>void;onGround:(point:{x:number;z:number})=>void;onShop:(id:TownShopId3D)=>void;onTalk:(id:string)=>void;onTravel:()=>void;
}){
 const editing=Boolean(onSelect);
 const labelTargets=[...Object.keys(layout.objects),...Object.keys(layout.buildings)].map(id=>getTownObject3D(layout,id)).filter((o):o is NonNullable<typeof o>=>Boolean(o&&(isWorldShop3D(o)||o.style==='plot'||['npc','portal'].includes(o.kind))));
 const ground={onClick:(event:ThreeEvent<MouseEvent>)=>{if(event.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();onGround({x:event.point.x,z:event.point.z});}},onPointerMove:(event:ThreeEvent<PointerEvent>)=>{if(onHover){event.stopPropagation();onHover({x:event.point.x,z:event.point.z});onObjectHover?.(null);}},onPointerOut:()=>onHover?.(null)};
 return <>
  <color attach="background" args={['#d2e4df']}/><fog attach="fog" args={['#d2e4df',70,155]}/>
  <hemisphereLight intensity={1.65} color="#fff3dd" groundColor="#738667"/>
  <directionalLight position={[12,20,8]} intensity={1.75} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28}/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow {...ground}><planeGeometry args={[49,49]}/><meshStandardMaterial color="#86a987"/></mesh>
  <KLTownStreetscape3D/><KLCitySkyline3D/>
  {editing&&<gridHelper args={[48,48,'#8ba69b','#b6c6ae']} position={[0,.045,0]}/>}
  {[...Object.keys(layout.objects),...Object.keys(layout.buildings)].filter(id=>id!==hiddenObject).map(id=>{
   const object=getTownObject3D(layout,id);if(!object)return null;
   const activate=()=>{if(onSelect)onSelect(id);else if(isWorldShop3D(object))onShop(id as TownShopId3D);else if(object.style==='plot'){if(onPlot)onPlot(id);else onGround({x:object.x,z:object.z});}else if(object.kind==='npc')onTalk(id.slice(4));else if(id==='portal')onTravel();};
   return <group key={id} position={[object.x,0,object.z]} rotation={[0,object.rotation*Math.PI/2,0]}
    onPointerMove={event=>{if(onHover){event.stopPropagation();onHover({x:event.point.x,z:event.point.z});onObjectHover?.(id);}}} onPointerOut={()=>onObjectHover?.(null)}
    onClick={event=>{event.stopPropagation();if(event.button===0&&!isCameraDrag3D(event.delta))activate();}}>
    <TownObjectVisual3D object={object}/>
    {!editing&&(isWorldShop3D(object)||object.style==='plot'||['npc','portal'].includes(object.kind))&&<WorldInteractionLabel3D target={object} targets={labelTargets} player={playerPosition} height={isWorldShop3D(object)?Math.min(object.height,4.6):object.height} onClick={activate} label={object.kind==='portal'?'Return to private farm':`${object.name} · ${object.style==='plot'?plotActionLabel:isWorldShop3D(object)?'Enter':'Talk'}`}/>}

   </group>;
  })}
 </>;
}
