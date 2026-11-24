import {useLayoutEffect,useRef} from 'react';
import {Object3D,type InstancedMesh} from 'three';
import {Text} from '@react-three/drei';
import type {ThreeElements} from '@react-three/fiber';

const noHit=()=>{};
type BoxProps={at:[number,number,number];size:[number,number,number];color:string;decor?:boolean;rotation?:[number,number,number];glass?:boolean};
function Box({at,size,color,decor=false,rotation,glass=false}:BoxProps){return <mesh position={at} rotation={rotation} castShadow={!decor} receiveShadow raycast={decor?noHit:undefined}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={glass ? .22 : .8} metalness={glass ? .32 : 0}/></mesh>;}
function Cylinder({at,radius,height,color,top=radius,segments=16,decor=false}:{at:[number,number,number];radius:number;top?:number;height:number;color:string;segments?:number;decor?:boolean}){return <mesh position={at} castShadow={!decor} receiveShadow raycast={decor?noHit:undefined}><cylinderGeometry args={[top,radius,height,segments]}/><meshStandardMaterial color={color} roughness={.55} metalness={color==='#b8d2d6' ? .45 : 0}/></mesh>;}
type Repeat={at:[number,number,number];size:[number,number,number];rotation?:[number,number,number]};
function RepeatedGeometry({items,color,cylinder=false,decor=false}:{items:Repeat[];color:string;cylinder?:boolean;decor?:boolean}){
 const ref=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const transform=new Object3D();items.forEach((item,i)=>{transform.position.set(...item.at);transform.scale.set(...item.size);transform.rotation.set(...(item.rotation??[0,0,0]));transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();},[items]);
 return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} raycast={decor?noHit:undefined} receiveShadow>{cylinder?<cylinderGeometry args={[1,1,1,8]}/>:<boxGeometry args={[1,1,1]}/>}<meshStandardMaterial color={color} roughness={.65}/></instancedMesh>;
}
function Sign({text,y=2.15,color='#174d4b'}:{text:string;y?:number;color?:string}){return <group position={[0,y,2.045]}><Box at={[0,0,0]} size={[3.9,.48,.1]} color={color}/><Text position={[0,0,.07]} fontSize={Math.min(.28,3.4/Math.max(10,text.length))} color="#fff2ce" anchorX="center" anchorY="middle" maxWidth={3.7}>{text}</Text></group>;}

