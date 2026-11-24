import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const mockSdk=`data:text/javascript;base64,${Buffer.from("export class Client { constructor(endpoint) { return globalThis.__h2hColyseusMock.create(endpoint); } }").toString('base64')}`;
const urls=new Map();
async function moduleUrl(url){if(urls.has(url.href))return urls.get(url.href);let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]){const target=match[1]==='@colyseus/sdk'?mockSdk:match[1].startsWith('.')?await moduleUrl(new URL(`${match[1]}.ts`,url)):import.meta.resolve(match[1]);js=js.replaceAll(match[0],`from ${JSON.stringify(target)}`);}const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;urls.set(url.href,result);return result;}
const {connectColyseus3D,parseColyseusSnapshot3D,normalizeColyseusWorld3D}=await import(await moduleUrl(new URL('../src/pages/game3d/colyseusConnection3D.ts',import.meta.url)));
const pause=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const pose={x:0,y:0,z:8,yaw:0,moving:false,running:false};
function peer(clientId='peer',userId='other',extra={}){return{v:1,clientId,userId,name:'Other',seq:1,...pose,appearance:{},choice:{model:'farmer'},lastSeen:0,...extra};}
function room(id='self-session'){
 const handlers=new Map(),events=new Map();
 return{sessionId:id,reconnection:{enabled:true},sent:[],leaveCount:0,onMessage(type,cb){handlers.set(type,cb);return()=>handlers.delete(type);},onError(cb){events.set('error',cb);},onLeave(cb){events.set('leave',cb);},onDrop(cb){events.set('drop',cb);},send(type,value){this.sent.push({type,value});},async leave(consented){assert.equal(consented,true);this.leaveCount++;events.get('leave')?.(4000,'consented');},receive(type,value){handlers.get(type)?.(value);},event(type,...args){events.get(type)?.(...args);}};
}
function setup(t,extra={}){
 t.mock.timers.enable({apis:['setTimeout','Date'],now:10000});
 const joins=[],sdks=[],statuses=[],errors=[],updates=[],corrections=[],infos=[];
 let token='first-jwt',authUser='self',joinHandler,authHandler,currentPose={...pose};
 const client={auth:{async getSession(){if(authHandler)return await authHandler();return{data:{session:{user:{id:authUser},access_token:token}},error:null};}}};
 globalThis.__h2hColyseusMock={create(endpoint){const sdk={endpoint,auth:{},async joinOrCreate(name,options){joins.push({name,options,token:this.auth.token});return joinHandler?await joinHandler():room(`self-${joins.length}`);}};sdks.push(sdk);return sdk;}};
 const connection=connectColyseus3D({endpoint:'ws://127.0.0.1:2567',client,userId:'self',world:'town',getPose:()=>currentPose,onPeers:value=>updates.push(value),onStatus:value=>statuses.push(value),onError:value=>errors.push(value),onCorrection:value=>corrections.push(value),onRoomInfo:value=>infos.push(value),...extra});
 t.after(()=>connection.stop());
 return{connection,joins,sdks,statuses,errors,updates,corrections,infos,setToken:next=>token=next,setAuthUser:next=>authUser=next,setJoin:next=>joinHandler=next,setAuth:next=>authHandler=next,setPose:next=>currentPose=next};
}
const packet=(selfId,extra={})=>({world:'town',serverId:'local-1',selfId,players:[peer(selfId,'self'),peer()],count:2,limit:10,...extra});

