import type { Game3DSave } from './game3d';
import type { OwnedCat3D,CatRest3D } from './cats3D';
import { houseObstacles3D,type HouseLayout3D } from './houseCustomization3D';
import { findCatMealPath3D } from './petFeeding3D';
// Seconds to become tired, and seconds to recover from tired to fully rested.
export const CAT_SLEEP_RULES_3D={awakeSeconds:180,sleepSeconds:30,tiredEnergy:25};
export function catEnergy3D(cat:Pick<OwnedCat3D,'rest'|'houseId'>,now:number):number {
  if(!cat.rest)return 100;
  if(cat.houseId===null)return cat.rest.energy;
  const seconds=Math.max(0,now-cat.rest.updatedAt)/1000;
  const rate=cat.rest.sleeping?(100-CAT_SLEEP_RULES_3D.tiredEnergy)/CAT_SLEEP_RULES_3D.sleepSeconds:-(100-CAT_SLEEP_RULES_3D.tiredEnergy)/CAT_SLEEP_RULES_3D.awakeSeconds;
  return Math.max(0,Math.min(100,cat.rest.energy+seconds*rate));
}
export function setCatRest3D(state:Game3DSave,id:string,rest:Omit<CatRest3D,'updatedAt'>,now:number):Game3DSave {
  if(!Number.isFinite(now)||!Number.isFinite(rest.energy))return state;
  const current=state.cats.find(cat=>cat.id===id);
  if(!current)return state;
  if(rest.bedId&&state.cats.some(cat=>cat.id!==id&&cat.houseId===current.houseId&&cat.rest?.bedId===rest.bedId))return state;
  return {...state,cats:state.cats.map(cat=>cat.id===id?{...cat,rest:{energy:Math.max(0,Math.min(100,rest.energy)),updatedAt:now,bedId:rest.bedId,sleeping:rest.sleeping}}:cat)};
}
export function findCatBed3D(id:string,cats:Pick<OwnedCat3D,'id'|'houseId'|'rest'>[],layout:HouseLayout3D,start:{x:number;z:number}) {
  const cat=cats.find(cat=>cat.id===id);if(!cat)return null;
  const taken=new Set(cats.filter(other=>other.id!==id&&other.houseId===cat.houseId).map(other=>other.rest?.bedId));
  const beds=Object.entries(layout.furniture).filter(([id,item])=>item.kind==='catBed'&&!taken.has(id))
    .sort(([,a],[,b])=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
  const obstacles=houseObstacles3D(layout);
  for(const [id,bed] of beds){const path=findCatMealPath3D(start,bed,obstacles);if(path.length)return {id,...bed,path};}
  return null;
}