/** Replaceable, lightweight geometry; all storefronts keep the existing 5 × 4 footprint. */
export function KLShophouse3D({name,color='#efdbb5',accent='#285d5a'}:{name:string;color?:string;accent?:string}){
 return <>
  <Box at={[0,1.85,0]} size={[5,3.7,4]} color={color}/>
  <Box at={[0,.13,0]} size={[5,.26,4]} color="#b6aa92"/>
  <Box at={[0,3.8,0]} size={[5,.22,4]} color="#faf0d5"/>
  <Box at={[0,4,0]} size={[4.55,.24,3.5]} color={accent}/>
  <Box at={[0,2.62,2.02]} size={[5,.13,.16]} color="#fff3d8"/>
  {[-1.65,0,1.65].map(x=><group key={x}>
   <Box at={[x,3.05,2.025]} size={[.8,.8,.05]} color={accent}/>
   <mesh position={[x,3.45,2.03]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.4,.4,.06,16,1,false,Math.PI/2,Math.PI]}/><meshStandardMaterial color={accent}/></mesh>
   {[-.23,0,.23].map(dx=><Box key={dx} at={[x+dx,3.05,2.07]} size={[.045,.76,.04]} color="#91b1a0"/>)}
   <Box at={[x,2.65,2.1]} size={[1,.13,.24]} color="#f6e9ce"/>
  </group>)}
  {[-2.3,2.3].map(x=><Box key={x} at={[x,1.12,2.01]} size={[.23,2.22,.24]} color="#f9efd9"/>)}
  <Box at={[0,1.04,2.025]} size={[1.05,1.95,.06]} color="#234b48"/>
  <Box at={[0,1.16,2.065]} size={[.68,1.4,.03]} color="#8fbac0" glass/>
  {[-1.43,1.43].map(x=><Box key={x} at={[x,1.15,2.03]} size={[1.14,1.48,.06]} color="#78a6a8" glass/>)}
  <group rotation={[-.16,0,0]} position={[0,1.88,2.15]}>{Array.from({length:12},(_,i)=><Box key={i} at={[-2.2+i*.4,0,0]} size={[.4,.08,.7]} color={i%2?'#f3e3be':accent}/>)}</group>
  <Sign text={name}/>
 </>;
}
function TwinSpire({x,decor=false,scale=1}:{x:number;decor?:boolean;scale?:number}){return <group position={[x,0,0]} scale={scale}>
 <Cylinder at={[0,4.7,0]} radius={.82} height={4.4} color="#7bafb6" segments={8} decor={decor}/>
 <Cylinder at={[0,7.2,0]} radius={.7} top={.45} height={.8} color="#b8d2d6" segments={8} decor={decor}/>
 <Cylinder at={[0,7.83,0]} radius={.42} top={.15} height={.6} color="#7f9da3" segments={8} decor={decor}/>
 <Cylinder at={[0,8.58,0]} radius={.09} top={.015} height={1} color="#b8d2d6" decor={decor}/>
 <RepeatedGeometry items={Array.from({length:11},(_,i)=>({at:[0,2.65+i*.4,0],size:[.86,.065,.86]}))} color="#c4d7d6" cylinder decor={decor}/>
 <RepeatedGeometry items={Array.from({length:8},(_,i)=>({at:[Math.sin(i*Math.PI/4)*.77,4.75,Math.cos(i*Math.PI/4)*.77],size:[.055,4.1,.08],rotation:[0,i*Math.PI/4,0]}))} color="#bed4d4" decor={decor}/>
 </group>;}
export function KLTwinTowerShop3D({name}:{name:string}){return <>
 <Box at={[0,1.18,0]} size={[5,2.36,4]} color="#e9e5d8"/>
 <Box at={[0,2.4,0]} size={[5,.17,4]} color="#365f64"/>
 {[-1.65,0,1.65].map(x=><Box key={x} at={[x,1.1,2.025]} size={[1.32,1.72,.06]} color="#6c9fa7" glass/>)}
 <Box at={[0,5.05,0]} size={[2.65,.35,.65]} color="#a6c5c8"/>
 <Box at={[0,4.75,0]} size={[2.6,.12,.32]} color="#527d86"/>
 <TwinSpire x={-1.25}/><TwinSpire x={1.25}/><Sign text={name} y={2.05}/>
 </>;}
export function KLPalmTree3D(props:ThreeElements['group']){return <group {...props}>
 <Cylinder at={[0,1.35,0]} radius={.2} top={.12} height={2.7} color="#9c8060" segments={7}/>
 {Array.from({length:7},(_,i)=><group key={i} rotation={[0,i*Math.PI*2/7,0]} position={[0,2.75,0]}><mesh position={[0,.05,.65]} rotation={[-.25,0,0]} scale={[.23,.1,1.18]} castShadow><sphereGeometry args={[1,7,4]}/><meshStandardMaterial color={i%2?'#3e7654':'#548b59'}/></mesh><Box at={[0,.05,.45]} size={[.065,.07,1.2]} color="#386b45"/></group>)}
 </group>;}
