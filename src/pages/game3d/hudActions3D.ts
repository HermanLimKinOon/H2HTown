/** Resolve touch shortcuts into the same targets used by pointer interactions. */
export function facingHudTile3D(position:{x:number;z:number},yaw:number){
 const angle=Number.isFinite(yaw)?yaw:0;
 return {x:Math.round(position.x)+Math.round(Math.sin(angle)),z:Math.round(position.z)+Math.round(Math.cos(angle))};
}
export function nearestHudTarget3D<T extends {x:number;z:number}>(position:{x:number;z:number},targets:readonly T[],distance:number):T|undefined{
 return targets.filter(t=>Number.isFinite(t.x)&&Number.isFinite(t.z)&&Math.hypot(t.x-position.x,t.z-position.z)<=distance).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0];
}
