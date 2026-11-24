import CoopChickens3D from './CoopChickens3D';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { getCropStage3D, getTreeStage3D, type Game3DSave } from './game3d';
import { LAND_TILES_3D, SHOPS_3D } from './worldLayout';
import { isCameraDrag3D } from './cameraControls3D';
import LandTiles3D from './LandTiles3D';
import FarmDecorations3D from './FarmDecorations3D';
import { getFarmTrees3D } from './farmCustomization3D';
import { FarmTreeVisual3D, FarmHouseVisual3D, FarmPoolVisual3D } from './FarmObjectVisual3D';

function Tree3D({ id, x, z, save, now, onSelect, rotation, onHover }: { onHover?: (id: string | null) => void; rotation: number; id: string; x: number; z: number; save: Game3DSave; now: number; onSelect: (id: string) => void }) {
  const choppedAt = save.choppedTrees[id];
  const stage = typeof choppedAt === 'number' ? getTreeStage3D(choppedAt, save.growth.treeSeconds, now) : 3;
  return (
    <group onPointerOver={event=>{if(onHover){event.stopPropagation();onHover(id);}}} onPointerOut={()=>onHover?.(null)} position={[x, 0, z]} rotation={[0,rotation*Math.PI/2,0]} onClick={event => { event.stopPropagation(); if (event.nativeEvent.button === 0 && !isCameraDrag3D(event.delta)) onSelect(id); }}>
      <FarmTreeVisual3D stage={stage}/>
    </group>
  );
}

function ShopBuilding({ shop, onSelect, editing, rotation, onHover }: {
  onHover?: (id: string | null) => void;
  rotation: number;
  editing: boolean; shop: (typeof SHOPS_3D)[number]; onSelect: (id: 'meadow' | 'h2h') => void }) {
  return (
    <group onPointerOver={event=>{if(onHover){event.stopPropagation();onHover('house');}}} onPointerOut={()=>onHover?.(null)} position={[shop.x, 0, shop.z]} rotation={[0,rotation*Math.PI/2,0]} onClick={event => { event.stopPropagation(); if (event.nativeEvent.button === 0 && !isCameraDrag3D(event.delta)) onSelect(shop.id); }}>
      <FarmHouseVisual3D/>
      {!editing && shop.id === 'h2h' && <Html zIndexRange={[12,1]} position={[0, 3.8, 0]} center><button type="button" onClick={() => onSelect(shop.id)} className="game-world-label">My House · Enter</button></Html>}
    </group>
  );
}

function Crop3D({ stage }: { stage: 1 | 2 | 3 }) {
  if (stage === 1) return <group position={[0, 0.025, 0]}>
    {([-0.16, 0, 0.16] as const).map((offset, index) => <mesh key={offset} position={[offset, 0, index % 2 ? 0.09 : -0.06]} scale={[1, 0.45, 0.65]} rotation={[0, index * 0.8, 0]} castShadow>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshStandardMaterial color="#c8a46a" roughness={1} />
    </mesh>)}
  </group>;
  return <group position={[0, 0.14, 0]}>
    <mesh position={[0, 0.12 + stage * 0.07, 0]} castShadow><coneGeometry args={[0.08 + stage * 0.035, 0.25 + stage * 0.12, 8]} /><meshStandardMaterial color="#f1842f" /></mesh>
    {Array.from({ length: stage + 1 }, (_, index) => <mesh key={index} position={[0, 0.35 + stage * 0.1, 0]} rotation={[0.35, index * (Math.PI * 2 / (stage + 1)), 0.45]} castShadow><boxGeometry args={[0.08, 0.36, 0.04]} /><meshStandardMaterial color="#4b9e46" /></mesh>)}
  </group>;
}

