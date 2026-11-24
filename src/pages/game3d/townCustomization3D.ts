import {TOWN_BUILDINGS_3D,TOWN_NPCS_3D} from './townLayout3D';
import type {Obstacle3} from './game3d';
const hasControlCharacters=(value:string)=>Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127);
export type TownTransform3D={x:number;z:number;rotation:number};
export const TOWN_BUILDING_CATALOG_3D=[
 {id:'cottage',name:'Heritage townhouse',preview:'/game3d/town/heritage-house.svg',color:'#f6eee0',roof:'#d55245'},
 {id:'market',name:'Heritage market',preview:'/game3d/town/heritage-market.svg',color:'#f4d7a0',roof:'#497b74'},
 {id:'plot',name:'Empty shop plot',preview:'/game3d/houses/shop-plot.svg',color:'#e5d7a8',roof:'#497b74'},
 {id:'shop',name:'New shop',preview:'/game3d/town/heritage-shop.svg',color:'#e9dfcf',roof:'#c66557'},
 {id:'h2h',name:'H2H Shop',preview:'/game3d/houses/h2h.svg',color:'#e9dfcf',roof:'#c66557',legacy:true},
 {id:'hall',name:'Community hall',preview:'/game3d/town/heritage-hall.svg',color:'#e2dbe9',roof:'#6d658e'},
] as const;
export type TownBuildingStyle3D=typeof TOWN_BUILDING_CATALOG_3D[number]['id'];
export type TownBuilding3D=TownTransform3D&{style:TownBuildingStyle3D;name?:string;shopType?:'website'};
export type TownLayout3D={objects:Record<string,TownTransform3D|null>;buildings:Record<string,TownBuilding3D>};
export const TOWN_EDIT_OBJECTS_3D=[
 ...TOWN_BUILDINGS_3D.map(b=>({id:b.id,name:b.name,x:b.x,z:b.z,rotation:0,kind:'shop'})),
 {id:'fountain',name:'Fountain',x:0,z:-6,rotation:0,kind:'fountain'},
 ...TOWN_NPCS_3D.map(n=>({id:`npc-${n.id}`,name:n.name,x:n.x,z:n.z,rotation:0,kind:'npc'})),
 ...[-14,14].flatMap(x=>[-12,0,12].map(z=>({id:`tree-${x}-${z}`,name:`Tree (${x}, ${z})`,x,z,rotation:0,kind:'tree'}))),
 {id:'portal',name:'Return home portal',x:0,z:12,rotation:0,kind:'portal'},
];
export const freshTownLayout3D=():TownLayout3D=>({objects:Object.fromEntries(TOWN_EDIT_OBJECTS_3D.map(({id,x,z,rotation})=>[id,{x,z,rotation}])),buildings:{}});
export function normalizeTownLayout3D(input:unknown):TownLayout3D{
 const result=freshTownLayout3D(),objects=(input as TownLayout3D|null)?.objects;
 if(!objects||typeof objects!=='object')return result;
 for(const spec of TOWN_EDIT_OBJECTS_3D){const t=objects[spec.id];if(t===null&&spec.kind!=='portal')result.objects[spec.id]=null;
 else if(t&&Number.isInteger(t.x)&&Number.isInteger(t.z)&&Math.abs(t.x)<=20&&Math.abs(t.z)<=20&&Number.isInteger(t.rotation)&&t.rotation>=0&&t.rotation<=3)result.objects[spec.id]={x:t.x,z:t.z,rotation:t.rotation};}
 const buildings=(input as TownLayout3D)?.buildings;
 if(buildings&&typeof buildings==='object')for(const [id,t] of Object.entries(buildings).slice(0,64)){
  if(/^building-[1-9][0-9]{0,7}$/.test(id)&&t&&Number.isInteger(t.x)&&Number.isInteger(t.z)&&Math.abs(t.x)<=20&&Math.abs(t.z)<=20&&Number.isInteger(t.rotation)&&t.rotation>=0&&t.rotation<=3&&TOWN_BUILDING_CATALOG_3D.some(s=>s.id===t.style))result.buildings[id]={x:t.x,z:t.z,rotation:t.rotation,style:t.style,...(t.shopType==='website'?{shopType:'website' as const}:{}),...(typeof t.name==='string'&&t.name.trim().length>0&&t.name.trim().length<=60&&!hasControlCharacters(t.name)?{name:t.name.trim()}:{})};
 }
 return result;
}
export function townObstacles3D(layout:TownLayout3D):Obstacle3[]{
 return TOWN_EDIT_OBJECTS_3D.flatMap((spec):Obstacle3[]=>{const t=layout.objects[spec.id];if(!t)return [];
 if(spec.kind==='shop')return [{kind:'box',x:t.x,z:t.z,width:t.rotation%2?4:5,depth:t.rotation%2?5:4}];
 if(spec.kind==='tree'||spec.kind==='fountain')return [{kind:'circle',x:t.x,z:t.z,radius:spec.kind==='tree'?.8:1.9}];return [];}).concat(Object.values(layout.buildings).filter(t=>t.style!=='plot').map(t=>({kind:'box' as const,x:t.x,z:t.z,width:t.rotation%2?4:5,depth:t.rotation%2?5:4})));
}
export function canEditWorld3D(role:'admin'|'player'|null,self:string|null,owner:string|null,world:'farm'|'house'|'town'){
 return Boolean(self&&role&&(role==='admin'||world!=='town'&&owner===self));
}

