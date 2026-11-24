import { freshGame3DSave, normalizeGame3DSave, type Game3DSave } from './game3d';

export function townTestPlayer3D(search:string,localBackend:boolean):'1'|'2'|null {
  if(!localBackend)return null;
  const player=new URLSearchParams(search).get('townTest');
  return player==='1'||player==='2'?player:null;
}

export function seedTownTestSave3D(saved:unknown,player:'1'|'2'):Game3DSave {
  const base=saved?normalizeGame3DSave(saved):freshGame3DSave();
  const position={x:player==='1'?-2:2,y:0,z:8};
  return {...base,worldId:'town',player:position,worldPositions:{...base.worldPositions,town:position},appearance:{...base.appearance,name:`Player ${player}`}};
}
