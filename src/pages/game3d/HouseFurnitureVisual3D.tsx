import type { HouseFurnitureKind3D } from './houseCustomization3D';
// Shared geometry for placed furniture and transparent previews.
export default function HouseFurnitureVisual3D({kind}:{kind:HouseFurnitureKind3D}) {
  if(kind==='bed')return <>
    <mesh position={[0,.35,0]} castShadow><boxGeometry args={[2.2,.7,3.8]}/><meshStandardMaterial color="#77573e"/></mesh>
    <mesh position={[0,.78,.2]}><boxGeometry args={[2.1,.24,3.2]}/><meshStandardMaterial color="#82a59d"/></mesh>
    <mesh position={[0,.95,-1.1]}><boxGeometry args={[1.6,.18,.65]}/><meshStandardMaterial color="#fff3dd"/></mesh>
  </>;
  if(kind==='rug')return <mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.8,3.8]}/><meshStandardMaterial color="#b87357"/></mesh>;
  if(kind==='catBed')return <group position={[0,.08,0]}><mesh rotation={[-Math.PI/2,0,0]} scale={[1,.8,.6]}><torusGeometry args={[.4,.15,8,24]}/><meshStandardMaterial color="#bc8b9a"/></mesh><mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.43,24]}/><meshStandardMaterial color="#e8c4bd"/></mesh></group>;
  if(kind==='chair')return <>
    <mesh position={[0,.5,0]} castShadow><boxGeometry args={[.9,.15,.9]}/><meshStandardMaterial color="#a47a50"/></mesh>
    <mesh position={[0,.95,-.37]} castShadow><boxGeometry args={[.9,.7,.15]}/><meshStandardMaterial color="#a47a50"/></mesh>
    {[-.33,.33].flatMap(x=>[-.33,.33].map(z=><mesh key={`${x},${z}`} position={[x,.23,z]}><boxGeometry args={[.1,.46,.1]}/><meshStandardMaterial color="#77573e"/></mesh>))}
  </>;
  const cabinet=kind==='cabinet';
  return <><mesh position={[0,.6,0]} castShadow><boxGeometry args={cabinet?[3,1.2,1.5]:[2.1,1.2,1.5]}/><meshStandardMaterial color={cabinet?'#a47a50':'#9a704b'}/></mesh>{cabinet&&<mesh position={[0,1.24,0]}><boxGeometry args={[3.1,.12,1.6]}/><meshStandardMaterial color="#e2d1ad"/></mesh>}</>;
}
