import {KLShophouse3D,KLTwinTowerShop3D,KLPalmTree3D,KLFountain3D} from './KualaLumpurTown3D';
import {Text} from '@react-three/drei';
import {FarmPortalVisual3D} from './FarmObjectVisual3D';
import {TOWN_BUILDINGS_3D,TOWN_NPCS_3D} from './townLayout3D';
import {TOWN_BUILDING_CATALOG_3D,type TownEditObject3D} from './townCustomization3D';
export default function TownObjectVisual3D({object}:{object:TownEditObject3D}){
 if(object.kind==='portal')return <FarmPortalVisual3D/>;
 if(object.style==='plot')return <>
  <mesh position={[0,.025,0]} receiveShadow><boxGeometry args={[5,.05,4]}/><meshStandardMaterial color="#d7d09e" transparent opacity={.65}/></mesh>
  {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={`${x}:${z}`} position={[x*2.4,.3,z*1.9]}><boxGeometry args={[.1,.6,.1]}/><meshStandardMaterial color="#9b733d"/></mesh>))}
  <Text position={[0,.07,0]} rotation={[-Math.PI/2,0,0]} fontSize={.3} maxWidth={4} color="#315d50" anchorX="center" anchorY="middle">{object.name}</Text>
 </>;
 if(object.kind==='shop'||object.kind==='building'){
  const spec=TOWN_BUILDINGS_3D.find(b=>b.id===object.id),style=TOWN_BUILDING_CATALOG_3D.find(s=>s.id===object.style);
  const color=spec?.color??style?.color??'#e9dfcf',roof=style?.roof??(object.id==='cats'?'#946d96':object.id==='h2h'?'#c66557':'#497b74');
  if(object.id==='h2h'||object.style==='h2h')return <KLTwinTowerShop3D name={object.name}/>;
  return <KLShophouse3D name={object.name} color={color} accent={roof}/>;
 }
 if(object.kind==='fountain')return <KLFountain3D/>;
 if(object.kind==='tree')return <KLPalmTree3D/>;
 const npc=TOWN_NPCS_3D.find(n=>`npc-${n.id}`===object.id);
 return <><mesh position={[0,.9,0]} castShadow><capsuleGeometry args={[.3,.65,4,8]}/><meshStandardMaterial color={npc?.color??'#da795d'}/></mesh><mesh position={[0,1.6,0]} castShadow><sphereGeometry args={[.3,12,8]}/><meshStandardMaterial color="#d6a077"/></mesh></>;
}