export default function World3D({ save, now, onGroundSelect, onTreeSelect, onShopSelect, onHover, onObjectSelect, movingSelection, onHouseEnter, onPaint, onObjectHover, onCoopSelect, editing = false }: {
  onHouseEnter: (id: string) => void;
  onCoopSelect: (id:string)=>void;
  onPaint?: (key: string, buttons: number) => void;
  onObjectHover?: (id: string | null) => void;
  movingSelection?: string | null;
  onObjectSelect: (key: string) => void;
  editing?: boolean;
  onHover?: (key: string | null) => void;
  save: Game3DSave;
  now: number;
  onGroundSelect: (key: string, button: number, point?:{x:number;z:number}) => void;
  onTreeSelect: (id: string) => void;
  onShopSelect: (id: 'meadow' | 'h2h') => void;
}) {
  const dispatchGroundSelect = (key: string, button: number, point?:{x:number;z:number}) => {
    if (button === 2) window.setTimeout(() => onGroundSelect(key, button), 150);
    else onGroundSelect(key, button,point);
  };
  const selectGround = (event: ThreeEvent<MouseEvent>, button: number) => {
    event.stopPropagation();
    if (!isCameraDrag3D(event.delta)) dispatchGroundSelect(`${Math.round(event.point.x)},${Math.round(event.point.z)}`, button,{x:event.point.x,z:event.point.z});
  };
  return <>
    <color attach="background" args={['#b9def0']} />
    <fog attach="fog" args={editing ? ['#b9def0', 150, 250] : ['#b9def0', 28, 60]} />
    <hemisphereLight intensity={1.35} color="#fff7dd" groundColor="#557346" />
    <directionalLight position={[12, 20, 8]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28} />
    <LandTiles3D terrain={save.farmLayout.terrain} onSelect={selectGround} onHover={onHover} onPaint={onPaint} />
    <FarmDecorations3D onHover={onObjectHover} hiddenObject={movingSelection} layout={save.farmLayout} onSelect={key => editing ? onObjectSelect(key) : onGroundSelect(key, 0)} />
    {save.farmLayout.pond&&movingSelection!=='pond'&&<group position={[save.farmLayout.pond.x,0,save.farmLayout.pond.z]} rotation={[0,save.farmLayout.pond.rotation*Math.PI/2,0]}
      onPointerOver={event=>{if(onObjectHover){event.stopPropagation();onObjectHover('pond');}}} onPointerOut={()=>onObjectHover?.(null)}
      onClick={event=>{if(editing&&event.nativeEvent.button===0&&!isCameraDrag3D(event.delta)){event.stopPropagation();onObjectSelect('pond');}}}>
      <FarmPoolVisual3D/>
    </group>}
    {movingSelection !== 'house' && SHOPS_3D.map(shop => <ShopBuilding onHover={onObjectHover} rotation={save.farmLayout.house.rotation} key={shop.id} editing={editing} shop={{ ...shop, ...save.farmLayout.house }} onSelect={editing ? () => onObjectSelect('house') : onShopSelect} />)}
    {Object.entries(save.farmLayout.buildings).filter(([id])=>id!==movingSelection).map(([id,house])=><group key={id} position={[house.x,0,house.z]} rotation={[0,house.rotation*Math.PI/2,0]} onPointerOver={event=>{if(onObjectHover){event.stopPropagation();onObjectHover(id);}}} onPointerOut={()=>onObjectHover?.(null)} onClick={event=>{event.stopPropagation();if(event.nativeEvent.button===0&&!isCameraDrag3D(event.delta)){if(editing)onObjectSelect(id);else if(house.style==='coop')onCoopSelect(id);else onHouseEnter(id);}}}>
      <FarmHouseVisual3D style={house.style}/>
      {house.style==='coop'&&<CoopChickens3D save={save} coopId={id} now={now} editing={editing}/>}
      {!editing&&<Html zIndexRange={[12,1]} position={[0,3.8,0]} center><button type="button" onClick={()=>house.style==='coop'?onCoopSelect(id):onHouseEnter(id)} className="game-world-label">{house.style==='coop'?'Chicken coop · Manage':'House · Enter'}</button></Html>}
    </group>)}
    {getFarmTrees3D(save.farmLayout).filter(tree => tree.id !== movingSelection).map(tree => <Tree3D onHover={onObjectHover} key={tree.id} {...tree} save={save} now={now} onSelect={editing ? () => onObjectSelect(tree.id) : onTreeSelect} />)}
    {LAND_TILES_3D.filter(cell => save.soil[cell.key] || save.plants[cell.key]).map(cell => {
      const soil = save.soil[cell.key];
      const storedPlant = save.plants[cell.key];
      const plant = storedPlant ? getCropStage3D(storedPlant, save.growth.carrotSeconds, now) : undefined;
      if (!soil && !plant) return null;
      return <group key={cell.key} position={[cell.x, 0.035, cell.z]} onClick={event => { event.stopPropagation(); if (event.nativeEvent.button === 0 && !isCameraDrag3D(event.delta)) dispatchGroundSelect(cell.key, 0); }} onContextMenu={event => { event.stopPropagation(); if (!isCameraDrag3D(event.delta)) dispatchGroundSelect(cell.key, 2); }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[0.92, 0.92]} /><meshStandardMaterial color={(plant ? plant.watered : soil?.watered) ? '#654934' : '#80593b'} roughness={1} /></mesh>
        {plant && <Crop3D stage={plant.stage} />}
      </group>;
    })}
    {Array.from({ length: 44 }, (_, index) => {
      const x = ((index * 7) % 43) - 21;
      const z = ((index * 13) % 41) - 20;
      return <group key={index} position={[x, 0.04, z]}>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.018, 0.025, 0.32, 5]} /><meshStandardMaterial color="#407d3d" /></mesh>
        <mesh position={[0, 0.34, 0]}><sphereGeometry args={[0.08, 6, 4]} /><meshStandardMaterial color={index % 2 ? '#fff2d0' : '#f59bb1'} /></mesh>
      </group>;
    })}
  </>;
}
