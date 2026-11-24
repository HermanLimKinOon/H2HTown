import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../server/colyseus/authority.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {Capacity,allowedOrigin,loopbackUrl,authorize,parseSession,Movement,visible,movementPathDistance}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const id='a3000000-0000-4000-8000-000000000001';
const peerId='b3000000-0000-4000-8000-000000000002';
const session=(overrides={})=>({userId:id,name:'Alpha',world:'town',serverId:'local-1',x:0,z:5,seq:300,leaseId:id,allowInitialPosition:false,appearance:{},choice:{},blockedUserIds:[],farmLayout:null,...overrides});
const pose=(seq,x,z,more={})=>({seq,x,z,y:0,yaw:0,moving:true,running:false,...more});
test('configuration/origins accept only loopback HTTP endpoints',()=>{
 for(const value of ['http://localhost:54329','http://127.0.0.1:54329'])assert.equal(loopbackUrl(value),true);
 for(const value of ['https://example.com','http://localhost.evil.test','http://127.0.0.1@evil.test','file:///tmp/a','https://localhost','http://0.0.0.0'])assert.equal(loopbackUrl(value),false);
 assert.equal(allowedOrigin(undefined),true);assert.equal(allowedOrigin('http://localhost:3000'),true);assert.equal(allowedOrigin('null'),false);assert.equal(allowedOrigin('https://evil.test'),false);
});
test('friends access accepts only the explicitly configured HTTPS tunnel origin',()=>{
 const origin='https://h2h-test.trycloudflare.com';
 assert.equal(allowedOrigin(origin,origin),true);
 for(const value of ['https://other.trycloudflare.com','https://h2h-test.trycloudflare.com.evil.test','null',origin+'/path'])assert.equal(allowedOrigin(value,origin),false);
 assert.equal(allowedOrigin(origin),false);
 assert.equal(allowedOrigin('http://h2h-test.trycloudflare.com','http://h2h-test.trycloudflare.com'),false);
});
test('named game hostname is accepted only when it is the exact configured HTTPS origin',()=>{
 assert.equal(allowedOrigin('https://play.h2haigroup.com','https://play.h2haigroup.com'),true);
 assert.equal(allowedOrigin('https://play.h2haigroup.com'),false);
 for(const value of ['https://other.h2haigroup.com','http://play.h2haigroup.com','https://play.h2haigroup.com.evil.test'])assert.equal(allowedOrigin(value,'https://play.h2haigroup.com'),false);
});
test('every authorization verifies token and server session before accepting options',async()=>{
 let calls=0;const verify=async token=>{calls++;assert.equal(token,'jwt');return session();};
 assert.equal((await authorize('jwt',{world:'town',serverId:'local-1'},verify)).userId,id);assert.equal(calls,1);
 await assert.rejects(authorize('',{world:'town'},verify),/Unauthorized/);
 await assert.rejects(authorize('jwt',{world:`farm:${peerId}`},verify),/Inactive world/);
 await assert.rejects(authorize('jwt',{world:'town',serverId:'forged'},verify),/Inactive world/);
 await assert.rejects(authorize('jwt',{world:'town'},async()=>{throw new Error('raw JWT/database secrets');}),/Unauthorized/);
 assert.equal(parseSession({...session(),userId:'spoof'},id),null);assert.equal(parseSession(session(),peerId),null);
});
test('capacity is global, duplicate users denied and releases cannot remove a newer claim',()=>{
 const cap=new Capacity(10);for(let i=0;i<10;i++)cap.claim(`u${i}`,`s${i}`);
 assert.throws(()=>cap.claim('u10','s10'),/Server full/);assert.throws(()=>cap.claim('u0','different'),/Already connected/);
 cap.release('u0','stale');assert.equal(cap.count,10);cap.release('u0','s0');cap.claim('u10','s10');assert.equal(cap.count,10);
});
test('movement is identity-free, bounded and sequence/rate/speed validated',()=>{
 let now=0;const movement=new Movement(session(),[],()=>now);
 now=100;assert.equal(movement.propose(pose(0,.5,5)).accepted,true);
 assert.equal(movement.propose(pose(0,.6,5)).accepted,false);
 now=200;assert.equal(movement.propose(pose(1,20,20)).accepted,false);
 now=300;assert.equal(movement.propose(pose(2,NaN,5)).accepted,false);
 now=400;assert.equal(movement.propose(pose(3,0,5,{userId:peerId,name:'spoof'})).accepted,false);
 now=500;assert.equal(movement.propose(pose(4,24,5)).accepted,false);
 now=600;assert.equal(movement.propose(pose(5,.8,5,{y:5})).accepted,false);
 now=700;assert.equal(movement.propose(pose(6,.8,5)).accepted,true);
 const flood=new Movement(session(),[],()=>now);let limited=false;
 for(let i=0;i<50;i++)if(flood.propose(pose(i,0,5)).disconnect)limited=true;
 assert.equal(limited,true);
});
test('segment collision prevents tunneling and own farm initialization is once only',()=>{
 let now=1000;const obstacles=[{kind:'box',x:1.5,z:5,width:.1,depth:2}];const town=new Movement(session(),obstacles,()=>now);
 now+=1000;assert.equal(town.propose(pose(0,3,5)).accepted,false);
 const owner=new Movement(session({world:`farm:${id}`,allowInitialPosition:true}),[],()=>now);
 assert.equal(owner.propose(pose(0,20,20)).accepted,true);assert.equal(owner.propose(pose(1,-20,-20)).accepted,false);
 const guest=new Movement(session({world:`farm:${peerId}`,allowInitialPosition:true}),[],()=>now);
 assert.equal(guest.propose(pose(0,20,20)).accepted,false);
});
test('snapshot visibility is bilateral block-aware and scope-isolated',()=>{
 const a=session();const b=session({userId:peerId});assert.equal(visible(a,b),true);
 assert.equal(visible(a,{...b,blockedUserIds:[id]}),false);assert.equal(visible({...a,blockedUserIds:[peerId]},b),false);
 assert.equal(visible(a,{...b,world:`farm:${peerId}`}),false);assert.equal(visible(a,{...b,serverId:'other'}),false);
});
test('walking around the fountain rim accepts a clear bend and charges its full distance',()=>{
 const obstacles=[{kind:'circle',x:0,z:-6,radius:1.9}];
 const a={x:2.35001,z:-6},b={x:1.873011191982158,z:-4.435013624114493};
 const distance=movementPathDistance(a.x,a.z,b.x,b.z,obstacles);
 assert.ok(Number.isFinite(distance)&&distance>Math.hypot(b.x-a.x,b.z-a.z));
 let now=0;const movement=new Movement(session({...a}),obstacles,()=>now);now=1000;
 assert.equal(movement.propose(pose(0,b.x,b.z)).accepted,true);
 assert.ok(movement.credit<3-distance+1e-8,'detour uses the movement budget');
 const inside=movementPathDistance(a.x,a.z,0,-6,obstacles);assert.equal(inside,Infinity);
 const through=movementPathDistance(a.x,a.z,-2.35001,-6,obstacles);assert.ok(through>3,'cannot cross through the fountain within the three-unit budget');
 const wall=[...obstacles,{kind:'box',x:2.2,z:-4.5,width:.2,depth:.2}];
 assert.equal(movementPathDistance(a.x,a.z,b.x,b.z,wall),Infinity,'detour cannot pass through another obstacle');
});
test('real client rim-sliding trajectories fit both 100ms and 250ms network budgets',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {movePlayer}=await tsImport('../src/pages/game3d/game3d.ts',import.meta.url);const {TOWN_OBSTACLES_3D:obstacles}=await tsImport('../src/pages/game3d/townLayout3D.ts',import.meta.url);
 let bends=0;
 for(const frames of [6,15])for(let angle=0;angle<6.28;angle+=.1)for(const inward of [.01,.03,.06,.1]){
  let position={x:2.35001*Math.cos(angle),y:0,z:-6+2.35001*Math.sin(angle)},anchor=position;
  for(let frame=0;frame<120;frame++){
   const x=position.x,z=position.z+6,r=Math.hypot(x,z);
   position=movePlayer(position,{x:-z/r*.13-x/r*inward,y:0,z:x/r*.13-z/r*inward},obstacles);
   if(frame%frames===frames-1){const distance=movementPathDistance(anchor.x,anchor.z,position.x,position.z,obstacles);assert.ok(Number.isFinite(distance)&&distance<=frames/60*8.5+1e-7);if(distance>Math.hypot(position.x-anchor.x,position.z-anchor.z)+1e-6)bends++;anchor=position;}
  }
 }
 assert.ok(bends>500,'covers curved trajectories previously rejected as fountain shortcuts');
});
test('room static authentication permits the configured friends browser origin only',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 const origin='https://h2h-test.trycloudflare.com';
 const Room=createWorldRoom({verify:async()=>session(),capacity:new Capacity(),friendsOrigin:origin});
 assert.equal((await Room.onAuth('a',{world:'town'},{headers:new Headers({origin})})).session.userId,id);
 await assert.rejects(Room.onAuth('a',{world:'town'},{headers:new Headers({origin:'https://other.trycloudflare.com'})}));
});
test('real Room lifecycle verifies static and join auth, applies refreshed blocks and disconnects revoked peers',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 let now=0;let blocked=false;let revoked=false;let calls=0;
 const verify=async token=>{calls++;if(token==='b'&&revoked)throw new Error('sensitive internal RPC error');return token==='a'?session({blockedUserIds:blocked?[peerId]:[]}):session({userId:peerId});};
 const capacity=new Capacity();const Room=createWorldRoom({verify,capacity,now:()=>now,obstacles:()=>[]});
 await assert.rejects(Room.onAuth('a',{world:'town'},{headers:new Headers({origin:'https://evil.test'})}),/Local browser origin/);
 const authA=await Room.onAuth('a',{world:'town'},{headers:new Headers()});assert.equal(calls,1);
 const room=new Room();room.setSimulationInterval=()=>{};room.clock.setInterval=()=>({});room.onCreate({world:'town'});
 const makeClient=(sessionId,auth)=>({sessionId,auth,sent:[],closes:[],send(type,data){this.sent.push({type,data});},leave(code,reason){this.closes.push({code,reason});}});
 const a=makeClient('socket-a',authA);const b=makeClient('socket-b',{token:'b',session:session({userId:peerId})});
 try{
  await room.onJoin(a,{world:'town'});await room.onJoin(b,{world:'town'});assert.equal(calls,3);assert.equal(capacity.count,2);
  room.sendSnapshots();assert.equal(a.sent.at(-1).data.selfId,'socket-a');assert.equal(a.sent.at(-1).data.players.length,2);
  now=1000;blocked=true;await room.refresh(room.entries.get('socket-a'));room.sendSnapshots();
  assert.equal(a.sent.at(-1).data.players.length,1);assert.equal(b.sent.at(-1).data.players.length,1);assert.equal(a.sent.at(-1).data.count,1);
  revoked=true;await room.refresh(room.entries.get('socket-b'));assert.equal(capacity.count,1);assert.match(b.closes[0].reason,/Unauthorized/);assert.doesNotMatch(b.closes[0].reason,/sensitive/);
  now=5999;room.sendSnapshots();assert.equal(capacity.count,1,'proof survives until five-second deadline');
  now=6000;room.sendSnapshots();assert.equal(capacity.count,0);assert.equal(a.closes.length,1);
 }finally{room.onDispose();room.clock.clear();}
});
test('late authorization refresh never resurrects a departed Room session',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 let pending;let joining=true;const verify=async()=>joining?session():new Promise(resolve=>{pending=resolve;});const capacity=new Capacity();
 const Room=createWorldRoom({verify,capacity,obstacles:()=>[]});const room=new Room();room.setSimulationInterval=()=>{};room.clock.setInterval=()=>({});room.onCreate({world:'town'});
 const client={sessionId:'socket',auth:{token:'jwt',session:session()},send(){},leave(){}};
 try{await room.onJoin(client,{world:'town'});joining=false;const refreshing=room.refresh(room.entries.get('socket'));room.onLeave(client);pending(session());await refreshing;assert.equal(capacity.count,0);assert.equal(room.entries.size,0);}finally{room.onDispose();room.clock.clear();}
});
test('farm layout changes adopt SQL revision proof instead of an unrecognized local teleport',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 let revision=0;let pond=false;const verify=async()=>session({roomRevision:revision,x:revision?10:0,z:5});
 const capacity=new Capacity();const Room=createWorldRoom({verify,capacity,obstacles:()=>pond?[{kind:'circle',x:0,z:5,radius:4.2}]:[]});const room=new Room();room.setSimulationInterval=()=>{};room.clock.setInterval=()=>({});room.onCreate({world:'town'});
 const client={sessionId:'proof',auth:{token:'jwt'},sent:[],send(type,data){this.sent.push({type,data});},leave(){}};
 try{await room.onJoin(client,{world:'town'});pond=true;revision=1;const entry=room.entries.get('proof');await room.refresh(entry);assert.equal(entry.movement.pose.x,10);assert.equal(client.sent.at(-1).data.x,10);assert.equal(capacity.count,1);
  const unproved=new Movement(session(),[],()=>0);assert.throws(()=>unproved.updateObstacles([{kind:'circle',x:0,z:5,radius:4.2}]),/authoritative position/);assert.equal(unproved.pose.x,0);
 }finally{room.onDispose();room.clock.clear();}
});
test('disconnect during join verification cannot leak a global capacity slot',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 let resolve;const capacity=new Capacity();const Room=createWorldRoom({verify:()=>new Promise(done=>{resolve=done;}),capacity,obstacles:()=>[]});const room=new Room();room.setSimulationInterval=()=>{};room.clock.setInterval=()=>({});room.onCreate({world:'town'});
 const client={sessionId:'departed-before-auth',state:0,auth:{token:'jwt'},send(){},leave(){}};
 try{const joining=room.onJoin(client,{world:'town'});client.state=5;room.onLeave(client);resolve(session());await assert.rejects(joining,/Connection closed/);assert.equal(capacity.count,0);}finally{room.onDispose();room.clock.clear();}
});
test('cached token identity never caches room authorization, expiry, deletion, grants or another token',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createSessionVerifier}=await tsImport('../server/colyseus/auth.ts',import.meta.url);
 let now=0,identities=0,proofs=0,revoked=false;const seen=[];
 const verify=createSessionVerifier('http://127.0.0.1:54329','sb_publishable_test',{now:()=>now,backend:(_url,_key,token)=>({getUser:async()=>{identities++;return token==='a'?id:peerId;},getSession:async()=>{proofs++;seen.push(token);if(revoked)throw new Error('deleted, expired, or revoked');return session({userId:token==='a'?id:peerId});}})});
 assert.equal((await verify('a')).userId,id);await verify('a');assert.equal(identities,1);assert.equal(proofs,2);
 assert.equal((await verify('b')).userId,peerId);assert.equal(identities,2);assert.deepEqual(seen,['a','a','b']);
 revoked=true;await assert.rejects(verify('a'),/Unauthorized/);assert.equal(proofs,4);
 revoked=false;await verify('a');assert.equal(identities,3,'failed live proof invalidates the cached identity');
 now=30001;await verify('a');assert.equal(identities,4,'identity rechecked after thirty seconds');
});
test('identity cache retains at most one hundred tokens',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createSessionVerifier}=await tsImport('../server/colyseus/auth.ts',import.meta.url);
 let identities=0;const verify=createSessionVerifier('http://127.0.0.1:54329','sb_publishable_test',{backend:()=>({getUser:async()=>{identities++;return id;},getSession:async()=>session()})});
 for(let i=0;i<101;i++)await verify(`token-${i}`);assert.equal(identities,101);
 await verify('token-100');assert.equal(identities,101);await verify('token-0');assert.equal(identities,102);
});

