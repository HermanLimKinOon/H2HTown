import type { Game3DSave, Obstacle3 } from './game3d';
import { LAND_TILES_3D, POND_3D, TREE_POSITIONS_3D } from './worldLayout';

export type FarmDecorationKind3D = 'fence' | 'flowers' | 'bench';
export const FARM_DECORATION_CATALOG_3D: { id: FarmDecorationKind3D; name: string; preview: string }[] = [
  { id:'fence',name:'Wooden fence',preview:'/game3d/decorations/fence.svg' },
  { id:'flowers',name:'Flower bed',preview:'/game3d/decorations/flowers.svg' },
  { id:'bench',name:'Wooden bench',preview:'/game3d/decorations/bench.svg' },
];
export type FarmEditTool3D = 'select' | 'house' | 'path' | 'grass' | FarmDecorationKind3D | 'remove';
export type FarmObjectKind3D = FarmDecorationKind3D | 'house' | 'building' | 'portal' | 'tree' | 'pond';
export const FARM_HOUSE_CATALOG_3D = [{ id: 'cottage', name: 'Starter house', preview: '/game3d/houses/cottage.svg', color: '#f6eee0', roofColor: '#d55245' }, { id: 'coop', name: 'Chicken coop', preview: '/game3d/houses/coop.svg', color: '#c88b49', roofColor: '#b34738' }] as const;
export type FarmHouseStyle3D = typeof FARM_HOUSE_CATALOG_3D[number]['id'];
export type FarmTransform3D = { x: number; z: number; rotation: number };
export type FarmLayout3D = {
  house: FarmTransform3D;
  portal: FarmTransform3D;
  pond: FarmTransform3D | null;
  buildings: Record<string, FarmTransform3D & { style: FarmHouseStyle3D }>;
  trees: Record<string, FarmTransform3D | null>;
  terrain: Record<string, 'grass' | 'path'>;
  decorations: Record<string, { kind: FarmDecorationKind3D; rotation: number }>;
};
export type FarmObject3D = FarmTransform3D & { id: string; kind: FarmObjectKind3D; label: string; canDelete: boolean; style?: FarmHouseStyle3D };
export const FARM_EDIT_TOOLS_3D: { id: FarmEditTool3D; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' }, { id: 'house', label: 'House', icon: '⌂' },
  { id: 'path', label: 'Path', icon: '▦' }, { id: 'grass', label: 'Grass', icon: '▧' },
  { id: 'fence', label: 'Fence', icon: '╫' }, { id: 'flowers', label: 'Flowers', icon: '✿' },
  { id: 'bench', label: 'Bench', icon: '▤' }, { id: 'remove', label: 'Remove object', icon: '×' },
];
export const FARM_EDIT_CATEGORIES_3D: { id: FarmEditTool3D | 'terrace'; label: string; icon: string; tools: FarmEditTool3D[] }[] = [
  ...FARM_EDIT_TOOLS_3D.slice(0,2).map(item=>({...item,tools:[item.id]})),
  { id:'terrace',label:'Terrace',icon:'▦',tools:['path','grass'] },
  ...FARM_EDIT_TOOLS_3D.slice(4).map(item=>({...item,tools:[item.id]})),
];
const baseTiles = new Map(LAND_TILES_3D.map(tile => [tile.key, tile]));
const labels = { pond: 'Pool', house: 'My House', building: 'House', portal: 'Visit H2H Town portal', tree: 'Tree', fence: 'Fence', flowers: 'Flower bed', bench: 'Bench' };
export const freshFarmLayout3D = (): FarmLayout3D => ({ pond: { x: POND_3D.x, z: POND_3D.z, rotation: 0 }, house: { x: 7, z: -2, rotation: 0 }, portal: { x: 0, z: 12, rotation: 0 }, trees: {}, buildings: {}, terrain: {}, decorations: {} });
export const quarterTurn3D = (value: number) => Number.isFinite(value) ? ((Math.round(value) % 4) + 4) % 4 : 0;
export function rotateFarmOffset3D(x: number, z: number, rotation: number) {
  switch (quarterTurn3D(rotation)) {
    case 1: return { x: z, z: -x };
    case 2: return { x: -x, z: -z };
    case 3: return { x: -z, z: x };
    default: return { x, z };
  }
}
const gridPoint = (key: string) => {
  if (!/^-?\d+,-?\d+$/.test(key)) return null;
  const [x, z] = key.split(',').map(Number);
  return key === `${x},${z}` && Math.abs(x) <= 23 && Math.abs(z) <= 23 ? { x, z } : null;
};
export function getFarmTrees3D(layout: FarmLayout3D) {
  return TREE_POSITIONS_3D.flatMap(tree => layout.trees[tree.id] === null ? [] : [{ id: tree.id, ...(layout.trees[tree.id] ?? { x: tree.x, z: tree.z, rotation: 0 }) }]);
}
export function getFarmObject3D(layout: FarmLayout3D, id: string): FarmObject3D | null {
  if(id==='pond')return layout.pond?{id,kind:'pond',...layout.pond,label:'Pool',canDelete:true}:null;
  if (id === 'house' || id === 'portal') return { id, kind: id, ...layout[id], label: labels[id], canDelete: false };
  const building=layout.buildings[id];
  if(building)return {id,kind:'building',...building,label:FARM_HOUSE_CATALOG_3D.find(style=>style.id===building.style)?.name??'House',canDelete:true};
  const tree = getFarmTrees3D(layout).find(item => item.id === id);
  if (tree) return { ...tree, kind: 'tree', label: labels.tree, canDelete: true };
  const item = layout.decorations[id], point = gridPoint(id);
  return item && point ? { id, ...point, rotation: item.rotation, kind: item.kind, label: labels[item.kind], canDelete: true } : null;
}
const inHouse = (x: number, z: number, house: FarmTransform3D) => {
  const local = rotateFarmOffset3D(x - house.x, z - house.z, -house.rotation);
  return Math.abs(local.x) <= 2.8 && local.z >= -2.5 && local.z <= 4.2;
};
export const getFarmBuildings3D = (layout: FarmLayout3D) => ['house',...Object.keys(layout.buildings)].map(id=>getFarmObject3D(layout,id)!);
export const getFarmHouses3D = (layout: FarmLayout3D) => getFarmBuildings3D(layout).filter(house=>house.style!=='coop');
const inBuildings = (x: number,z: number,layout: FarmLayout3D,excluding?: string) => getFarmBuildings3D(layout).some(house=>house.id!==excluding&&inHouse(x,z,house));
const inWater = (x: number, z: number, layout: FarmLayout3D) => !!layout.pond && Math.hypot(x - layout.pond.x, z - layout.pond.z) <= POND_3D.radius + .8;
const inArrival = (x: number, z: number) => Math.abs(x) <= 2 && z >= 6 && z <= 9;
const inPortal = (x: number, z: number, layout: FarmLayout3D) => Math.abs(x - layout.portal.x) <= 1.8 && Math.abs(z - layout.portal.z) <= 1.8;
const inNature = (x: number, z: number, layout: FarmLayout3D, excluding?: string) => (excluding !== 'pond' && inWater(x, z, layout))
  || getFarmTrees3D(layout).some(tree => tree.id !== excluding && Math.hypot(x - tree.x, z - tree.z) < 1.3);
