import type { Game3DSave, GameAction3D } from './game3d';

// Tune prices, capacity and production time here. Saved eggSeconds can be adjusted in the bag.
export const POULTRY_RULES_3D = { chickenBuy:30, feedBuy:5, eggSell:5, capacity:6, eggSeconds:180 };
export type Chicken3D = { id:string; coopId:string; fedAt:number|null };
const unchanged=(state:Game3DSave,message:string):GameAction3D=>({state,changed:false,message});
const coopExists=(state:Game3DSave,id:string)=>state.farmLayout.buildings[id]?.style==='coop';
export const coopChickens3D=(state:Game3DSave,id:string)=>state.chickens.filter(chicken=>chicken.coopId===id);
export const eggReady3D=(state:Game3DSave,chicken:Chicken3D,now:number)=>chicken.fedAt!==null&&(state.farmPausedAt??now)-chicken.fedAt>=state.growth.eggSeconds*1000;
export function normalizeChickens3D(value:unknown,coops:Record<string,{style:string}>,now:number):Chicken3D[] {
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),counts=new Map<string,number>();
  return value.slice(0,120).flatMap(item=>{
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^chicken-\d+$/.test(item.id)||ids.has(item.id)||typeof item.coopId!=='string'||coops[item.coopId]?.style!=='coop'||(counts.get(item.coopId)??0)>=POULTRY_RULES_3D.capacity)return [];
    ids.add(item.id);counts.set(item.coopId,(counts.get(item.coopId)??0)+1);
    return [{id:item.id,coopId:item.coopId,fedAt:typeof item.fedAt==='number'&&Number.isFinite(item.fedAt)&&item.fedAt>=0&&item.fedAt<=now?item.fedAt:null}];
  });
}
export function buyPoultryItem3D(state:Game3DSave,item:'chicken'|'chickenFeed'):GameAction3D {
  const price=item==='chicken'?POULTRY_RULES_3D.chickenBuy:POULTRY_RULES_3D.feedBuy;
  if(state.coins<price)return unchanged(state,'Not enough coins');
  let bag=state.bag;
  if(!bag.includes(item)) { const slot=bag.indexOf(null);if(slot<0)return unchanged(state,'Your bag is full');bag=[...bag];bag[slot]=item; }
  return {state:{...state,bag,coins:state.coins-price,inventory:{...state.inventory,[item]:state.inventory[item]+1}},changed:true,message:item==='chicken'?'Chicken added to your bag. Place it in a coop on your farm.':'Bought 1 chicken feed'};
}
export function placeChicken3D(state:Game3DSave,coopId:string):GameAction3D {
  if(state.worldId!=='farm'||!coopExists(state,coopId))return unchanged(state,'Choose a chicken coop on your farm');
  if(coopChickens3D(state,coopId).length>=POULTRY_RULES_3D.capacity)return unchanged(state,'This coop is full (6 chickens)');
  if(state.inventory.chicken<1)return unchanged(state,'Buy a chicken at Meadow Shop first');
  let index=1;while(state.chickens.some(chicken=>chicken.id===`chicken-${index}`))index++;
  return {state:{...state,chickens:[...state.chickens,{id:`chicken-${index}`,coopId,fedAt:null}],inventory:{...state.inventory,chicken:state.inventory.chicken-1}},changed:true,message:'Chicken placed in the coop. Feed it to start an egg.'};
}
export function feedChickens3D(state:Game3DSave,coopId:string,now:number):GameAction3D {
  if(state.worldId!=='farm'||!coopExists(state,coopId))return unchanged(state,'Choose a chicken coop');
  const hungry=coopChickens3D(state,coopId).filter(chicken=>chicken.fedAt===null);
  if(!hungry.length)return unchanged(state,'No hungry chickens. Collect ready eggs before feeding again.');
  if(state.inventory.chickenFeed<hungry.length)return unchanged(state,`Need ${hungry.length} chicken feed to feed all hungry chickens`);
  const ids=new Set(hungry.map(chicken=>chicken.id));
  return {state:{...state,chickens:state.chickens.map(chicken=>ids.has(chicken.id)?{...chicken,fedAt:state.farmPausedAt??now}:chicken),inventory:{...state.inventory,chickenFeed:state.inventory.chickenFeed-hungry.length}},changed:true,message:`Fed ${hungry.length} chickens. Eggs will be ready in ${state.growth.eggSeconds} seconds.`};
}
export function collectEggs3D(state:Game3DSave,coopId:string,now:number):GameAction3D {
  if(state.worldId!=='farm'||!coopExists(state,coopId))return unchanged(state,'Choose a chicken coop');
  const ready=coopChickens3D(state,coopId).filter(chicken=>eggReady3D(state,chicken,now));
  if(!ready.length)return unchanged(state,'No eggs ready yet. Feed hungry chickens and allow time to lay.');
  let bag=state.bag;
  if(!bag.includes('egg')){const slot=bag.indexOf(null);if(slot<0)return unchanged(state,'Make room in your bag for eggs');bag=[...bag];bag[slot]='egg';}
  const ids=new Set(ready.map(chicken=>chicken.id));
  return {state:{...state,bag,chickens:state.chickens.map(chicken=>ids.has(chicken.id)?{...chicken,fedAt:null}:chicken),inventory:{...state.inventory,egg:state.inventory.egg+ready.length}},changed:true,message:`Collected ${ready.length} eggs into your bag. Feed the chickens again for the next eggs.`};
}
export function returnChickenToBag3D(state:Game3DSave,coopId:string):GameAction3D {
  if(state.worldId!=='farm'||!coopExists(state,coopId))return unchanged(state,'Choose a chicken coop');
  const chicken=coopChickens3D(state,coopId).find(item=>item.fedAt===null);
  if(!chicken)return unchanged(state,'Collect eggs first. Only an unfed chicken can return to the bag.');
  let bag=state.bag;
  if(!bag.includes('chicken')){const slot=bag.indexOf(null);if(slot<0)return unchanged(state,'Your bag is full');bag=[...bag];bag[slot]='chicken';}
  return {state:{...state,bag,chickens:state.chickens.filter(item=>item.id!==chicken.id),inventory:{...state.inventory,chicken:state.inventory.chicken+1}},changed:true,message:'Chicken returned to your bag. You can place it in another coop.'};
}