export type TownEditObject3D=TownTransform3D&{id:string;name:string;kind:string;style?:TownBuildingStyle3D;shopType?:'website';canDelete:boolean;width:number;depth:number;height:number};
export function getTownObject3D(layout:TownLayout3D,id:string):TownEditObject3D|null{
 const spec=TOWN_EDIT_OBJECTS_3D.find(s=>s.id===id),t=layout.objects[id]??layout.buildings[id];if(!t)return null;
 const building=layout.buildings[id],kind=spec?.kind??(building?'building':null);if(!kind)return null;
 const style=building?.style,size=style==='plot'?{width:5,depth:4,height:.6}:kind==='shop'||kind==='building'?{width:5,depth:4,height:id==='h2h'||style==='h2h'?9.3:4.4}:kind==='fountain'?{width:4,depth:4,height:2.5}:kind==='tree'?{width:3,depth:3,height:4}:kind==='portal'?{width:3,depth:2,height:3.5}:{width:1,depth:1,height:2.5};
 return {...t,id,kind,style,name:spec?.name??building?.name??TOWN_BUILDING_CATALOG_3D.find(s=>s.id===style)?.name??'Building',canDelete:id!=='portal',...size};
}
export function townPlacementError3D(layout:TownLayout3D,object:TownEditObject3D):string|null{
 const {x,z,rotation}=object,width=rotation%2?object.depth:object.width,depth=rotation%2?object.width:object.depth;
 if(!Number.isInteger(x)||!Number.isInteger(z)||Math.abs(x)>20||Math.abs(z)>20||Math.abs(x)+width/2>23||Math.abs(z)+depth/2>23)return 'Keep the whole object inside the Town boundary.';
 if(!Number.isInteger(rotation)||rotation<0||rotation>3)return 'Use a 90 degree rotation.';
 if(Math.abs(x)<width/2+1.5&&Math.abs(z-8)<depth/2+1.5)return 'Keep the Town arrival area clear.';
 for(const id of [...Object.keys(layout.objects),...Object.keys(layout.buildings)]){
  if(id===object.id)continue;const other=getTownObject3D(layout,id);if(!other)continue;
  const ow=other.rotation%2?other.depth:other.width,od=other.rotation%2?other.width:other.depth;
  if(Math.abs(x-other.x)<(width+ow)/2+.35&&Math.abs(z-other.z)<(depth+od)/2+.35)return 'Choose clear land away from other objects and entrances.';
 }
 return null;
}
const rejected=(layout:TownLayout3D,message:string)=>({layout,changed:false,message});
export function moveTownObject3D(layout:TownLayout3D,id:string,point:{x:number;z:number},rotation:number){
 const object=getTownObject3D(layout,id);if(!object)return rejected(layout,'Select an existing object.');
 const next={...object,...point,rotation},error=townPlacementError3D(layout,next);if(error)return rejected(layout,error);
 const transform={x:point.x,z:point.z,rotation};
 return {layout:layout.buildings[id]?{...layout,buildings:{...layout.buildings,[id]:{...layout.buildings[id],...transform}}}:{...layout,objects:{...layout.objects,[id]:transform}},changed:true,message:'Object placed. Save Town to share your changes.'};
}
export function placeTownBuilding3D(layout:TownLayout3D,style:string,point:{x:number;z:number},rotation:number){
 if(!TOWN_BUILDING_CATALOG_3D.some(s=>s.id===style))return rejected(layout,'Choose a building from the catalogue.');
 if(Object.keys(layout.buildings).length>=64)return rejected(layout,'Town can contain up to 64 added buildings.');
 let number=1;while(layout.buildings[`building-${number}`])number++;const id=`building-${number}`;
 const entry:TownBuilding3D={...point,rotation,style:style==='shop'?'market':style as TownBuildingStyle3D,...(style==='shop'?{name:'New shop',shopType:'website' as const}:{})};
 const candidate={...layout,buildings:{...layout.buildings,[id]:entry}};
 const error=townPlacementError3D(layout,getTownObject3D(candidate,id)!);if(error)return rejected(layout,error);
 return {layout:candidate,changed:true,message:'Building placed. Save Town to share it with everyone.'};
}
export function deleteTownObject3D(layout:TownLayout3D,id:string){
 const object=getTownObject3D(layout,id);if(!object||!object.canDelete)return rejected(layout,'The return-home portal can be moved, but cannot be deleted.');
 if(layout.buildings[id]){const buildings={...layout.buildings};delete buildings[id];return {layout:{...layout,buildings},changed:true,message:'Building deleted from this draft.'};}
 return {layout:{...layout,objects:{...layout.objects,[id]:null}},changed:true,message:'Object deleted from this draft.'};
}

export function renameTownShop3D(layout:TownLayout3D,id:string,value:string){
 const building=layout.buildings[id],name=value.trim();
 if(!building||!['shop','market','h2h','plot'].includes(building.style))return rejected(layout,'Select a shop.');
 if(!name||name.length>60||hasControlCharacters(name))return rejected(layout,'Enter a shop name of 1–60 characters.');
 return {layout:{...layout,buildings:{...layout.buildings,[id]:{...building,name}}},changed:true,message:'Shop renamed. Save Town to share it.'};
}
