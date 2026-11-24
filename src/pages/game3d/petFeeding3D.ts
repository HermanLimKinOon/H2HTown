import type { Game3DSave,GameAction3D,Obstacle3 } from './game3d';
import { CAT_RULES_3D,isCatFloorClear3D,freshCatBrain3D,type CatBrain3D } from './cats3D';
import { houseLayoutFor3D,houseObstacles3D,type HouseLayout3D } from './houseCustomization3D';
type Point={x:number;z:number};
export const PET_MEAL_SECONDS_3D=5;
export function petBowlPosition3D(layout:HouseLayout3D):Point {
  const obstacles=houseObstacles3D(layout),points:Point[]=[];
  for(let x=-4.5;x<=4.5;x+=.5)for(let z=-4.5;z<=3.5;z+=.5)points.push({x,z});
  points.sort((a,b)=>Math.hypot(a.x+2,a.z-2)-Math.hypot(b.x+2,b.z-2));
  return points.find(p=>isCatFloorClear3D(p.x,p.z,obstacles))??{x:-2,z:2};
}
export function catMealTarget3D(layout:HouseLayout3D,index:number):Point {
  const bowl=petBowlPosition3D(layout),obstacles=houseObstacles3D(layout);
  for(let i=0;i<12;i++) {const angle=(index*4+i)*Math.PI/6,p={x:bowl.x+Math.sin(angle)*.65,z:bowl.z+Math.cos(angle)*.65};if(isCatFloorClear3D(p.x,p.z,obstacles))return p;}
  return bowl;
}
const segmentClear=(a:Point,b:Point,obstacles:readonly Obstacle3[])=>{
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));
  for(let i=0;i<=steps;i++)if(!isCatFloorClear3D(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,obstacles))return false;
  return true;
};
export function findCatMealPath3D(start:Point,goal:Point,obstacles:readonly Obstacle3[]):Point[] {
  if(!isCatFloorClear3D(start.x,start.z,obstacles)||!isCatFloorClear3D(goal.x,goal.z,obstacles))return [];
  const nodes:Point[]=[];for(let x=-5;x<=5;x+=.5)for(let z=-5;z<=4.5;z+=.5)if(isCatFloorClear3D(x,z,obstacles))nodes.push({x,z});
  const nearest=(p:Point)=>nodes.filter(n=>Math.hypot(n.x-p.x,n.z-p.z)<.8&&segmentClear(p,n,obstacles)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  const a=nearest(start),b=nearest(goal);if(!a||!b)return [];
  const key=(p:Point)=>`${p.x},${p.z}`,grid=new Map(nodes.map(p=>[key(p),p])),previous=new Map<string,string|null>([[key(a),null]]),queue=[a];
  for(let i=0;i<queue.length;i++) {
    const node=queue[i];if(key(node)===key(b))break;
    for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]) {
      const next=grid.get(`${node.x+dx},${node.z+dz}`);if(next&&!previous.has(key(next))&&segmentClear(node,next,obstacles)){previous.set(key(next),key(node));queue.push(next);}
    }
  }
  if(!previous.has(key(b)))return [];
  const path:Point[]=[goal];let current:string|null=key(b);
  while(current!==null){path.unshift(grid.get(current)!);current=previous.get(current)??null;}
  return path;
}
export type CatMeal3D={brain:CatBrain3D;path:Point[];index:number;phase:'walking'|'eating'|'complete';eaten:number;bowl:Point};
export function freshCatMeal3D(brain:CatBrain3D,path:Point[],bowl=path.at(-1)??brain):CatMeal3D {return {brain,path,index:0,phase:'walking',eaten:0,bowl};}
export function stepCatMeal3D(meal:CatMeal3D,delta:number):CatMeal3D {
  const dt=Math.max(0,Math.min(.1,delta));if(!dt||meal.phase==='complete')return meal;
  if(meal.phase==='eating'){const eaten=meal.eaten+dt;return {...meal,eaten,phase:eaten>=PET_MEAL_SECONDS_3D?'complete':'eating'};}
  const target=meal.path[meal.index];
  if(!target)return {...meal,phase:'eating',brain:{...meal.brain,mode:'resting',yaw:Math.atan2(meal.bowl.x-meal.brain.x,meal.bowl.z-meal.brain.z)}};
  const dx=target.x-meal.brain.x,dz=target.z-meal.brain.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*1.2);
  if(d<.02)return {...meal,index:meal.index+1};
  return {...meal,brain:{...meal.brain,x:meal.brain.x+dx/d*step,z:meal.brain.z+dz/d*step,yaw:Math.atan2(dx,dz),mode:'walking',distance:meal.brain.distance+step}};
}
const reject=(state:Game3DSave,message:string):GameAction3D=>({state,changed:false,message});
export function fillPetBowl3D(state:Game3DSave,now:number):GameAction3D {
  if(state.worldId!=='house'||state.farmPausedAt!==null)return reject(state,'Feed pets while inside your house, outside edit mode.');
  const layout=houseLayoutFor3D(state),bowl=petBowlPosition3D(layout);
  if(Math.hypot(state.player.x-bowl.x,state.player.z-bowl.z)>2)return reject(state,'Walk closer to the pet bowl.');
  const houseCats=state.cats.filter(cat=>cat.houseId===state.interiorHouseId);
  if(!houseCats.length)return reject(state,'Place a cat using Edit house → Cats first.');
  const hungry=houseCats.filter(cat=>cat.mealServedAt===undefined&&(cat.lastFedAt===null||now-cat.lastFedAt>=CAT_RULES_3D.feedCooldown));
  if(!hungry.length)return reject(state,'Your cats are full or already have food in the bowl.');
  if(state.inventory.petFood<1)return reject(state,'Buy pet food at Meadow Shop or the Cat Shop.');
  const selected=hungry.slice(0,state.inventory.petFood).filter(cat=>{
    const start=layout.catPositions[cat.id]??freshCatBrain3D(Number(cat.id.split('-')[1]));
    return findCatMealPath3D(start,catMealTarget3D(layout,houseCats.indexOf(cat)),houseObstacles3D(layout)).length>0;
  });
  if(!selected.length)return reject(state,'Clear a path through the furniture to the pet bowl.');
  const ids=new Set(selected.map(cat=>cat.id));
  return {state:{...state,inventory:{...state.inventory,petFood:state.inventory.petFood-selected.length},cats:state.cats.map(cat=>ids.has(cat.id)?{...cat,mealServedAt:now}:cat)},changed:true,message:'Food served. Your cats are coming to the bowl.'};
}
export function completeCatMeal3D(state:Game3DSave,id:string,servedAt:number,now:number):GameAction3D {
  const cat=state.cats.find(cat=>cat.id===id);
  if(!cat||cat.mealServedAt!==servedAt||state.worldId!=='house'||cat.houseId!==state.interiorHouseId)return reject(state,'No meal to finish.');
  return {state:{...state,cats:state.cats.map(cat=>{if(cat.id!==id)return cat;const next={...cat,lastFedAt:now};delete next.mealServedAt;return next;})},changed:true,message:'Your cat finished eating.'};
}
export function refundCatMeal3D(state:Game3DSave,id:string,servedAt:number):GameAction3D {
  if(!state.cats.some(cat=>cat.id===id&&cat.mealServedAt===servedAt))return reject(state,'No reserved meal.');
  return {state:{...state,inventory:{...state.inventory,petFood:state.inventory.petFood+1},cats:state.cats.map(cat=>{if(cat.id!==id)return cat;const next={...cat};delete next.mealServedAt;return next;})},changed:true,message:'Your cat cannot reach the bowl. Clear a path; its food was returned to your bag.'};
}
