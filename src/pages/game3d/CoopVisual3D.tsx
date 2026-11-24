// Shared coop geometry for the world and faded placement preview.
export default function CoopVisual3D() { return <>
  <mesh position={[0,.8,-1.05]} castShadow receiveShadow><boxGeometry args={[3,1.6,1.7]}/><meshStandardMaterial color="#cd9454"/></mesh>
  <mesh position={[0,1.9,-1.05]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[2.3,.9,4]}/><meshStandardMaterial color="#ab4635"/></mesh>
  <mesh position={[0,.45,-.18]}><boxGeometry args={[.55,.9,.05]}/><meshStandardMaterial color="#4d3526"/></mesh>
  {[-1,1].map(x=><mesh key={x} position={[x,1.1,-.18]}><boxGeometry args={[.5,.45,.05]}/><meshStandardMaterial color="#fff0ba"/></mesh>)}
  {[-2.35,2.35].map(x=><group key={x}>
    {[-.1,1.8].map(z=><mesh key={z} position={[x,.4,z]} castShadow><boxGeometry args={[.1,.8,.1]}/><meshStandardMaterial color="#e1c38b"/></mesh>)}
    {[.2,.6].map(y=><mesh key={y} position={[x,y,.85]}><boxGeometry args={[.07,.06,1.9]}/><meshStandardMaterial color="#d3b27c"/></mesh>)}
  </group>)}
  {[.2,.6].map(y=><mesh key={y} position={[0,y,1.8]}><boxGeometry args={[4.7,.06,.07]}/><meshStandardMaterial color="#d3b27c"/></mesh>)}
  <mesh position={[-1.7,.12,.8]}><cylinderGeometry args={[.25,.3,.22,12]}/><meshStandardMaterial color="#b46a44"/></mesh>
  <mesh position={[-1.7,.24,.8]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.22,12]}/><meshStandardMaterial color="#d9b96b"/></mesh>
</>; }
