import CoopVisual3D from './CoopVisual3D';
import { POND_3D } from './worldLayout';
import { FARM_HOUSE_CATALOG_3D, type FarmHouseStyle3D, type FarmObjectKind3D, type FarmDecorationKind3D } from './farmCustomization3D';

// Shared by placed objects and cursor previews; replace artwork here once.
export function FarmPoolVisual3D() { return <>
  <mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[POND_3D.radius,48]}/><meshStandardMaterial color="#4ca6bd" roughness={.25} metalness={.08}/></mesh>
  <mesh position={[0,.01,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[POND_3D.radius,POND_3D.radius+.35,48]}/><meshStandardMaterial color="#d7c18a"/></mesh>
</>; }
export function FarmTreeVisual3D({ stage = 3 }: { stage?: 1|2|3 }) { return <>
      {stage === 1 ? <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.42, 0.54, 0.4, 9]} /><meshStandardMaterial color="#74462c" /></mesh> : <>
        <mesh position={[0, stage === 2 ? 0.55 : 1.25, 0]} castShadow><cylinderGeometry args={[stage === 2 ? 0.12 : 0.24, stage === 2 ? 0.17 : 0.34, stage === 2 ? 1.1 : 2.5, 9]} /><meshStandardMaterial color="#765033" /></mesh>
        <mesh position={[0, stage === 2 ? 1.25 : 2.7, 0]} castShadow receiveShadow><icosahedronGeometry args={[stage === 2 ? 0.65 : 1.35, 1]} /><meshStandardMaterial color={stage === 2 ? '#72ad48' : '#3c8b47'} roughness={0.9} /></mesh>
      </>}
</>; }
export function FarmHouseVisual3D({ style = 'cottage' }: { style?: FarmHouseStyle3D }) { if(style==='coop')return <CoopVisual3D/>;const house=FARM_HOUSE_CATALOG_3D.find(item=>item.id===style)??FARM_HOUSE_CATALOG_3D[0]; return <>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow><boxGeometry args={[5, 3.1, 4]} /><meshStandardMaterial color={house.color} roughness={0.85} /></mesh>
      <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[4, 2, 4]} /><meshStandardMaterial color={house.roofColor} /></mesh>
      <mesh position={[0, 1, 4 / 2 + 0.03]}><boxGeometry args={[0.8, 2, 0.12]} /><meshStandardMaterial color="#71472e" /></mesh>
      <mesh position={[-1.45, 1.8, 4 / 2 + 0.04]}><boxGeometry args={[1.05, 1, 0.1]} /><meshStandardMaterial color="#8bd3d1" emissive="#326a75" emissiveIntensity={0.12} /></mesh>
      <mesh position={[0, 3.15, 4 / 2 + 0.12]}><boxGeometry args={[2.3, 0.7, 0.14]} /><meshStandardMaterial color={'#5c8c77'} /></mesh>

</>; }
export function FarmPortalVisual3D() { return <>
    <mesh position={[-1.1, 1.4, 0]}><boxGeometry args={[0.2, 2.8, 0.3]} /><meshStandardMaterial color="#74563e" /></mesh>
    <mesh position={[1.1, 1.4, 0]}><boxGeometry args={[0.2, 2.8, 0.3]} /><meshStandardMaterial color="#74563e" /></mesh>
    <mesh position={[0, 2.7, 0]}><boxGeometry args={[2.5, 0.3, 0.4]} /><meshStandardMaterial color="#3d7772" /></mesh>

</>; }
export function FarmDecorationVisual3D({ kind, fenceConnections = [] }: { kind: FarmDecorationKind3D; fenceConnections?: {x:number;z:number}[] }) { return <>
      {kind==='fence' ? fenceConnections.length ? <>
        <mesh position={[0,.48,0]} castShadow><boxGeometry args={[.12,.96,.12]}/><meshStandardMaterial color="#d9c39b"/></mesh>
        {fenceConnections.flatMap(link=>[.3,.68].map(y=><mesh key={`${link.x},${link.z},${y}`} position={[link.x*.25,y,link.z*.25]} castShadow><boxGeometry args={[link.x ? .5 : .09,.1,link.z ? .5 : .09]}/><meshStandardMaterial color="#b99a69"/></mesh>))}
      </> : <>
        {[-.4,.4].map(px=><mesh key={px} position={[px,.48,0]} castShadow><boxGeometry args={[.12,.96,.12]}/><meshStandardMaterial color="#d9c39b"/></mesh>)}
        {[.3,.68].map(y=><mesh key={y} position={[0,y,0]} castShadow><boxGeometry args={[.92,.1,.09]}/><meshStandardMaterial color="#b99a69"/></mesh>)}
      </> : kind==='bench' ? <>
        <mesh position={[0,.48,0]} castShadow><boxGeometry args={[.92,.12,.45]}/><meshStandardMaterial color="#ac7044"/></mesh>
        <mesh position={[0,.8,-.19]} castShadow><boxGeometry args={[.92,.5,.09]}/><meshStandardMaterial color="#b98353"/></mesh>
        {[-.32,.32].map(px=><mesh key={px} position={[px,.24,0]} castShadow><boxGeometry args={[.1,.48,.35]}/><meshStandardMaterial color="#40534b"/></mesh>)}
      </> : <>
        <mesh position={[0,.08,0]} receiveShadow><boxGeometry args={[.87,.16,.87]}/><meshStandardMaterial color="#6f513b"/></mesh>
        {[-.24,0,.24].flatMap((px,i)=>[-.22,.22].map((pz,j)=><group key={`${i}-${j}`} position={[px,0,pz]}>
          <mesh position={[0,.25,0]}><cylinderGeometry args={[.015,.018,.3,5]}/><meshStandardMaterial color="#407347"/></mesh>
          <mesh position={[0,.4,0]} castShadow><sphereGeometry args={[.095,6,4]}/><meshStandardMaterial color={['#f6b4c8','#f7d984','#e4d0f1'][(i+j)%3]}/></mesh>
        </group>))}
      </>}
</>; }
export default function FarmObjectVisual3D({ kind, stage = 3, style, fenceConnections }: { kind: FarmObjectKind3D; stage?: 1|2|3; style?: FarmHouseStyle3D; fenceConnections?: {x:number;z:number}[] }) {
  return kind==='pond'?<FarmPoolVisual3D/>:kind==='tree'?<FarmTreeVisual3D stage={stage}/>:(kind==='house'||kind==='building')?<FarmHouseVisual3D style={style}/>:kind==='portal'?<FarmPortalVisual3D/>:<FarmDecorationVisual3D kind={kind} fenceConnections={fenceConnections}/>;
}