test('joins normalized farm with current Supabase JWT and sends only pose fields every100ms',async t=>{
 const env=setup(t,{world:'farm'}),joined=room();env.setJoin(()=>joined);await pause();assert.equal(env.statuses.at(-1),'online');assert.equal(joined.reconnection.enabled,false);
 assert.deepEqual(env.joins[0],{name:'h2h_world',options:{world:'farm:self',serverId:'local-1'},token:'first-jwt'});
 assert.deepEqual(Object.keys(joined.sent[0].value).sort(),['moving','running','seq','x','y','yaw','z']);assert.equal(joined.sent[0].value.seq,1);
 env.setPose({...pose,x:1,moving:true,running:true});t.mock.timers.tick(100);assert.equal(joined.sent.at(-1).value.x,1);assert.equal(joined.sent.at(-1).value.seq,2);
 assert.equal(normalizeColyseusWorld3D('house','self'),null);
});
test('snapshots validate world/server/self, exclude own user, normalize peers, and replace departed players',async t=>{
 const env=setup(t),joined=room();env.setJoin(()=>joined);await pause();joined.receive('snapshot',packet(joined.sessionId));assert.deepEqual(Object.keys(env.updates.at(-1)),['peer']);assert.equal(env.updates.at(-1).peer.lastSeen,10000);assert.equal(env.infos.at(-1).count,2);
 const count=env.updates.length;for(const change of[{world:'farm:other'},{serverId:'other'},{selfId:'forged'},{limit:100},{players:[peer('bad','other',{x:Infinity})]},{players:[peer(),peer()]}])joined.receive('snapshot',packet(joined.sessionId,change));assert.equal(env.updates.length,count);
 joined.receive('snapshot',packet(joined.sessionId,{players:[peer('duplicate-self-tab','self')],count:1}));assert.deepEqual(env.updates.at(-1),{});
});
test('older peer sequences cannot rewind movement and stale peers disappear without accepting invalid payloads',async t=>{
 const env=setup(t),joined=room();env.setJoin(()=>joined);await pause();joined.receive('snapshot',packet(joined.sessionId,{players:[peer('peer','other',{seq:4,x:4})]}));
 for(let i=0;i<4;i++){t.mock.timers.tick(500);joined.receive('snapshot',packet(joined.sessionId,{players:[peer('peer','other',{seq:3,x:1})]}));assert.equal(env.updates.at(-1).peer.x,4);}
 t.mock.timers.tick(600);assert.deepEqual(env.updates.at(-1),{});joined.receive('snapshot',packet(joined.sessionId,{players:[peer('peer','other',{seq:3,x:1})]}));assert.deepEqual(env.updates.at(-1),{});
});
test('corrections are bounded literal poses and invalid corrections cannot move the player',async t=>{
 const env=setup(t),joined=room();env.setJoin(()=>joined);await pause();joined.receive('correction',{...pose,x:2,userId:'forged'});assert.deepEqual(env.corrections,[{...pose,x:2}]);
 for(const invalid of[{...pose,x:NaN},{...pose,x:24},{...pose,y:5},{...pose,moving:true}])joined.receive('correction',invalid);assert.equal(env.corrections.length,1);
});
test('reconnect waits old room leave, refreshes JWT, and ignores late old-room messages',async t=>{
 const env=setup(t),first=room('first'),second=room('second'),left=deferred();let count=0;env.setJoin(()=>++count===1?first:second);await pause();first.leave=()=>{first.leaveCount++;return left.promise;};
 first.receive('snapshot',packet(first.sessionId));first.event('drop',1006,'dropped');assert.equal(env.statuses.at(-1),'reconnecting');assert.deepEqual(env.updates.at(-1),{});env.setToken('refreshed-jwt');t.mock.timers.tick(500);await pause();assert.equal(env.joins.length,1);
 left.resolve();await pause();assert.equal(env.joins.length,2);assert.equal(env.joins[1].token,'refreshed-jwt');const updates=env.updates.length;first.receive('snapshot',packet(first.sessionId));first.receive('correction',{...pose,x:3});assert.equal(env.updates.length,updates);assert.equal(env.corrections.length,0);
});
test('stop during a pending join leaves its eventual room and resolves closed without late callbacks or timers',async t=>{
 const env=setup(t),pending=deferred(),joined=room();env.setJoin(()=>pending.promise);await pause();let closed=false;env.connection.closed.then(()=>closed=true);const stopping=env.connection.stop();await pause();assert.equal(closed,false);const count=env.statuses.length;
 pending.resolve(joined);await stopping;assert.equal(closed,true);assert.equal(joined.leaveCount,1);assert.equal(joined.sent.length,0);assert.equal(env.statuses.length,count);t.mock.timers.tick(30000);await pause();assert.equal(env.joins.length,1);
});
test('authentication mismatch never joins, retries with fresh identity token, and never creates accounts',async t=>{
 const env=setup(t);env.setAuthUser('other-account');await pause();assert.equal(env.joins.length,0);assert.equal(env.statuses.at(-1),'error');assert.match(env.errors.at(-1),/session needs to reconnect/);
 env.setAuthUser('self');env.setToken('new-jwt');t.mock.timers.tick(500);await pause();assert.equal(env.joins[0].token,'new-jwt');assert.equal(env.statuses.at(-1),'online');
});
test('capacity and server failures have useful sanitized errors without token leakage',async t=>{
 const env=setup(t);env.setJoin(()=>{throw{message:'Server full',code:503,token:'NEVER-PRINT-THIS'};});await pause();assert.match(env.errors.at(-1),/full \(10 players\)/);assert.equal(env.statuses.at(-1),'error');assert.equal(env.errors.some(value=>value.includes('NEVER-PRINT')),false);
 env.setJoin(()=>{throw new Error('connect ECONNREFUSED secret.jwt.body');});t.mock.timers.tick(500);await pause();assert.match(env.errors.at(-1),/npm run game:server/);assert.equal(env.errors.some(value=>value.includes('secret.jwt')),false);
});
test('duplicate player connections explain separate accounts instead of blaming the server',async t=>{
 const env=setup(t);env.setJoin(()=>{throw new Error('Already connected');});await pause();
 assert.match(env.errors.at(-1),/already connected in another tab/i);
 assert.match(env.errors.at(-1),/different.*player|separate.*player/i);
 assert.doesNotMatch(env.errors.at(-1),/npm run game:server/);
});
test('invalid remote endpoints are rejected before session access or sending JWTs',async t=>{
 const env=setup(t,{endpoint:'wss://remote.example.com'});await pause();assert.equal(env.sdks.length,0);assert.equal(env.joins.length,0);assert.equal(env.statuses.at(-1),'error');
});
test('friends client connects only through its explicitly trusted same-origin HTTPS gateway',async t=>{
 const env=setup(t,{endpoint:'https://h2h-test.trycloudflare.com/multiplayer',friendsOrigin:'https://h2h-test.trycloudflare.com'});await pause();
 assert.equal(env.joins.length,1);assert.equal(env.statuses.at(-1),'online');
});
test('friends client supports an explicitly trusted named game origin',async t=>{
 const env=setup(t,{endpoint:'https://play.h2haigroup.com/multiplayer',friendsOrigin:'https://play.h2haigroup.com'});await pause();assert.equal(env.joins.length,1);
});
test('silent rooms trigger one watchdog reconnect and stopped connections cannot reconnect',async t=>{
 const env=setup(t),joined=room();env.setJoin(()=>joined);await pause();t.mock.timers.tick(3600);await pause();assert.equal(env.statuses.at(-1),'reconnecting');assert.deepEqual(env.updates.at(-1),{});await env.connection.stop();t.mock.timers.tick(30000);await pause();assert.equal(env.joins.length,1);
});
test('oversized avatars and malicious snapshot shapes are rejected before rendering',()=>{
 assert.equal(parseColyseusSnapshot3D(packet('self',{players:[peer('peer','other',{appearance:{payload:'x'.repeat(25000)}})]}),'town','local-1','self','self'),null);
 assert.equal(parseColyseusSnapshot3D(null,'town','local-1','self','self'),null);
 assert.equal(parseColyseusSnapshot3D(packet('self',{count:NaN}),'town','local-1','self','self'),null);
});
