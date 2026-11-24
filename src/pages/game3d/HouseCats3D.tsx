import { catEnergy3D,findCatBed3D,CAT_SLEEP_RULES_3D } from './catSleep3D';
import CatHeartEffect3D from './CatHeartEffect3D';
import { petBowlPosition3D,catMealTarget3D,findCatMealPath3D,freshCatMeal3D,stepCatMeal3D,type CatMeal3D } from './petFeeding3D';
import { houseLayoutFor3D,houseObstacles3D,type HouseLayout3D } from './houseCustomization3D';
import type { HouseEditorState3D } from './useHouseEditor3D';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group,Mesh } from 'three';
import type { Game3DSave } from './game3d';
import { CAT_CATALOG_3D,freshCatBrain3D,stepCatBrain3D,isCatFloorClear3D,type OwnedCat3D,type CatRest3D } from './cats3D';
import { isCameraDrag3D } from './cameraControls3D';
// Replace this model here once to update every owned cat.
function Cat({cat,save,paused,onCatSelect,onMealComplete,onMealBlocked,onRestChange,index,layout,editor,positions,hideLabels=false}:{cat:OwnedCat3D;save:Game3DSave;paused:boolean;onCatSelect:(id:string,position:{x:number;z:number})=>void;onMealComplete:(id:string,servedAt:number)=>void;onMealBlocked:(id:string,servedAt:number)=>void;onRestChange:(id:string,rest:Omit<CatRest3D,'updatedAt'>)=>void;index:number;layout:HouseLayout3D;editor?:HouseEditorState3D;positions?:React.MutableRefObject<Record<string,{x:number;z:number}>>;hideLabels?:boolean}) {
  const seed=Number(cat.id.split('-')[1]),brain=useRef(freshCatBrain3D(seed));
  const root=useRef<Group>(null),body=useRef<Group>(null),tail=useRef<Group>(null),head=useRef<Group>(null),legs=useRef<(Group|null)[]>([]),time=useRef(0);
  const latestRest=useRef(cat.rest);
  useEffect(()=>{latestRest.current=cat.rest;});
  const obstacles=useMemo(()=>houseObstacles3D(layout),[layout]);
  useEffect(()=>{const rest=latestRest.current;const sleepingBed=rest?.sleeping&&rest.bedId?layout.furniture[rest.bedId]:null;const position=sleepingBed?.kind==='catBed'?sleepingBed:layout.catPositions[cat.id]??freshCatBrain3D(seed);let x=position.x,z=position.z;if(!isCatFloorClear3D(x,z,obstacles)){for(let px=-4;px<=4;px++)for(let pz=0;pz<=3;pz++)if(isCatFloorClear3D(px,pz,obstacles)){x=px;z=pz;}}brain.current={...brain.current,x,z,yaw:'rotation' in position?position.rotation*Math.PI/2:0};},[layout,cat.id,seed,obstacles,editor?.active]);
  const meal=useRef<{servedAt:number;state:CatMeal3D}|null>(null);
  useEffect(()=>{meal.current=null;},[layout,editor?.active]);
  const sleepTrip=useRef<{bedId:string;state:CatMeal3D}|null>(null),restRequest=useRef<string|null>(null),restRetryAt=useRef(0);
  const closedEyes=useRef<(Mesh|null)[]>([]),sleepTail=useRef<Group>(null);
  useEffect(()=>{sleepTrip.current=null;restRetryAt.current=0;},[layout,editor?.active]);
  useEffect(()=>{restRequest.current=null;},[cat.rest]);
  const requestRest=(energy:number,bedId:string|null,sleeping:boolean)=>{const key=`${Math.round(energy)},${bedId},${sleeping}`;if(restRequest.current!==key){restRequest.current=key;onRestChange(cat.id,{energy,bedId,sleeping});}};
  const sleepingBed=cat.rest?.bedId?layout.furniture[cat.rest.bedId]:null;
  const showSleep=cat.rest?.sleeping===true&&sleepingBed?.kind==='catBed'&&cat.mealServedAt===undefined;
  const coat=CAT_CATALOG_3D.find(item=>item.id===cat.coat)!;
  useFrame((_,delta)=>{
    if(!paused)time.current+=Math.min(delta,.1);
    const now=Date.now(),energy=catEnergy3D(cat,now),called=cat.calledAt!==undefined&&now-cat.calledAt<20000;
    if(sleepTrip.current&&save.cats.some(other=>other.id!==cat.id&&other.houseId===cat.houseId&&other.rest?.bedId===sleepTrip.current?.bedId)){sleepTrip.current=null;restRetryAt.current=0;}
    if(called&&!cat.rest?.bedId)sleepTrip.current=null;
    if(!paused&&!cat.rest)requestRest(100,null,false);
    let sleeping=showSleep;
    if(!paused&&cat.mealServedAt!==undefined) {
      sleepTrip.current=null;
      if(cat.rest?.bedId)requestRest(energy,null,false);
      if(meal.current?.servedAt!==cat.mealServedAt){const path=findCatMealPath3D(brain.current,catMealTarget3D(layout,index),obstacles);if(path.length)meal.current={servedAt:cat.mealServedAt,state:freshCatMeal3D(brain.current,path,petBowlPosition3D(layout))};else {onMealBlocked(cat.id,cat.mealServedAt);}}
      if(meal.current){meal.current.state=stepCatMeal3D(meal.current.state,delta);brain.current=meal.current.state.brain;if(meal.current.state.phase==='complete'){onMealComplete(cat.id,meal.current.servedAt);}}
    }else if(!paused){
      meal.current=null;
      if(cat.rest?.bedId&&sleepingBed?.kind!=='catBed'){requestRest(energy,null,false);sleepTrip.current=null;sleeping=false;}
      if(showSleep&&sleepingBed){
        brain.current={...brain.current,x:sleepingBed.x,z:sleepingBed.z,yaw:sleepingBed.rotation*Math.PI/2,mode:'resting'};
        if(energy>=100){requestRest(100,null,false);sleeping=false;}
      }else if((!called&&energy<=CAT_SLEEP_RULES_3D.tiredEnergy)||cat.rest?.bedId){
        if(!sleepTrip.current&&now>=restRetryAt.current){
          const bed=findCatBed3D(cat.id,save.cats,layout,brain.current);
          if(bed){sleepTrip.current={bedId:bed.id,state:freshCatMeal3D(brain.current,bed.path)};requestRest(energy,bed.id,false);}
          else {restRetryAt.current=now+1500;if(cat.rest?.bedId)requestRest(energy,null,false);}
        }
        if(sleepTrip.current){
          const bed=layout.furniture[sleepTrip.current.bedId];
          if(bed?.kind==='catBed'){
            sleepTrip.current.state=stepCatMeal3D(sleepTrip.current.state,delta);brain.current=sleepTrip.current.state.brain;
            if(sleepTrip.current.state.phase!=='walking'){brain.current.yaw=bed.rotation*Math.PI/2;requestRest(energy,sleepTrip.current.bedId,true);sleeping=true;}
          }else sleepTrip.current=null;
        }else brain.current={...brain.current,mode:'resting'};
      }else{
        sleepTrip.current=null;
        brain.current=stepCatBrain3D(brain.current,save.player,delta,time.current,seed,(called||cat.lastPetAt!==null&&now-cat.lastPetAt<20000),obstacles);
      }
    }
    const eating=cat.mealServedAt!==undefined&&meal.current?.state.phase==='eating';

    if(positions)positions.current[cat.id]={x:brain.current.x,z:brain.current.z};
    const b=brain.current,resting=!eating&&b.mode==='resting',t=time.current;
    if(root.current){root.current.position.set(b.x,0,b.z);root.current.rotation.y=b.yaw;}
    if(body.current){body.current.position.y=sleeping?.28+Math.sin(t*2)*.012:eating?.32:resting?.2:.35;body.current.scale.set(sleeping?1.1:1,sleeping?.65:resting?.7:1,sleeping?.8:1);}
    if(head.current){head.current.rotation.x=sleeping?.35:eating?.7+Math.sin(t*9)*.1:resting?.12:Math.sin(t*2)*.06;head.current.rotation.y=sleeping?-.7:0;head.current.position.z=sleeping?.26:.39;}
    if(tail.current){tail.current.visible=!sleeping;tail.current.rotation.z=resting?.8:Math.sin(t*2)*.25;}
    if(sleepTail.current)sleepTail.current.visible=sleeping;
    closedEyes.current.forEach((eye,i)=>{if(eye)eye.scale.y=sleeping?.1:i%2?1:1.2;});
    legs.current.forEach((leg,index)=>{if(leg){leg.rotation.x=resting||eating?0:Math.sin(b.distance*13+(index%2?Math.PI:0)+(index>1?Math.PI:0))*.5;leg.scale.y=sleeping?.15:resting?.35:1;}});
  });
  return <group ref={root} onPointerOver={event=>{if(editor?.active&&editor.tool==='select'&&!editor.moving){event.stopPropagation();editor.setHover(cat.id);}}} onPointerOut={()=>editor?.setHover(null)} onClick={event=>{event.stopPropagation();if(event.button===0&&!isCameraDrag3D(event.delta)){if(editor?.active)editor.select(cat.id);else if(!paused)onCatSelect(cat.id,brain.current);}}}>
    <group ref={body} position={[0,.35,0]}>
      <mesh scale={[.7,.8,1.3]} castShadow><sphereGeometry args={[.34,14,10]}/><meshStandardMaterial color={coat.color}/></mesh>
      <mesh position={[0,-.06,.25]} scale={[.75,1,.5]}><sphereGeometry args={[.24,12,8]}/><meshStandardMaterial color={coat.accent}/></mesh>
      <group ref={head} position={[0,.18,.39]}>
        <mesh castShadow scale={[1,.9,.85]}><sphereGeometry args={[.25,14,10]}/><meshStandardMaterial color={coat.color}/></mesh>
        {[-1,1].map(side=><group key={side}>
          <mesh position={[side*.16,.22,0]} rotation={[0,0,side*-.15]} castShadow><coneGeometry args={[.12,.27,3]}/><meshStandardMaterial color={coat.color}/></mesh>
          <mesh position={[side*.16,.23,.035]}><coneGeometry args={[.065,.16,3]}/><meshStandardMaterial color="#e4a5a3"/></mesh>
          <mesh ref={node=>{closedEyes.current[side===-1?0:2]=node;}} position={[side*.1,.035,.195]} scale={[1,1.2,.5]}><sphereGeometry args={[.05,10,8]}/><meshStandardMaterial color="#accc73"/></mesh>
          <mesh ref={node=>{closedEyes.current[side===-1?1:3]=node;}} position={[side*.1,.035,.22]} scale={[.35,1,.3]}><sphereGeometry args={[.035,8,6]}/><meshStandardMaterial color="#282924"/></mesh>
          <mesh position={[side*.07,-.075,.2]}><sphereGeometry args={[.08,10,8]}/><meshStandardMaterial color={coat.accent}/></mesh>
        </group>)}
        <mesh position={[0,-.04,.265]}><sphereGeometry args={[.035,8,6]}/><meshStandardMaterial color="#c78384"/></mesh>
      </group>
      <group ref={sleepTail} visible={false} position={[-.07,-.08,-.02]}><mesh rotation={[-Math.PI/2,0,.4]}><torusGeometry args={[.3,.055,8,24,Math.PI*1.65]}/><meshStandardMaterial color={coat.color}/></mesh></group>
      <group ref={tail} position={[0,.05,-.4]} rotation={[.4,0,0]}><mesh position={[0,.25,-.1]} rotation={[-.3,0,0]} castShadow><capsuleGeometry args={[.055,.55,4,8]}/><meshStandardMaterial color={coat.color}/></mesh></group>
    </group>
    {[-.15,.15].flatMap((x,i)=>[-.22,.24].map((z,j)=><group key={`${i},${j}`} ref={node=>{legs.current[i*2+j]=node;}} position={[x,.22,z]}>
      <mesh position={[0,-.08,0]} castShadow><capsuleGeometry args={[.065,.2,4,8]}/><meshStandardMaterial color={coat.color}/></mesh><mesh position={[0,-.18,.035]}><sphereGeometry args={[.075,10,8]}/><meshStandardMaterial color={coat.accent}/></mesh>
    </group>))}
    {showSleep&&!hideLabels&&!editor?.active&&<Html zIndexRange={[12,1]} position={[.35,1.6,0]} center><span className="pointer-events-none block animate-pulse text-lg font-bold italic tracking-widest text-[#8971ba]">z Z z</span></Html>}
    <CatHeartEffect3D pettedAt={cat.lastPetAt} hidden={editor?.active}/>
  </group>;
}
export default function HouseCats3D({save,paused,onCatSelect,onBowlSelect,onMealComplete,onMealBlocked,onRestChange,layout=houseLayoutFor3D(save),editor,positions,hideLabels=false}:{save:Game3DSave;paused:boolean;onCatSelect:(id:string,position:{x:number;z:number})=>void;onBowlSelect:()=>void;onMealComplete:(id:string,servedAt:number)=>void;onMealBlocked:(id:string,servedAt:number)=>void;onRestChange:(id:string,rest:Omit<CatRest3D,'updatedAt'>)=>void;layout?:HouseLayout3D;editor?:HouseEditorState3D;positions?:React.MutableRefObject<Record<string,{x:number;z:number}>>;hideLabels?:boolean}) {
  const cats=save.cats.filter(cat=>cat.houseId===save.interiorHouseId),bowl=petBowlPosition3D(layout);
  const pouring=useRef<Group>(null),bowlFood=useRef<Group>(null);
  useFrame(()=>{const served=Math.max(0,...cats.map(cat=>cat.mealServedAt??0)),phase=(Date.now()-served)/900;
    if(pouring.current){pouring.current.visible=!paused&&phase>=0&&phase<1;pouring.current.children.forEach((grain,index)=>{const p=(phase+index/8)%1;grain.position.set(Math.sin(index*2)*.1,.75*(1-p),Math.cos(index*2)*.1);});}
    if(bowlFood.current)bowlFood.current.visible=cats.some(cat=>cat.mealServedAt!==undefined);
  });
  return <>{cats.filter(cat=>!(editor?.moving&&editor.selected===cat.id)).map(cat=><Cat key={cat.id} cat={cat} index={cats.indexOf(cat)} layout={layout} editor={editor} positions={positions} hideLabels={hideLabels} save={save} paused={paused} onCatSelect={onCatSelect} onMealComplete={onMealComplete} onMealBlocked={onMealBlocked} onRestChange={onRestChange}/>)}
    {cats.length>0&&<group position={[bowl.x,0,bowl.z]} onClick={event=>{event.stopPropagation();if(!paused&&event.button===0&&!isCameraDrag3D(event.delta))onBowlSelect();}}>
      <mesh position={[0,.07,0]}><cylinderGeometry args={[.3,.34,.14,20]}/><meshStandardMaterial color="#7d9fa6"/></mesh>
      <mesh position={[0,.145,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.26,20]}/><meshStandardMaterial color="#506d76"/></mesh>
      <group ref={bowlFood}>{Array.from({length:14},(_,i)=><mesh key={i} position={[Math.sin(i*2)*.19,.17,Math.cos(i*2)*.19]}><sphereGeometry args={[.045,6,4]}/><meshStandardMaterial color="#bd935e"/></mesh>)}</group>
      <group ref={pouring} visible={false}>{Array.from({length:8},(_,i)=><mesh key={i}><sphereGeometry args={[.035,6,4]}/><meshStandardMaterial color="#d6ae6c"/></mesh>)}</group>
    </group>}
  </>;
}
