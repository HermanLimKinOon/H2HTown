import type { Game3DSave,GameAction3D } from './game3d';
import { CAT_RULES_3D } from './cats3D';
import { catEnergy3D,setCatRest3D } from './catSleep3D';
export type HouseActionTarget3D={kind:'cat'|'bowl'|'furniture'|'mirror'|'exit';id:string;x:number;z:number;width?:number;depth?:number};
export type ObjectActionId3D='pet'|'call'|'wake'|'return'|'feed'|'callAll'|'customize'|'exit';
export type ObjectActionChoice3D={id:ObjectActionId3D;label:string;icon:string;disabled?:boolean;reason?:string;danger?:boolean};
export function houseObjectActions3D(state:Game3DSave,target:HouseActionTarget3D,now:number):ObjectActionChoice3D[] {
  const near=Math.hypot(state.player.x-target.x,state.player.z-target.z)<=2;
  if(target.kind==='cat'){
    const cat=state.cats.find(cat=>cat.id===target.id&&cat.houseId===state.interiorHouseId);if(!cat)return [];
    const sleeping=cat.rest?.sleeping===true;
    return [
      {id:'pet',label:'Pet',icon:'♡',disabled:!near,reason:!near?'Walk closer':undefined},
      {id:'call',label:'Call over',icon:'♪',disabled:sleeping||cat.mealServedAt!==undefined,reason:sleeping?'Sleeping':cat.mealServedAt!==undefined?'Eating first':undefined},
      ...(cat.rest?.bedId?[{id:'wake' as const,label:'Wake up',icon:'☀'}]:[]),
      {id:'return',label:'Return to bag',icon:'▢',disabled:cat.mealServedAt!==undefined,reason:cat.mealServedAt!==undefined?'Finish eating first':undefined},
    ];
  }
  if(target.kind==='bowl'){
    const cats=state.cats.filter(cat=>cat.houseId===state.interiorHouseId);
    const hungry=cats.some(cat=>cat.mealServedAt===undefined&&(cat.lastFedAt===null||now-cat.lastFedAt>=CAT_RULES_3D.feedCooldown));
    return [{id:'feed',label:'Serve food',icon:'◡',disabled:!near||!hungry||state.inventory.petFood<1,reason:!near?'Walk closer':!hungry?'Cats are full or eating':state.inventory.petFood<1?'Buy pet food':undefined},
      {id:'callAll',label:'Call cats',icon:'♪',disabled:!cats.some(cat=>!cat.rest?.sleeping&&cat.mealServedAt===undefined),reason:'Awake cats only'}];
  }
  if(target.kind==='mirror')return [{id:'customize',label:'Change appearance',icon:'♧'}];
  if(target.kind==='exit')return [{id:'exit',label:'Exit house',icon:'↗'}];
  const furniture=state.houseLayouts[state.interiorHouseId]?.furniture[target.id];
  const occupant=furniture?.kind==='catBed'?state.cats.find(cat=>cat.houseId===state.interiorHouseId&&cat.rest?.bedId===target.id):null;
  return [...(occupant?[{id:'wake' as const,label:'Wake cat',icon:'☀'}]:[])];
}
const reject=(state:Game3DSave,message:string):GameAction3D=>({state,changed:false,message});
export function callCat3D(state:Game3DSave,id:string,now:number):GameAction3D {
  const cat=state.cats.find(cat=>cat.id===id);
  if(state.worldId!=='house'||!cat||cat.houseId!==state.interiorHouseId)return reject(state,'Visit the house where this cat lives.');
  if(cat.rest?.sleeping||cat.mealServedAt!==undefined)return reject(state,'Let your cat finish sleeping or eating first.');
  const ready=cat.rest?.bedId?setCatRest3D(state,id,{energy:catEnergy3D(cat,now),bedId:null,sleeping:false},now):state;
  return {state:{...ready,cats:ready.cats.map(cat=>cat.id===id?{...cat,calledAt:now}:cat)},changed:true,message:'You called your cat over.'};
}
export function wakeCat3D(state:Game3DSave,id:string,now:number):GameAction3D {
  const cat=state.cats.find(cat=>cat.id===id);
  if(state.worldId!=='house'||!cat||cat.houseId!==state.interiorHouseId||!cat.rest?.bedId)return reject(state,'This cat is already awake.');
  const awake=setCatRest3D(state,id,{energy:catEnergy3D(cat,now),bedId:null,sleeping:false},now);
  return callCat3D(awake,id,now);
}
