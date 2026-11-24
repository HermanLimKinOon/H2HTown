import type { Game3DSave } from './game3d';
import { applyFarmEdit3D, type FarmLayout3D } from './farmCustomization3D';
export type FarmPaintTool3D = 'path' | 'grass' | 'fence';
export const isFarmPaintTool3D = (tool: string): tool is FarmPaintTool3D => ['path','grass','fence'].includes(tool);
export type FarmPaintStroke3D = {
  before: FarmLayout3D; state: Game3DSave; tool: FarmPaintTool3D; rotation: number;
  lastKey: string; trail: ReadonlyArray<{key: string; state: Game3DSave; painted: number; message: string}>; painted: number; message: string;
};
export function farmPaintLine3D(from: string,to: string): string[] {
  const point=(key: string)=>/^-?\d+,-?\d+$/.test(key)?key.split(',').map(Number):[];
  const start=point(from),end=point(to);
  if(start.length!==2||end.length!==2||[...start,...end].some(n=>!Number.isFinite(n)||Math.abs(n)>24))return [];
  let [x,z]=start;const [tx,tz]=end;
  const dx=Math.abs(tx-x),dz=Math.abs(tz-z),sx=x<tx?1:-1,sz=z<tz?1:-1;
  let error=dx-dz;const keys=[`${x},${z}`];
  // Four-connected steps keep fences joined even when the pointer jumps diagonally.
  while(x!==tx||z!==tz){const twice=error*2;if(twice>-dz){error-=dz;x+=sx;keys.push(`${x},${z}`);}if(twice<dx){error+=dx;z+=sz;keys.push(`${x},${z}`);}}
  return keys;
}
export function startFarmPaint3D(state: Game3DSave,tool: FarmPaintTool3D,key: string,rotation: number): FarmPaintStroke3D {
  return extendFarmPaint3D({before:state.farmLayout,state,tool,rotation,lastKey:key,trail:[],painted:0,message:''},key);
}
export function extendFarmPaint3D(stroke: FarmPaintStroke3D,key: string): FarmPaintStroke3D {
  const keys=farmPaintLine3D(stroke.lastKey,key);if(!keys.length)return stroke;
  let trail=[...stroke.trail],state=stroke.state,painted=stroke.painted,message=stroke.message;
  // Restore snapshots from this gesture only; older terrain and fences are preserved.
  const restore=(index: number)=>{
    trail=trail.slice(0,index+1);
    ({state,painted,message}=trail[index]);
  };
  const destination=trail.findIndex(step=>step.key===key);
  if(destination>=0){
    restore(destination);
  }else{
    for(const tile of keys){
      const previous=trail.findIndex(step=>step.key===tile);
      if(previous>=0){restore(previous);continue;}
      const result=applyFarmEdit3D(state,stroke.tool,tile,stroke.rotation);
      if(result.changed){state=result.state;painted++;}
      message=result.message;
      trail.push({key:tile,state,painted,message});
    }
  }
  return {...stroke,state,trail,painted,lastKey:key,message:painted?`${painted} ${painted===1?'tile':'tiles'} painted. Drag back to undo; release to finish.`:message};
}