test('room persists accepted movement with its checked lease and reconciles database rejection once',async()=>{
 const {tsImport}=await import('tsx/esm/api');const {createWorldRoom}=await tsImport('../server/colyseus/WorldRoom.ts',import.meta.url);
 let now=0,reject=false;const writes=[];
 const Room=createWorldRoom({verify:async()=>session(),capacity:new Capacity(),now:()=>now,obstacles:()=>[],persistPose:async(token,lease,seq,pose)=>{writes.push({token,lease,seq,pose});return{x:reject?0:pose.x,z:5,seq,accepted:!reject,world_id:'town',server_id:'local-1'};}});
 const room=new Room();room.setSimulationInterval=()=>{};room.clock.setInterval=()=>({});room.onCreate({world:'town'});
 const client={sessionId:'writer',auth:{token:'a',session:session()},sent:[],state:0,send(type,value){this.sent.push({type,value});},leave(){}};
 try{
  await room.onJoin(client,{world:'town'});const entry=room.entries.get('writer');now=1000;assert.equal(entry.movement.propose(pose(0,1,5)).accepted,true);
  await room.persist(entry);assert.equal(writes[0].lease,id);assert.equal(writes[0].seq,301);assert.equal(writes[0].pose.x,1);
  room.sendSnapshots();assert.equal(client.sent.at(-1).value.positionWriter,true);
  reject=true;now=1200;entry.movement.propose(pose(1,2,5));await room.persist(entry);
  assert.equal(entry.movement.pose.x,0);assert.equal(client.sent.filter(p=>p.type==='correction').length,1);
  room.onLeave(client);const count=writes.length;await room.persist(entry);assert.equal(writes.length,count,'departed player cannot continue writing positions');
 }finally{room.onDispose();room.clock.clear();}
});