export function KLFountain3D(){return <>
 <Cylinder at={[0,.18,0]} radius={1.9} height={.36} color="#c5bfa8" segments={32}/>
 <Cylinder at={[0,.4,0]} radius={1.62} height={.07} color="#72bcc4" segments={32}/>
 <Cylinder at={[0,.75,0]} radius={.33} top={.23} height={1} color="#f0e3c3"/>
 <Cylinder at={[0,1.18,0]} radius={.85} top={.7} height={.15} color="#c5bfa8" segments={24}/>
 <Cylinder at={[0,1.31,0]} radius={.66} height={.035} color="#86d0d1" segments={24}/>
 <mesh position={[0,1.67,0]}><sphereGeometry args={[.24,12,8]}/><meshStandardMaterial color="#83d5d8" roughness={.15}/></mesh>
 </>;}

/** Static scenery stays beyond the playable boundary; no new collision or ownership state. */
function CityMonorail3D(){return <group position={[28,0,0]}>
 {[-22,-8,6,20].map(z=><Box key={z} at={[0,1.85,z]} size={[.48,3.7,.7]} color="#a5aca1" decor/>)}
 <Box at={[0,3.65,0]} size={[1.1,.32,58]} color="#b9c3b6" decor/>
 {[-.45,.45].map(x=><Box key={x} at={[x,3.89,0]} size={[.08,.12,58]} color="#75928e" decor/>)}
 {[0,3.3,6.6].map(z=><group key={z} position={[0,0,z-8]}>
  <Box at={[0,4.45,0]} size={[1.2,.95,3.1]} color="#eee7d2" decor/>
  <Box at={[0,4.03,0]} size={[1.24,.2,3.1]} color="#267e72" decor/>
  <Box at={[0,4.98,0]} size={[1.16,.13,3]} color="#688d88" decor/>
  {[-.61,.61].map(x=><RepeatedGeometry key={x} items={[-.95,0,.95].map(z=>({at:[x,4.53,z],size:[.02,.42,.72]}))} color="#446c72" decor/>)}
 </group>)}
 </group>;}
function HeritageCivicBackdrop3D(){return <group position={[16,0,-29]}>
 <Box at={[0,1.7,0]} size={[11,3.4,4]} color="#cba48b" decor/>
 <Box at={[0,3.42,0]} size={[11.4,.18,4.2]} color="#e9d9b8" decor/>
 {[-4.3,-2.2,2.2,4.3].map(x=><group key={x}><Box at={[x,1.25,2.03]} size={[1.25,2,.06]} color="#547875" decor/><mesh position={[x,2.25,2.03]} rotation={[Math.PI/2,0,0]} raycast={noHit}><cylinderGeometry args={[.625,.625,.07,16,1,false,Math.PI/2,Math.PI]}/><meshStandardMaterial color="#547875"/></mesh></group>)}
 <Box at={[0,3.1,0]} size={[2.3,6.2,2.8]} color="#e5c8a6" decor/>
 <Box at={[0,5.1,1.42]} size={[1.4,1.4,.05]} color="#fff3d8" decor/>
 <Box at={[0,5.25,1.46]} size={[.05,.55,.03]} color="#496e68" decor/><Box at={[.18,5.02,1.47]} size={[.4,.05,.03]} color="#496e68" decor/>
 <Cylinder at={[0,6.6,0]} radius={1.4} top={.45} height={.9} color="#947354" segments={12} decor/>
 <Cylinder at={[0,7.35,0]} radius={.08} top={.015} height={.75} color="#b39d6a" decor/>
 </group>;}