const protectedTile = (x: number, z: number, layout: FarmLayout3D) => inNature(x,z,layout) || inBuildings(x,z,layout) || inArrival(x,z) || inPortal(x,z,layout);
export function farmHouseExit3D(layout: FarmLayout3D, id = 'house') {
  const house=layout.buildings[id]??layout.house;
  const offset = rotateFarmOffset3D(0, 3.8, house.rotation);
  return { x: Math.round((house.x + offset.x)*10)/10, y: 0, z: Math.round((house.z + offset.z)*10)/10 };
}
export function getFenceConnections3D(layout: FarmLayout3D, key: string, rotation = layout.decorations[key]?.rotation ?? 0) {
  if(layout.decorations[key]?.kind!=='fence')return [];
  const [x,z]=key.split(',').map(Number);
  return [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}]
    .filter(offset=>layout.decorations[`${x+offset.x},${z+offset.z}`]?.kind==='fence')
    .map(offset=>{const local=rotateFarmOffset3D(offset.x,offset.z,-rotation);return {x:local.x||0,z:local.z||0};});
}
export function previewFenceConnections3D(layout: FarmLayout3D, key: string, rotation: number, sourceKey?: string | null) {
  const decorations={...layout.decorations};
  if(sourceKey)delete decorations[sourceKey];
  decorations[key]={kind:'fence',rotation};
  return getFenceConnections3D({...layout,decorations},key,rotation);
}
export function farmObstacles3D(layout: FarmLayout3D): Obstacle3[] {
  return [
    ...getFarmBuildings3D(layout).map(house=>({kind:'box' as const,x:house.x,z:house.z,width:house.rotation%2?4:5,depth:house.rotation%2?5:4})), ...(layout.pond?[{...POND_3D,...layout.pond}]:[]),
    ...getFarmTrees3D(layout).map(tree => ({ kind: 'circle' as const, x: tree.x, z: tree.z, radius: .72 })),
    ...[-1.1,1.1].map(x => { const offset=rotateFarmOffset3D(x,0,layout.portal.rotation); return {kind:'circle' as const,x:layout.portal.x+offset.x,z:layout.portal.z+offset.z,radius:.15}; }),
    ...Object.entries(layout.decorations).filter(([,item]) => item.kind !== 'flowers').flatMap(([key,item]): Obstacle3[] => {
      const [x,z] = key.split(',').map(Number);
      const links=item.kind==='fence'?getFenceConnections3D(layout,key,0):[];
      if(links.length)return [
        {kind:'circle',x,z,radius:.08},
        ...links.map(link=>({kind:'box' as const,x:x+link.x*.25,z:z+link.z*.25,width:link.x ? .5 : .1,depth:link.z ? .5 : .1})),
      ];
      return [{ kind: 'box', x, z, width: item.rotation % 2 ? .4 : .94, depth: item.rotation % 2 ? .94 : .4 }];
    }),
  ];
}
export function isFarmGrass3D(layout: FarmLayout3D, key: string) { return (layout.terrain[key] ?? baseTiles.get(key)?.terrain) === 'grass'; }
export function canDigFarm3D(layout: FarmLayout3D, key: string) {
  const point=gridPoint(key);
  if (!point || !isFarmGrass3D(layout,key) || layout.decorations[key] || inPortal(point.x,point.z,layout)) return false;
  return !farmObstacles3D(layout).some(o => o.kind === 'box'
    ? Math.abs(point.x-o.x) <= o.width/2+.1 && Math.abs(point.z-o.z) <= o.depth/2+.1
    : Math.hypot(point.x-o.x,point.z-o.z) <= o.radius+.5);
}
function placementMessage(state: Pick<Game3DSave,'soil'|'plants'|'player'|'farmPausedAt'>, layout: FarmLayout3D, object: FarmObject3D) {
  const cells: {x:number;z:number}[]=[];
  const isHouse=object.kind==='house'||object.kind==='building';
  const size=isHouse?3:object.kind==='pond'?5:object.kind==='portal'?2:0;
  for(let x=-size;x<=size;x++) for(let z=-size;z<=(isHouse?4:size);z++) {
    if(object.kind==='pond'&&Math.hypot(x,z)>POND_3D.radius+.35)continue;
    const offset=rotateFarmOffset3D(x,z,object.rotation);
    cells.push({x:object.x+offset.x,z:object.z+offset.z});
  }
  for(const {x,z} of cells) {
    if(Math.abs(x)>23 || Math.abs(z)>23) return 'Keep the object and its entrance inside the farm.';
    if(inNature(x,z,layout,object.id) || inArrival(x,z)
      || inBuildings(x,z,layout,object.id)
      || (object.id!=='portal' && inPortal(x,z,layout))
      || (layout.decorations[`${x},${z}`] && `${x},${z}`!==object.id)
      || state.soil[`${x},${z}`] || state.plants[`${x},${z}`]) return 'Choose clear land away from crops, trees, water, objects and entrances.';
    if(state.farmPausedAt===null && Math.hypot(x-state.player.x,z-state.player.z)<1.4) return 'Place the object away from your character.';
  }
  return null;
}
export function normalizeFarmLayout3D(value: unknown): FarmLayout3D {
  let result=freshFarmLayout3D();
  if(!value || typeof value!=='object')return result;
  const input=value as Partial<FarmLayout3D>;
  const transform=(candidate: unknown): FarmTransform3D | null => {
    if(!candidate || typeof candidate!=='object')return null;
    const p=candidate as FarmTransform3D;
    return gridPoint(`${p.x},${p.z}`)?{x:p.x,z:p.z,rotation:quarterTurn3D(p.rotation)}:null;
  };
  result.house=transform(input.house)??result.house;
  result.portal=transform(input.portal)??result.portal;
  result.pond=input.pond===null?null:transform(input.pond)??result.pond;
  if(input.trees && typeof input.trees==='object') for(const tree of TREE_POSITIONS_3D) {
    const item=input.trees[tree.id];
    if(item===null) result.trees[tree.id]=null;
    else {const p=transform(item);if(p)result.trees[tree.id]=p;}
  }
  const emptyState={soil:{},plants:{},player:{x:0,y:0,z:8},farmPausedAt:null};
  // Validate the final arrangement together, including moved trees and entrances.
  if(['house','portal',...(result.pond&&(result.pond.x!==POND_3D.x||result.pond.z!==POND_3D.z)?['pond']:[]),...getFarmTrees3D(result).filter(t=>result.trees[t.id]).map(t=>t.id)].some(id=>placementMessage(emptyState,result,getFarmObject3D(result,id)!))) result=freshFarmLayout3D();
  if(input.buildings && typeof input.buildings==='object')for(const [id,item] of Object.entries(input.buildings).slice(0,20)) {
    const position=transform(item);
    if(!/^house-\d+$/.test(id)||!position||!item||!FARM_HOUSE_CATALOG_3D.some(style=>style.id===item.style))continue;
    const object: FarmObject3D={id,kind:'building',...position,style:item.style,label:'House',canDelete:true};
    if(!placementMessage(emptyState,result,object))result.buildings[id]={...position,style:item.style};
  }
  if(input.terrain && typeof input.terrain==='object') for(const [key,terrain] of Object.entries(input.terrain).slice(0,2401)) {
    const p=gridPoint(key);if(p && !inNature(p.x,p.z,result) && (terrain==='grass'||terrain==='path'))result.terrain[key]=terrain;
  }
  if(input.decorations && typeof input.decorations==='object') for(const [key,item] of Object.entries(input.decorations).slice(0,100)) {
    const p=gridPoint(key);
    if(p && item && ['fence','flowers','bench'].includes(item.kind) && !protectedTile(p.x,p.z,result)) result.decorations[key]={kind:item.kind,rotation:quarterTurn3D(item.rotation>=0&&item.rotation<4?item.rotation:0)};
  }
  return result;
}
const reject = (state: Game3DSave,message: string) => ({state,changed:false,message});
export function applyFarmEdit3D(state: Game3DSave, tool: FarmEditTool3D, key: string, rotation: number, houseStyle: FarmHouseStyle3D = 'cottage') {
  if(state.worldId!=='farm')return reject(state,'Only your private farm can be edited.');
  if(tool==='select')return reject(state,'Click an object to select it.');
  const point=gridPoint(key);if(!point)return reject(state,'Choose a tile inside the farm.');
  if(tool==='house')return createFarmHouse3D(state,key,rotation,houseStyle);
  if(tool==='remove')return deleteFarmObject3D(state,key);
  const layout=state.farmLayout;
  if(protectedTile(point.x,point.z,layout))return reject(state,'Keep water, trees, buildings, the portal and entrances clear.');
  if(state.soil[key]||state.plants[key])return reject(state,'Harvest crops and restore the soil before editing this tile.');
  if(layout.decorations[key])return reject(state,'Move or delete the object already on this tile.');
  if(tool==='path'||tool==='grass') {
    if((layout.terrain[key]??baseTiles.get(key)?.terrain)===tool)return reject(state,'This tile is already '+tool+'.');
    return {state:{...state,farmLayout:{...layout,terrain:{...layout.terrain,[key]:tool}}},changed:true,message:'Terrain changed.'};
  }
  if(state.farmPausedAt===null && Math.hypot(point.x-state.player.x,point.z-state.player.z)<1.4)return reject(state,'Place objects away from your character.');
  if(Object.keys(layout.decorations).length>=100)return reject(state,'Your farm has reached its 100 decoration limit.');
  return {state:{...state,farmLayout:{...layout,decorations:{...layout.decorations,[key]:{kind:tool,rotation:quarterTurn3D(rotation)}}}},changed:true,message:'Object placed.'};
}
export function moveFarmObject3D(state: Game3DSave, id: string, key: string, rotation?: number) {
  const object=getFarmObject3D(state.farmLayout,id), point=gridPoint(key);
  if(state.worldId!=='farm'||!object||!point)return reject(state,'Select an object and a tile inside your farm.');
  const next={...object,...point,rotation:quarterTurn3D(rotation??object.rotation)};
  if(next.x===object.x && next.z===object.z && next.rotation===object.rotation)return reject(state,'Choose a different tile or rotation.');
  const message=placementMessage(state,state.farmLayout,next);if(message)return reject(state,message);
  let layout={...state.farmLayout};
  const position={x:next.x,z:next.z,rotation:next.rotation};
  if(object.kind==='house'||object.kind==='portal'||object.kind==='pond')layout={...layout,[object.kind]:position};
  else if(object.kind==='building')layout={...layout,buildings:{...layout.buildings,[id]:{...position,style:object.style!}}};
  else if(object.kind==='tree')layout={...layout,trees:{...layout.trees,[id]:position}};
  else {
    const decorations={...layout.decorations};delete decorations[id];
    decorations[key]={kind:object.kind,rotation:next.rotation};layout={...layout,decorations};
  }
  return {state:{...state,farmLayout:layout},changed:true,message:'Object moved or rotated.'};
}
export function rotateFarmObject3D(state: Game3DSave, id: string) {
  const object=getFarmObject3D(state.farmLayout,id);
  return object?moveFarmObject3D(state,id,`${object.x},${object.z}`,object.rotation+1):reject(state,'Select an object to rotate.');
}
export function deleteFarmObject3D(state: Game3DSave,id: string) {
  const object=getFarmObject3D(state.farmLayout,id);
  if(state.worldId!=='farm'||!object)return reject(state,'Select an editable object to delete.');
  if(!object.canDelete)return reject(state,'This object can be moved or rotated, but cannot be erased.');
  if(object.style==='coop'&&state.chickens.some(chicken=>chicken.coopId===id))return reject(state,'Move chickens to another coop before deleting this coop.');
  const layout={...state.farmLayout};
  if(object.kind==='pond')layout.pond=null;
  else if(object.kind==='building'){layout.buildings={...layout.buildings};delete layout.buildings[id];}
  else if(object.kind==='tree')layout.trees={...layout.trees,[id]:null};
  else {layout.decorations={...layout.decorations};delete layout.decorations[id];}
  return {state:{...state,farmLayout:layout,cats:state.cats.map(cat=>cat.houseId===id?{...cat,houseId:null}:cat)},changed:true,message:'Object erased.'};
}
export function moveFarmDecoration3D(state: Game3DSave, sourceKey: string, destinationKey: string) { return moveFarmObject3D(state,sourceKey,destinationKey); }


