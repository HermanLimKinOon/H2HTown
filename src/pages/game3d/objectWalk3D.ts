import { isPositionBlocked, type Obstacle3 } from './game3d';
import { isHighlightedObject3D, type InteractionFootprint3D } from './cameraControls3D';

type Point = { x: number; z: number };
export type ObjectWalk3D = { path: Point[]; index: number };

export function findObjectWalkPath3D(start: Point, target: InteractionFootprint3D, obstacles: readonly Obstacle3[],limit=5.5): Point[] {
  return findWalkPath3D(start,target,obstacles,limit,false);
}

export function findGroundWalkPath3D(start: Point, target: Point, obstacles: readonly Obstacle3[], limit: number): Point[] {
  if(!Number.isFinite(target.x)||!Number.isFinite(target.z)||Math.abs(target.x)>limit||Math.abs(target.z)>limit||isPositionBlocked({...target,y:0},obstacles))return [];
  return findWalkPath3D(start,target,obstacles,limit,true);
}

// Half-tile navigation uses the same clearance as keyboard movement.
function findWalkPath3D(start: Point, target: InteractionFootprint3D, obstacles: readonly Obstacle3[], limit: number, exact: boolean): Point[] {
  const clear = (a: Point, b: Point) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));
    for(let i=0;i<=steps;i++)if(isPositionBlocked({x:a.x+(b.x-a.x)*i/steps,y:0,z:a.z+(b.z-a.z)*i/steps},obstacles))return false;
    return true;
  };
  const key = (p: Point) => `${p.x},${p.z}`;
  const queue: Point[] = [start], previous = new Map<string, Point | null>([[key(start),null]]);
  for(let i=0;i<queue.length;i++) {
    const point=queue[i];
    if(exact ? Math.hypot(point.x-target.x,point.z-target.z)<.8 && clear(point,target) : isHighlightedObject3D(point,target)) {
      const path: Point[]=[];let current: Point | null=point;
      while(current){path.unshift(current);current=previous.get(key(current))??null;}
      return exact ? [...path.slice(1),target] : path.slice(1);
    }
    const candidates = i===0
      ? Array.from({length:9},(_,n)=>({x:Math.round(start.x*2)/2+(n%3-1)*.5,z:Math.round(start.z*2)/2+(Math.floor(n/3)-1)*.5}))
      : [[.5,0],[-.5,0],[0,.5],[0,-.5]].map(([x,z])=>({x:point.x+x,z:point.z+z}));
    for(const next of candidates) {
      if(Math.abs(next.x)>limit||Math.abs(next.z)>limit||previous.has(key(next))||!clear(point,next))continue;
      previous.set(key(next),point);queue.push(next);
    }
  }
  return [];
}
