export type FarmCamera3D = { zoom: number; yaw: number; x: number; z: number };
export type FarmCameraAction3D = 'zoomIn' | 'zoomOut' | 'left' | 'right' | 'up' | 'down' | 'reset';
export const freshFarmCamera3D = (): FarmCamera3D => ({ zoom: 1, yaw: -Math.PI * .75, x: 0, z: 0 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min,value));
export function zoomFarmCamera3D(view: FarmCamera3D, deltaY: number): FarmCamera3D {
  if(!Number.isFinite(deltaY))return view;
  return {...view,zoom:clamp(view.zoom*Math.exp(-clamp(deltaY,-500,500)*.0015),.65,4)};
}
export function rotateFarmCamera3D(view: FarmCamera3D, delta: number): FarmCamera3D {
  const yaw=view.yaw+delta;
  return {...view,yaw:Math.atan2(Math.sin(yaw),Math.cos(yaw))};
}
export function adjustFarmCamera3D(view: FarmCamera3D, action: FarmCameraAction3D): FarmCamera3D {
  if(action==='reset')return freshFarmCamera3D();
  if(action==='zoomIn'||action==='zoomOut')return zoomFarmCamera3D(view,action==='zoomIn'?-180:180);
  if(action==='left'||action==='right')return rotateFarmCamera3D(view,action==='left'?Math.PI/4:-Math.PI/4);
  const direction=action==='up'?1:-1;
  return {...view,x:clamp(view.x+Math.sin(view.yaw)*3*direction,-24,24),z:clamp(view.z+Math.cos(view.yaw)*3*direction,-24,24)};
}

export function panFarmCamera3D(view: FarmCamera3D, right: number, forward: number, delta: number): FarmCamera3D {
  const length=Math.hypot(right,forward);
  if(!length || !Number.isFinite(delta))return view;
  const step=10*Math.min(.1,Math.max(0,delta))/view.zoom/Math.max(1,length);
  return {...view,
    x:clamp(view.x+(Math.sin(view.yaw)*forward-Math.cos(view.yaw)*right)*step,-24,24),
    z:clamp(view.z+(Math.cos(view.yaw)*forward+Math.sin(view.yaw)*right)*step,-24,24),
  };
}
