/** OSM-derived map data is separate from game saves and the shared merchant town. */
export type CityPoint3D={x:number;z:number};
export type CityFeature3D={id:number;name:string;kind:string;points:CityPoint3D[];height:number;base:number;width:number;estimated:boolean;bridge?:boolean};
export type OsmTownData3D={version:1;origin:{lat:number;lon:number};bounds:{minX:number;maxX:number;minZ:number;maxZ:number};timestamp:string;attribution:string;license:string;buildings:CityFeature3D[];roads:CityFeature3D[];water:CityFeature3D[];parks:CityFeature3D[];spawn:CityPoint3D;landmarks?:CityFeature3D[]};
type OsmWay={type:string;id:number;tags?:Record<string,string>;geometry?:{lat:number;lon:number}[]};
export const OSM_KL_ORIGIN={lat:3.15359,lon:101.69641};
export function osmProject3D(lat:number,lon:number,origin=OSM_KL_ORIGIN):CityPoint3D{return{x:(lon-origin.lon)*111320*Math.cos(origin.lat*Math.PI/180),z:-(lat-origin.lat)*111320};}
const round=(value:number)=>Math.round(value*10)/10;
export function osmHeight3D(tags:Record<string,string>):{height:number;base:number;estimated:boolean}{
 const meters=(value:string|undefined)=>{const n=parseFloat(value??'');return Number.isFinite(n)&&n>=0?n*(/ft|feet|′|'/.test(value??'')?.3048:1):null;};
 const height=meters(tags.height),levels=parseFloat(tags['building:levels']??''),base=Math.min(490,meters(tags.min_height)??0);
 return{height:Math.max(base+2,Math.min(500,height??(Number.isFinite(levels)&&levels>0?levels*3.2:tags.building==='apartments'?24:9))),base:Math.min(490,base),estimated:height===null};
}
export function cityPointInPolygon3D(p:CityPoint3D,ring:readonly CityPoint3D[]):boolean{
 let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }return inside;
}
export function cityDistanceToSegment3D(p:CityPoint3D,a:CityPoint3D,b:CityPoint3D){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function buildCityCollision3D(city:OsmTownData3D){
 const cells=new Map<string,CityFeature3D[]>(),cell=40;
 for(const feature of city.buildings.filter(b=>b.base<2)){
  const xs=feature.points.map(p=>p.x),zs=feature.points.map(p=>p.z);
  for(let x=Math.floor(Math.min(...xs)/cell);x<=Math.floor(Math.max(...xs)/cell);x++)for(let z=Math.floor(Math.min(...zs)/cell);z<=Math.floor(Math.max(...zs)/cell);z++){const key=`${x}:${z}`,items=cells.get(key)??[];items.push(feature);cells.set(key,items);}
 }
 return (p:CityPoint3D,radius=.45)=>{
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<city.bounds.minX+2||p.x>city.bounds.maxX-2||p.z<city.bounds.minZ+2||p.z>city.bounds.maxZ-2)return false;
  const features=new Set<CityFeature3D>();for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const feature of cells.get(`${Math.floor(p.x/cell)+dx}:${Math.floor(p.z/cell)+dz}`)??[])features.add(feature);
  for(const feature of features){if(cityPointInPolygon3D(p,feature.points))return false;for(let i=1;i<feature.points.length;i++)if(cityDistanceToSegment3D(p,feature.points[i-1],feature.points[i])<radius)return false;}
  return true;
 };
}
/** Keep road segments in the requested export; long OSM ways often extend far outside it. */
export function clipCitySegment3D(a:CityPoint3D,b:CityPoint3D,bounds:OsmTownData3D['bounds']):[CityPoint3D,CityPoint3D]|null{
 const dx=b.x-a.x,dz=b.z-a.z;let low=0,high=1;
 for(const [p,q] of [[-dx,a.x-bounds.minX],[dx,bounds.maxX-a.x],[-dz,a.z-bounds.minZ],[dz,bounds.maxZ-a.z]]){if(p===0){if(q<0)return null;continue;}const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return null;}
 return[{x:round(a.x+low*dx),z:round(a.z+low*dz)},{x:round(a.x+high*dx),z:round(a.z+high*dz)}];
}
export function processOsmTown3D(source:{elements:OsmWay[];osm3s?:{timestamp_osm_base?:string}},bbox=[3.140,101.683,3.170,101.718]):OsmTownData3D{
 const sw=osmProject3D(bbox[0],bbox[1]),ne=osmProject3D(bbox[2],bbox[3]);
 const city:OsmTownData3D={version:1,origin:OSM_KL_ORIGIN,bounds:{minX:sw.x,maxX:ne.x,minZ:ne.z,maxZ:sw.z},timestamp:source.osm3s?.timestamp_osm_base??'',attribution:'© OpenStreetMap contributors',license:'https://opendatacommons.org/licenses/odbl/1-0/',buildings:[],roads:[],water:[],parks:[],spawn:{x:0,z:0}};
 for(const way of source.elements){if(way.type!=='way'||!way.geometry||way.geometry.length<2)continue;
  const tags=way.tags??{},points=way.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>{const v=osmProject3D(p.lat,p.lon);return{x:round(v.x),z:round(v.z)};});if(points.length<2)continue;
  const name=(tags['name:en']??tags.name??'').slice(0,140),closed=points.length>=4&&Math.hypot(points[0].x-points.at(-1)!.x,points[0].z-points.at(-1)!.z)<.2;
  const feature:CityFeature3D={id:way.id,name,kind:'',points,...osmHeight3D(tags),width:0,bridge:!!tags.bridge&&tags.bridge!=='no'};
  const inside=points.every(p=>p.x>=city.bounds.minX&&p.x<=city.bounds.maxX&&p.z>=city.bounds.minZ&&p.z<=city.bounds.maxZ);
  if((tags.building||tags['building:part'])&&closed){const clipped=clipCityPolygon3D(points,city.bounds);if(clipped.length>3)city.buildings.push({...feature,points:clipped,kind:tags['building:part']?'part':tags.building});continue;}
  if(closed&&inside&&(tags.leisure==='park'||tags.natural==='water')){(tags.leisure==='park'?city.parks:city.water).push({...feature,kind:tags.leisure==='park'?'park':'water-area'});continue;}
  const kind=tags.highway?'road':tags.waterway?'river':null;if(!kind)continue;
  const roadClass=tags.highway??'';if(tags.tunnel==='yes'||tags.location==='underground')continue;if(['construction','proposed','steps'].includes(roadClass))continue;
  const foot=['footway','pedestrian','path','cycleway','bridleway'].includes(roadClass);
  const width=Math.max(1,Math.min(40,parseFloat(tags.width??'')||(kind==='river'?(tags.waterway==='river'?18:5):foot?2.4:parseFloat(tags.lanes??'')*3.2||(['motorway','trunk','primary'].includes(roadClass)?11:6))));
  // Split at clipped segments so unrelated ends are never joined across the edge.
  let run:CityPoint3D[]=[];const flush=()=>{if(run.length>1)(kind==='river'?city.water:city.roads).push({...feature,kind:kind==='river'?'river':foot?'footway':'road',width,points:run});run=[];};
  for(let i=1;i<points.length;i++){const clipped=clipCitySegment3D(points[i-1],points[i],city.bounds);if(!clipped){flush();continue;}if(run.length&&Math.hypot(run.at(-1)!.x-clipped[0].x,run.at(-1)!.z-clipped[0].z)>.2)flush();if(!run.length)run.push(clipped[0]);run.push(clipped[1]);}flush();
 }
 const canStand=buildCityCollision3D(city);
 const candidates=city.roads.flatMap(r=>r.points).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));city.spawn=candidates.find(p=>canStand(p,1))??city.spawn;
 return city;
}
export function cityNearestStreet3D(city:OsmTownData3D,wanted:CityPoint3D):CityPoint3D|null{
 const stand=buildCityCollision3D(city);let closest:CityPoint3D|null=null,best=Infinity;
 for(const road of city.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((wanted.x-a.x)*dx+(wanted.z-a.z)*dz)/length)):0;
  const p={x:a.x+dx*t,z:a.z+dz*t},distance=Math.hypot(p.x-wanted.x,p.z-wanted.z);if(distance<best&&stand(p,1)){best=distance;closest=p;}
 }return closest;
}
export function clipCityPolygon3D(points:CityPoint3D[],b:OsmTownData3D['bounds']):CityPoint3D[]{
 let ring=points.slice(0,-1);for(const [axis,bound,keepGreater] of [['x',b.minX,true],['x',b.maxX,false],['z',b.minZ,true],['z',b.maxZ,false]] as const){
  const next:CityPoint3D[]=[];for(let i=0;i<ring.length;i++){const a=ring[(i+ring.length-1)%ring.length],c=ring[i],insideA=keepGreater?a[axis]>=bound:a[axis]<=bound,insideC=keepGreater?c[axis]>=bound:c[axis]<=bound;if(insideA!==insideC){const t=(bound-a[axis])/(c[axis]-a[axis]);next.push({x:round(a.x+(c.x-a.x)*t),z:round(a.z+(c.z-a.z)*t)});}if(insideC)next.push(c);}ring=next;if(ring.length<3)return[];
 }return [...ring,ring[0]];
}

export function osmUnproject3D(point:CityPoint3D,origin=OSM_KL_ORIGIN){return{lat:origin.lat-point.z/111320,lon:origin.lon+point.x/(111320*Math.cos(origin.lat*Math.PI/180))};}
