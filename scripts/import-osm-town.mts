import {readFile,writeFile} from 'node:fs/promises';
import {processOsmTown3D,osmProject3D} from '../src/pages/game3d/osmTown3D.ts';
const source=JSON.parse(await readFile('public/game3d/osm/kuala-lumpur-source.json','utf8'));
const city=processOsmTown3D(source,source.bounds);
city.landmarks=(source.landmarks??[]).map((p:{id:number;name:string;type:string;lat:number;lon:number})=>({id:p.id,name:p.name,kind:`landmark-${p.type}`,points:[osmProject3D(p.lat,p.lon)],height:0,base:0,width:0,estimated:false}));
if(city.buildings.length<50||city.roads.length<50)throw new Error('Export is too incomplete to create the town');
await writeFile('public/game3d/osm/kuala-lumpur-city.json',JSON.stringify(city));
console.log(JSON.stringify({buildings:city.buildings.length,roads:city.roads.length,water:city.water.length,parks:city.parks.length,spawn:city.spawn,sourceDate:city.timestamp,named:city.buildings.filter(b=>b.name).map(b=>b.name).slice(0,35)}));