export function KLCitySkyline3D(){return <group><CityMonorail3D/><HeritageCivicBackdrop3D/>
 <mesh position={[0,-.09,0]} rotation={[-Math.PI/2,0,0]} raycast={noHit}><planeGeometry args={[160,160]}/><meshStandardMaterial color="#9eb6a2"/></mesh>
 <group position={[-19,0,-32]}><Box at={[0,2.5,0]} size={[12,5,7]} color="#b8c8c7" decor/><TwinSpire x={-2.7} decor scale={2}/><TwinSpire x={2.7} decor scale={2}/><Box at={[0,10.1,0]} size={[5.6,.65,1.2]} color="#9ab9bf" decor/></group>
 <group position={[-31,0,0]}><Cylinder at={[0,6,0]} radius={.55} top={.35} height={12} color="#d2cfb9" decor/><Cylinder at={[0,12.2,0]} radius={1.8} top={1.35} height={1.4} color="#9eabad" decor/><Cylinder at={[0,13.3,0]} radius={1.1} top={.5} height={.8} color="#d3d4c6" decor/><Cylinder at={[0,15.5,0]} radius={.12} top={.02} height={3.8} color="#bac9c5" decor/></group>
 {Array.from({length:14},(_,i)=>{const height=5+(i*7%11),x=-39+i*6;return <group key={i} position={[x,0,-44-(i%3)*3]}><Box at={[0,height/2,0]} size={[3.8,height,4.5]} color={['#91a8aa','#b3c1bd','#7e999e','#c2c7bd'][i%4]} decor/><RepeatedGeometry items={Array.from({length:Math.floor(height/1.2)},(_,j)=>({at:[0,1+j*1.2,2.27],size:[3.35,.32,.035]}))} color="#d1ded5" decor/></group>;})}
 <group position={[-36,0,-29]}><Box at={[0,8,0]} size={[3.8,16,4]} color="#6c999f" rotation={[0,.3,0]} decor glass/><Cylinder at={[0,18,0]} radius={.2} top={.01} height={5} color="#a0bcc0" decor/></group>
 </group>;}
export function KLTownStreetscape3D(){return <>
 {/* Ground-level inlays do not intercept clicks or change navigation. */}
 <mesh position={[0,.014,0]} rotation={[-Math.PI/2,0,0]} raycast={noHit}><planeGeometry args={[31,43]}/><meshStandardMaterial color="#d8d2bc"/></mesh>
 <mesh position={[0,.019,-5]} rotation={[-Math.PI/2,0,0]} raycast={noHit}><circleGeometry args={[7.2,48]}/><meshStandardMaterial color="#eee5ce"/></mesh>
 <mesh position={[0,.022,-5]} rotation={[-Math.PI/2,0,0]} raycast={noHit}><ringGeometry args={[6.8,7.15,48]}/><meshStandardMaterial color="#769d94"/></mesh>
 {Array.from({length:8},(_,i)=><group key={i} position={[0,.025,-5]} rotation={[0,i*Math.PI/4,0]}><Box at={[0,0,4.3]} size={[.18,.015,4.5]} color="#baab8f" decor/></group>)}
 {[-20.8,20.8].map(x=><group key={x}>
  <Box at={[x,.008,0]} size={[4.1,.012,48]} color="#657779" decor/>
  {[-1,1].map(side=><Box key={side} at={[x+side*2.15,.025,0]} size={[.14,.035,48]} color="#ede4cb" decor/>)}
  {Array.from({length:12},(_,i)=><Box key={i} at={[x,.025,-22+i*4]} size={[.11,.02,1.5]} color="#e5d6a5" decor/>)}
  {[-15,15].flatMap(z=>Array.from({length:5},(_,i)=><Box key={`${z}:${i}`} at={[x-1.6+i*.8,.027,z]} size={[.4,.018,2.4]} color="#e7e4d5" decor/>))}
 </group>)}
 {[-24.1,24.1].flatMap(x=>[-18,-6,6,18].map(z=><group key={`${x}:${z}`} position={[x,0,z]}><Cylinder at={[0,1.8,0]} radius={.065} height={3.6} color="#345b55" decor/><Box at={[0,3.56,0]} size={[.6,.18,.6]} color="#f6df9d" decor/></group>))}
 <group position={[0,.035,18]} rotation={[-Math.PI/2,0,0]}><Text fontSize={.75} letterSpacing={.12} color="#34665d" anchorX="center" raycast={noHit}>H2H • KUALA LUMPUR</Text><Text position={[0,-.85,0]} fontSize={.24} letterSpacing={.15} color="#8d856d" raycast={noHit}>CITY GARDEN • COMMUNITY • MARKET</Text></group>
 </>;}
