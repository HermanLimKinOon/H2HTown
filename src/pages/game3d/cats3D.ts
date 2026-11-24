import type { Game3DSave, GameAction3D, Obstacle3 } from './game3d';
import { getFarmHouses3D } from './farmCustomization3D';
import { HOUSE_OBSTACLES_3D } from './houseLayout3D';
export const CAT_RULES_3D={price:60,perHouse:3,total:12,feedCooldown:60000};
export const CAT_CATALOG_3D=[
  {id:'ginger',name:'Ginger',color:'#cf8745',accent:'#f7dbab',description:'A warm orange tabby',image:'/game3d/items/cat-ginger.svg'},
  {id:'grey',name:'Misty',color:'#87939f',accent:'#dfe5e8',description:'A soft silver companion',image:'/game3d/items/cat-grey.svg'},
  {id:'tuxedo',name:'Oreo',color:'#353b43',accent:'#fff4df',description:'A black-and-white companion',image:'/game3d/items/cat-tuxedo.svg'},
] as const;
export type CatCoat3D=typeof CAT_CATALOG_3D[number]['id'];
export type CatRest3D={energy:number;updatedAt:number;bedId:string|null;sleeping:boolean};
export type OwnedCat3D={id:string;coat:CatCoat3D;houseId:string|null;lastFedAt:number|null;lastPetAt:number|null;mealServedAt?:number;rest?:CatRest3D;calledAt?:number};
const reject=(state:Game3DSave,message:string):GameAction3D=>({state,changed:false,message});
export function normalizeCats3D(value:unknown,houses:string[],now:number):OwnedCat3D[] {
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),counts=new Map<string,number>();
  const timestamp=(time:unknown)=>typeof time==='number'&&Number.isFinite(time)&&time>=0&&time<=now?time:null;
  return value.slice(0,CAT_RULES_3D.total).flatMap(cat=>{
    if(!cat||typeof cat!=='object'||typeof cat.id!=='string'||!/^cat-\d+$/.test(cat.id)||ids.has(cat.id)||!CAT_CATALOG_3D.some(coat=>coat.id===cat.coat))return [];
    ids.add(cat.id);
    let houseId=typeof cat.houseId==='string'&&houses.includes(cat.houseId)?cat.houseId:null;
    if(houseId&&(counts.get(houseId)??0)>=CAT_RULES_3D.perHouse)houseId=null;
    if(houseId)counts.set(houseId,(counts.get(houseId)??0)+1);
    const rest=cat.rest&&typeof cat.rest==='object'?{energy:typeof cat.rest.energy==='number'&&Number.isFinite(cat.rest.energy)?Math.max(0,Math.min(100,cat.rest.energy)):100,updatedAt:timestamp(cat.rest.updatedAt)??now,bedId:houseId&&typeof cat.rest.bedId==='string'&&/^[\w-]{1,40}$/.test(cat.rest.bedId)?cat.rest.bedId:null,sleeping:Boolean(houseId&&cat.rest.sleeping===true&&typeof cat.rest.bedId==='string'&&/^[\w-]{1,40}$/.test(cat.rest.bedId))}:undefined;
    return [{id:cat.id,coat:cat.coat,houseId,...(rest?{rest}:{}),...(timestamp(cat.calledAt)!==null?{calledAt:timestamp(cat.calledAt)!}:{}),lastFedAt:timestamp(cat.lastFedAt),lastPetAt:timestamp(cat.lastPetAt),...(houseId&&timestamp(cat.mealServedAt)!==null?{mealServedAt:timestamp(cat.mealServedAt)!}:{})}];
  });
}
export function buyCat3D(state:Game3DSave,coat:string,price=CAT_RULES_3D.price):GameAction3D {
  const style=CAT_CATALOG_3D.find(item=>item.id===coat);
  if(!style)return reject(state,'Choose a cat');
  if(state.cats.length>=CAT_RULES_3D.total)return reject(state,'You can own up to 12 cats');
  if(!Number.isSafeInteger(price)||price<0||state.coins<price)return reject(state,'Not enough coins');
  let index=1;while(state.cats.some(cat=>cat.id===`cat-${index}`))index++;
  return {state:{...state,coins:state.coins-price,cats:[...state.cats,{id:`cat-${index}`,coat:style.id,houseId:null,lastFedAt:null,lastPetAt:null}]},changed:true,message:`${style.name} is in your bag. Enter your house and use Edit house → Cats to place your new companion.`};
}
export function placeCat3D(state:Game3DSave,id:string):GameAction3D {
  const cat=state.cats.find(item=>item.id===id);
  if(state.worldId!=='house'||!getFarmHouses3D(state.farmLayout).some(house=>house.id===state.interiorHouseId)||!cat||cat.houseId!==null)return reject(state,'Enter your house to place a cat from your bag');
  if(state.cats.filter(item=>item.houseId===state.interiorHouseId).length>=CAT_RULES_3D.perHouse)return reject(state,'This house already has 3 cats');
  return {state:{...state,cats:state.cats.map(item=>item.id===id?{...item,houseId:state.interiorHouseId}:item)},changed:true,message:'Cat placed in this house. It will wander, rest and approach you.'};
}
export function careForCat3D(state:Game3DSave,id:string,action:'feed'|'pet',now:number):GameAction3D {
  const cat=state.cats.find(item=>item.id===id);
  if(state.worldId!=='house'||!cat||cat.houseId!==state.interiorHouseId)return reject(state,'Visit the house where this cat lives');
  if(action==='feed'&&(state.inventory.petFood<1))return reject(state,'Buy pet food at Meadow Shop or the Cat Shop');
  if(action==='feed'&&cat.lastFedAt!==null&&now-cat.lastFedAt<CAT_RULES_3D.feedCooldown)return reject(state,'Your cat is still full');
  return {state:{...state,inventory:action==='feed'?{...state.inventory,petFood:state.inventory.petFood-1}:state.inventory,cats:state.cats.map(item=>item.id===id?{...item,...(action==='feed'?{lastFedAt:now}:{lastPetAt:now})}:item)},changed:true,message:action==='feed'?'Your cat enjoyed its food.':'Purr… your cat wants to stay close to you.'};
}
export function returnCat3D(state:Game3DSave,id:string):GameAction3D {
  const cat=state.cats.find(item=>item.id===id);
  if(state.worldId!=='house'||!cat||cat.houseId!==state.interiorHouseId)return reject(state,'Visit the house where this cat lives');
  return {state:{...state,cats:state.cats.map(item=>item.id===id?{...item,houseId:null}:item)},changed:true,message:'Cat returned to your bag. Place it in any of your houses.'};
}
export type CatBrain3D={x:number;z:number;yaw:number;mode:'walking'|'resting'|'following';distance:number};
export const isCatFloorClear3D=(x:number,z:number,obstacles:readonly Obstacle3[]=HOUSE_OBSTACLES_3D)=>Math.abs(x)<=5.3&&z>=-5.3&&z<=4.7&&!obstacles.some(obstacle=>obstacle.kind==='box'?Math.abs(x-obstacle.x)<obstacle.width/2+.3&&Math.abs(z-obstacle.z)<obstacle.depth/2+.3:Math.hypot(x-obstacle.x,z-obstacle.z)<obstacle.radius+.3);
export const freshCatBrain3D=(seed:number):CatBrain3D=>({x:-1.6+(seed%3)*1.3,z:1,yaw:0,mode:'resting',distance:0});
export function stepCatBrain3D(brain:CatBrain3D,player:{x:number;z:number},delta:number,time:number,seed:number,called:boolean,obstacles:readonly Obstacle3[]=HOUSE_OBSTACLES_3D):CatBrain3D {
  if(!Number.isFinite(delta)||delta<=0)return brain;
  const phase=(time+seed*11)%36,near=Math.hypot(player.x-brain.x,player.z-brain.z)<5;
  const mode=called||phase>24&&near?'following':phase<8?'resting':'walking';
  if(mode==='resting')return {...brain,mode};
  const target=mode==='following'?player:{x:Math.sin(time*.19+seed*2)*4.5,z:Math.cos(time*.13+seed)*3.6};
  const dx=target.x-brain.x,dz=target.z-brain.z,distance=Math.hypot(dx,dz),step=Math.min(delta,.1)*(mode==='following'?.95:.6);
  if(distance<(mode==='following'?1.1:.15))return {...brain,mode:'resting'};
  let x=brain.x,z=brain.z;
  const nx=x+dx/distance*step,nz=z+dz/distance*step;
  if(isCatFloorClear3D(nx,nz,obstacles)){x=nx;z=nz;}else if(isCatFloorClear3D(nx,z,obstacles))x=nx;else if(isCatFloorClear3D(x,nz,obstacles))z=nz;
  const travelled=Math.hypot(x-brain.x,z-brain.z);
  return {...brain,x,z,yaw:travelled>0?Math.atan2(x-brain.x,z-brain.z):brain.yaw,mode:travelled>0?mode:'resting',distance:brain.distance+travelled};
}