export function createFarmHouse3D(state: Game3DSave, key: string, rotation: number, style: FarmHouseStyle3D = 'cottage') {
  const point=gridPoint(key);
  if(state.worldId!=='farm'||!point||!FARM_HOUSE_CATALOG_3D.some(item=>item.id===style))return reject(state,'Choose a house style and a tile inside your farm.');
  if(Object.keys(state.farmLayout.buildings).length>=20)return reject(state,'Your farm has reached its 20-house limit.');
  let index=1;while(state.farmLayout.buildings[`house-${index}`])index++;
  const id=`house-${index}`;
  const object: FarmObject3D={id,kind:'building',...point,rotation:quarterTurn3D(rotation),style,label:'House',canDelete:true};
  const message=placementMessage(state,state.farmLayout,object);if(message)return reject(state,message);
  return {state:{...state,farmLayout:{...state.farmLayout,buildings:{...state.farmLayout.buildings,[id]:{...point,rotation:object.rotation,style}}}},changed:true,message:'House built. Select it to move, rotate or delete it.'};
}

export function getFarmObjectAtTile3D(layout: FarmLayout3D,key: string): FarmObject3D | null {
  const point=gridPoint(key);if(!point)return null;
  const decoration=getFarmObject3D(layout,key);if(decoration)return decoration;
  for(const house of getFarmBuildings3D(layout)) {
    const local=rotateFarmOffset3D(point.x-house.x,point.z-house.z,-house.rotation);
    if(Math.abs(local.x)<=2.5&&Math.abs(local.z)<=2)return house;
  }
  const tree=getFarmTrees3D(layout).find(item=>item.x===point.x&&item.z===point.z);
  if(tree)return getFarmObject3D(layout,tree.id);
  if(layout.pond&&Math.hypot(point.x-layout.pond.x,point.z-layout.pond.z)<=POND_3D.radius+.35)return getFarmObject3D(layout,'pond');
  const portal=rotateFarmOffset3D(point.x-layout.portal.x,point.z-layout.portal.z,-layout.portal.rotation);
  return Math.abs(portal.x)<=1.3&&Math.abs(portal.z)<=.5?getFarmObject3D(layout,'portal'):null;
}
