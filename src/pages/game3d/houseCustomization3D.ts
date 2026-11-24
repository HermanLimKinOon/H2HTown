import type { Game3DSave, Obstacle3, Position3 } from './game3d';
import { HOUSE_OBSTACLES_3D } from './houseLayout3D';
export const HOUSE_FURNITURE_CATEGORIES_3D=[
  {id:'beds',name:'Beds',image:'/game3d/furniture/bed.svg'},
  {id:'storage',name:'Storage',image:'/game3d/furniture/cabinet.svg'},
  {id:'tables',name:'Tables',image:'/game3d/furniture/table.svg'},
  {id:'seating',name:'Seating',image:'/game3d/furniture/chair.svg'},
  {id:'decor',name:'Decor',image:'/game3d/furniture/rug.svg'},
  {id:'pets',name:'Pet furniture',image:'/game3d/furniture/cat-bed.svg'},
] as const;
export type HouseFurnitureCategory3D=typeof HOUSE_FURNITURE_CATEGORIES_3D[number]['id'];
// Assign new furniture a category; the house editor groups its preview automatically.
export const HOUSE_FURNITURE_3D=[
  {id:'bed',category:'beds',name:'Bed',width:2.2,depth:3.8,height:1.1,solid:true,icon:'▰',image:'/game3d/furniture/bed.svg'},
  {id:'cabinet',category:'storage',name:'Cabinet',width:3.1,depth:1.6,height:1.3,solid:true,icon:'▤',image:'/game3d/furniture/cabinet.svg'},
  {id:'table',category:'tables',name:'Table',width:2.1,depth:1.5,height:1.2,solid:true,icon:'⊓',image:'/game3d/furniture/table.svg'},
  {id:'rug',category:'decor',name:'Rug',width:3.8,depth:3.8,height:.03,solid:false,icon:'▦',image:'/game3d/furniture/rug.svg'},
  {id:'chair',category:'seating',name:'Chair',width:.9,depth:.9,height:1.3,solid:true,icon:'♧',image:'/game3d/furniture/chair.svg'},
  {id:'catBed',category:'pets',name:'Cat bed',width:1.1,depth:.9,height:.25,solid:false,icon:'◡',image:'/game3d/furniture/cat-bed.svg'},
] as const satisfies readonly {id:string;category:HouseFurnitureCategory3D;name:string;width:number;depth:number;height:number;solid:boolean;icon:string;image:string}[];
export type HouseFurnitureKind3D=typeof HOUSE_FURNITURE_3D[number]['id'];
export type HouseTransform3D={x:number;z:number;rotation:number};
export type HouseFurniture3D=HouseTransform3D & {kind:HouseFurnitureKind3D};
export type HouseLayout3D={furniture:Record<string,HouseFurniture3D>;catPositions:Record<string,HouseTransform3D>};
export const freshHouseLayout3D=():HouseLayout3D=>({furniture:{bed:{kind:'bed',x:-4,z:-3.4,rotation:0},cabinet:{kind:'cabinet',x:3.5,z:-3.8,rotation:0},table:{kind:'table',x:3.5,z:0,rotation:0},rug:{kind:'rug',x:0,z:0,rotation:0}},catPositions:{}});
export const DEFAULT_HOUSE_LAYOUT_3D=freshHouseLayout3D();
export const houseLayoutFor3D=(state:Pick<Game3DSave,'houseLayouts'|'interiorHouseId'>)=>state.houseLayouts[state.interiorHouseId]??DEFAULT_HOUSE_LAYOUT_3D;
export const furnitureSize3D=(item:HouseFurniture3D)=>{const spec=HOUSE_FURNITURE_3D.find(s=>s.id===item.kind)!;return {width:item.rotation%2?spec.depth:spec.width,depth:item.rotation%2?spec.width:spec.depth,height:spec.height,solid:spec.solid};};
export function houseObstacles3D(layout:HouseLayout3D):Obstacle3[] {
  return [...HOUSE_OBSTACLES_3D.slice(0,5),...Object.values(layout.furniture).filter(item=>furnitureSize3D(item).solid).map(item=>{const size=furnitureSize3D(item);return {kind:'box' as const,x:item.x,z:item.z,width:size.width,depth:size.depth};})];
}
const overlaps=(x:number,z:number,w:number,d:number,ox:number,oz:number,ow:number,od:number)=>Math.abs(x-ox)<(w+ow)/2+.08&&Math.abs(z-oz)<(d+od)/2+.08;
function placementError(layout:HouseLayout3D,item:HouseFurniture3D|HouseTransform3D,id:string,cat=false) {
  const size=cat?{width:.7,depth:.7,solid:true}:furnitureSize3D(item as HouseFurniture3D);
  if(Math.abs(item.x)+size.width/2>5.5||Math.abs(item.z)+size.depth/2>5.5)return 'Keep furniture and cats inside the room.';
  if(overlaps(item.x,item.z,size.width,size.depth,0,4.8,2.4,2.4))return 'Keep the doorway clear.';
  if(overlaps(item.x,item.z,size.width,size.depth,-5.5,1.5,1.1,2.3))return 'Keep access to the mirror clear.';
  if(size.solid&&Object.entries(layout.furniture).some(([key,other])=>key!==id&&furnitureSize3D(other).solid&&overlaps(item.x,item.z,size.width,size.depth,other.x,other.z,furnitureSize3D(other).width,furnitureSize3D(other).depth)))return 'Choose space clear of other furniture.';
  if(size.solid&&Object.entries(layout.catPositions).some(([key,other])=>key!==id&&overlaps(item.x,item.z,size.width,size.depth,other.x,other.z,.7,.7)))return 'Leave room for the cat.';
  return null;
}
const point=(key:string)=>{if(!/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(key))return null;const [x,z]=key.split(',').map(Number);return Math.abs(x)<=5&&Math.abs(z)<=5?{x,z}:null;};
const rotation=(value:number)=>Number.isFinite(value)?((Math.round(value)%4)+4)%4:0;
const reject=(layout:HouseLayout3D,message:string)=>({layout,changed:false,message});
export function editHouseFurniture3D(layout:HouseLayout3D,kind:string,key:string,angle:number) {
  const p=point(key),spec=HOUSE_FURNITURE_3D.find(item=>item.id===kind);
  if(!p||!spec)return reject(layout,'Choose furniture and a floor tile inside the house.');
  if(Object.keys(layout.furniture).length>=40)return reject(layout,'This house has reached its 40-furniture limit.');
  let index=1;while(layout.furniture[`furniture-${index}`])index++;
  const id=`furniture-${index}`,item={...p,kind:spec.id,rotation:rotation(angle)},message=placementError(layout,item,id);
  return message?reject(layout,message):{layout:{...layout,furniture:{...layout.furniture,[id]:item}},changed:true,message:'Furniture placed.'};
}
export function moveHouseObject3D(layout:HouseLayout3D,id:string,key:string,angle:number) {
  const p=point(key),previous=layout.furniture[id];if(!p||!previous)return reject(layout,'Select furniture to move.');
  const item={...previous,...p,rotation:rotation(angle)},message=placementError(layout,item,id);
  return message?reject(layout,message):{layout:{...layout,furniture:{...layout.furniture,[id]:item}},changed:true,message:'Furniture moved.'};
}
export function deleteHouseFurniture3D(layout:HouseLayout3D,id:string) {
  if(!Object.hasOwn(layout.furniture,id))return reject(layout,'Select furniture to delete.');
  const furniture={...layout.furniture};delete furniture[id];
  return {layout:{...layout,furniture},changed:true,message:'Furniture deleted. Undo restores it.'};
}
export function moveHouseCat3D(layout:HouseLayout3D,id:string,key:string,angle:number) {
  const p=point(key);if(!p||!/^cat-\d+$/.test(id))return reject(layout,'Choose a cat and a clear floor tile.');
  const item={...p,rotation:rotation(angle)},message=placementError(layout,item,id,true);
  return message?reject(layout,message):{layout:{...layout,catPositions:{...layout.catPositions,[id]:item}},changed:true,message:'Cat placed.'};
}
export function normalizeHouseLayout3D(value:unknown):HouseLayout3D {
  if(!value||typeof value!=='object')return freshHouseLayout3D();
  const input=value as Partial<HouseLayout3D>,result:HouseLayout3D={furniture:{},catPositions:{}};
  if(!input.furniture||typeof input.furniture!=='object')return freshHouseLayout3D();
  const valid=(item:HouseTransform3D)=>item&&Number.isFinite(item.x)&&Number.isFinite(item.z)&&Math.abs(item.x)<=5.5&&Math.abs(item.z)<=5.5;
  for(const [id,item] of Object.entries(input.furniture).slice(0,40))if(/^[\w-]{1,40}$/.test(id)&&valid(item)&&HOUSE_FURNITURE_3D.some(s=>s.id===item.kind)) {
    const furniture={kind:item.kind,x:item.x,z:item.z,rotation:rotation(item.rotation)};
    if(!placementError(result,furniture,id))result.furniture[id]=furniture;
  }
  if(input.catPositions&&typeof input.catPositions==='object')for(const [id,item] of Object.entries(input.catPositions).slice(0,12))if(/^cat-\d+$/.test(id)&&valid(item)) {
    const position={x:item.x,z:item.z,rotation:rotation(item.rotation)};if(!placementError(result,position,id,true))result.catPositions[id]=position;
  }
  return result;
}
export function resolveHousePlayer3D(state:Game3DSave):Game3DSave {
  if(state.worldId!=='house')return state;
  const obstacles=houseObstacles3D(houseLayoutFor3D(state));
  const clear=(p:Position3)=>!obstacles.some(o=>o.kind==='box'?Math.abs(p.x-o.x)<o.width/2+.46&&Math.abs(p.z-o.z)<o.depth/2+.46:Math.hypot(p.x-o.x,p.z-o.z)<o.radius+.46);
  if(clear(state.player))return state;
  const points:Position3[]=[];for(let x=-5;x<=5;x++)for(let z=-5;z<=4;z++)points.push({x,y:0,z});
  points.sort((a,b)=>Math.hypot(a.x-state.player.x,a.z-state.player.z)-Math.hypot(b.x-state.player.x,b.z-state.player.z));
  const player=points.find(clear)??{x:0,y:0,z:3.5};return {...state,player,worldPositions:{...state.worldPositions,house:player}};
}
