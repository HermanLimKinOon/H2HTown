import type {ColyseusRoomSession3D,ColyseusPose3D} from '../../src/pages/game3d/colyseusTypes3D';
import type {Obstacle3} from '../../src/pages/game3d/game3d';
export type VerifiedSession=ColyseusRoomSession3D&{roomRevision?:number};
export const PLAYER_LIMIT=10;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function loopbackUrl(value:string):boolean {try{const u=new URL(value);return u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}}
export function allowedOrigin(value:string|undefined|null,friendsOrigin?:string):boolean {if(value==null)return true;try{const u=new URL(value);if(friendsOrigin&&value===friendsOrigin&&u.origin===value&&u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(u.hostname)&&!u.port)return true;return loopbackUrl(value)&&u.origin===value&&['3000','3001','5173'].includes(u.port);}catch{return false;}}
export function parseSession(value:unknown,userId:string):VerifiedSession|null {
 if(!value||typeof value!=='object')return null;const v=value as VerifiedSession;
 if(v.roomRevision!==undefined&&(!Number.isSafeInteger(v.roomRevision)||v.roomRevision<0))return null;
 if(!uuid.test(v.userId)||v.userId!==userId||typeof v.name!=='string'||!v.name.trim()||v.name.length>32||[...v.name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||typeof v.world!=='string'||!(v.world==='town'||(/^farm:[0-9a-f-]{36}$/i.test(v.world)&&uuid.test(v.world.slice(5))))||typeof v.serverId!=='string'||!/^[-\w.]{1,64}$/.test(v.serverId)||!uuid.test(v.leaseId)||!Number.isSafeInteger(v.seq)||v.seq<0||![v.x,v.z].every(Number.isFinite)||Math.abs(v.x)>23.55||Math.abs(v.z)>23.55||typeof v.allowInitialPosition!=='boolean'||!Array.isArray(v.blockedUserIds)||v.blockedUserIds.length>2000||v.blockedUserIds.some(id=>typeof id!=='string'||!uuid.test(id)))return null;
 try{if(JSON.stringify({appearance:v.appearance,choice:v.choice}).length>24576||JSON.stringify(v.farmLayout).length>524288||(v.townLayout!==undefined&&JSON.stringify(v.townLayout).length>49152))return null;}catch{return null;}
 if(v.world!=='town'&&(!v.farmLayout||typeof v.farmLayout!=='object'))return null;
 return {...v,name:v.name.trim(),blockedUserIds:[...new Set(v.blockedUserIds)],allowInitialPosition:v.allowInitialPosition&&v.world===`farm:${v.userId}`};
}
export async function authorize(token:string,options:unknown,verify:(token:string)=>Promise<VerifiedSession>):Promise<VerifiedSession> {
 if(typeof token!=='string'||token.length<1||token.length>12000)throw new Error('Unauthorized');
 let session:VerifiedSession;try{session=await verify(token);}catch{throw new Error('Unauthorized or expired session');}
 const o=options as {world?:unknown;serverId?:unknown};if(!o||typeof o!=='object'||o.world!==session.world||(o.serverId??'local-1')!==session.serverId)throw new Error('Inactive world');
 return session;
}
export class Capacity {
 private users=new Map<string,string>();constructor(readonly limit=PLAYER_LIMIT){}
 get count(){return this.users.size;}
 claim(user:string,session:string){if(this.users.has(user))throw new Error('Already connected');if(this.count>=this.limit)throw new Error('Server full (10 players)');this.users.set(user,session);}
 release(user:string,session:string){if(this.users.get(user)===session)this.users.delete(user);}
}
export function visible(a:VerifiedSession,b:VerifiedSession){return a.world===b.world&&a.serverId===b.serverId&&!a.blockedUserIds.includes(b.userId)&&!b.blockedUserIds.includes(a.userId);}
function pointClear(x:number,z:number,obstacles:readonly Obstacle3[]){return obstacles.every(o=>o.kind==='box'?Math.abs(x-o.x)>o.width/2+.45||Math.abs(z-o.z)>o.depth/2+.45:(x-o.x)**2+(z-o.z)**2>=(o.radius+.45)**2-1e-9);}
export function segmentClear(ax:number,az:number,bx:number,bz:number,obstacles:readonly Obstacle3[]) {
 return obstacles.every(o=>{
  if(o.kind==='circle'){const dx=bx-ax,dz=bz-az;const t=Math.max(0,Math.min(1,((o.x-ax)*dx+(o.z-az)*dz)/(dx*dx+dz*dz||1)));return(ax+t*dx-o.x)**2+(az+t*dz-o.z)**2>=(o.radius+.45)**2-1e-9;}
  let low=0,high=1;for(const [start,end,center,radius]of[[ax,bx,o.x,o.width/2+.45],[az,bz,o.z,o.depth/2+.45]]){const delta=end-start;if(delta===0){if(start<center-radius||start>center+radius)return true;continue;}let p=(center-radius-start)/delta,q=(center+radius-start)/delta;if(p>q)[p,q]=[q,p];low=Math.max(low,p);high=Math.min(high,q);if(low>high)return true;}return false;
 });
}
/** Network snapshots span multiple client collision steps. A short two-leg path
 * outside a circular rim is valid even when the chord crosses the obstacle.
 * Both legs must clear EVERY obstacle and their full length is speed-limited. */
export function movementPathDistance(ax:number,az:number,bx:number,bz:number,obstacles:readonly Obstacle3[]):number {
 if(!pointClear(ax,az,obstacles)||!pointClear(bx,bz,obstacles))return Infinity;
 if(segmentClear(ax,az,bx,bz,obstacles))return Math.hypot(bx-ax,bz-az);
 let shortest=Infinity;
 for(const obstacle of obstacles){
  if(obstacle.kind!=='circle')continue;
  const ar=Math.hypot(ax-obstacle.x,az-obstacle.z),br=Math.hypot(bx-obstacle.x,bz-obstacle.z);
  if(!ar||!br)continue;
  const ux=(ax-obstacle.x)/ar,uz=(az-obstacle.z)/ar,vx=(bx-obstacle.x)/br,vz=(bz-obstacle.z)/br;
  const mx=ux+vx,mz=uz+vz,length=Math.hypot(mx,mz),cosHalf=length/2;
  if(cosHalf<1e-6)continue;
  const radius=(obstacle.radius+.450001)/cosHalf;
  const x=obstacle.x+mx/length*radius,z=obstacle.z+mz/length*radius;
  if(segmentClear(ax,az,x,z,obstacles)&&segmentClear(x,z,bx,bz,obstacles))shortest=Math.min(shortest,Math.hypot(x-ax,z-az)+Math.hypot(bx-x,bz-z));
 }
 return shortest;
}
export type MoveResult={accepted:boolean;disconnect?:boolean};
export class Movement {
 pose:ColyseusPose3D;private credit=0;private at:number;private lastSeq=-1;private first:boolean;private town:boolean;private windowAt:number;private packets=0;private violations=0;
 constructor(session:VerifiedSession,private obstacles:readonly Obstacle3[],private now:()=>number=()=>performance.now()){
  this.town=session.world==='town';this.pose={seq:0,x:session.x,z:session.z,y:0,yaw:0,moving:false,running:false};this.at=this.windowAt=now();this.first=session.allowInitialPosition&&session.world===`farm:${session.userId}`;
 }
 propose(value:unknown):MoveResult {
  const now=this.now();if(now-this.windowAt>=1000){this.windowAt=now;this.packets=0;}if(++this.packets>30)return{accepted:false,disconnect:this.packets>45};
  this.credit=Math.min(3,this.credit+Math.max(0,now-this.at)*.0085);this.at=now;
  if(!value||typeof value!=='object'||Array.isArray(value))return this.invalid();const p=value as ColyseusPose3D;
  if(Object.keys(p).length!==7||Object.keys(p).some(k=>!['seq','x','y','z','yaw','moving','running'].includes(k)))return this.invalid();
  if(!Number.isSafeInteger(p.seq)||p.seq<=this.lastSeq||![p.x,p.y,p.z,p.yaw].every(Number.isFinite)||Math.abs(p.x)>23.55||Math.abs(p.z)>23.55||p.y<0||p.y>4||Math.abs(p.yaw)>100000||typeof p.moving!=='boolean'||typeof p.running!=='boolean')return this.invalid();
  this.lastSeq=p.seq;const distance=this.first?Math.hypot(p.x-this.pose.x,p.z-this.pose.z):this.town?movementPathDistance(this.pose.x,this.pose.z,p.x,p.z,this.obstacles):segmentClear(this.pose.x,this.pose.z,p.x,p.z,this.obstacles)?Math.hypot(p.x-this.pose.x,p.z-this.pose.z):Infinity;
  if((!this.first&&distance>this.credit+1e-7)||(this.first?!pointClear(p.x,p.z,this.obstacles):!Number.isFinite(distance)))return this.invalid();
  this.credit=this.first?0:Math.max(0,this.credit-distance);this.first=false;this.violations=0;this.pose={seq:p.seq,x:p.x,z:p.z,y:p.y,yaw:p.yaw,moving:p.moving,running:p.moving&&p.running};return{accepted:true};
 }
 private invalid():MoveResult {return{accepted:false,disconnect:++this.violations>=30};}
 correction(){return{x:this.pose.x,y:this.pose.y,z:this.pose.z,yaw:this.pose.yaw,moving:false as const,running:false as const};}
 adopt(position:{x:number;z:number}){
  if(![position.x,position.z].every(Number.isFinite)||Math.abs(position.x)>23.55||Math.abs(position.z)>23.55)throw new Error('Inactive world');
  this.pose={...this.pose,x:position.x,z:position.z,y:0,moving:false,running:false};this.credit=0;this.at=this.now();this.first=false;
 }
 updateObstacles(obstacles:readonly Obstacle3[]){this.obstacles=obstacles;
  if(!pointClear(this.pose.x,this.pose.z,obstacles))throw new Error('World changed; authoritative position required');
  return false;
 }
}
