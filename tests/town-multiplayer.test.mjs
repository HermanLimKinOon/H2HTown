import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const urls=new Map();
async function moduleUrl(url){
  if(urls.has(url.href))return urls.get(url.href);
  let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const m of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(m[0],'from '+JSON.stringify(await moduleUrl(new URL(m[1]+'.ts',url))));
  const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;urls.set(url.href,result);return result;
}
const town=await import(await moduleUrl(new URL('../src/pages/game3d/townMultiplayer3D.ts',import.meta.url)));
const sessions=await import(await moduleUrl(new URL('../src/pages/game3d/townTestSession3D.ts',import.meta.url)));
const connection=await import(await moduleUrl(new URL('../src/pages/game3d/townConnection3D.ts',import.meta.url)));
const pose={v:1,clientId:'client-a',userId:'user-a',seq:1,x:2,y:0,z:8,yaw:0,moving:true,running:false};
const profile={...pose,name:'Alice',appearance:{},choice:{model:'farmer'}};

test('town packets reject malformed, non-finite and out-of-world positions',()=>{
  assert.deepEqual(town.parseTownPose3D(pose),pose);
  for(const change of [{x:Infinity},{x:24},{y:99},{yaw:NaN},{seq:-1},{moving:'yes'},{clientId:''},{v:2}])assert.equal(town.parseTownPose3D({...pose,...change}),null);
});
test('presence excludes self, preserves newer movement and removes departed players',()=>{
  const peers=town.townPeersFromPresence3D({'client-a':[profile],'client-me':[{...profile,clientId:'client-me'}]},'client-me',100);
  assert.deepEqual(Object.keys(peers),['client-a']);
  const moved=town.acceptTownPose3D(peers,{...pose,seq:2,x:4},'client-me',200);
  assert.equal(moved['client-a'].x,4);
  assert.equal(town.townPeersFromPresence3D({'client-a':[profile]},'client-me',300,moved)['client-a'].x,4);
  assert.deepEqual(town.townPeersFromPresence3D({},'client-me',400,moved),{});
});
test('movement ignores duplicate, reordered, unknown and mismatched identities',()=>{
  const peers=town.townPeersFromPresence3D({'client-a':[profile]},'self',100);
  for(const change of [{seq:0},{seq:1},{clientId:'unknown'},{userId:'other-user'}])assert.equal(town.acceptTownPose3D(peers,{...pose,...change},'self',200),peers);
});
test('stale peers expire and stalled walking becomes idle',()=>{
  const peers=town.townPeersFromPresence3D({'client-a':[profile]},'self',100);
  assert.equal(town.isTownPeerMoving3D(peers['client-a'],200),true);
  assert.equal(town.isTownPeerMoving3D(peers['client-a'],1200),false);
  assert.deepEqual(town.pruneTownPeers3D(peers,9000),{});
});
test('remote interpolation eases toward positions and takes the shortest rotation',()=>{
  const current={x:0,y:0,z:0,yaw:Math.PI-.1};
  const next=town.interpolateTownPose3D(current,{...pose,x:5,z:0,yaw:-Math.PI+.1},.05);
  assert.ok(next.x>0&&next.x<5);
  assert.ok(next.yaw>current.yaw);
});
test('local test authentication is unavailable for hosted backends or production builds',()=>{
  assert.equal(town.isLocalTownBackend3D('http://127.0.0.1:54329','localhost',true),true);
  assert.equal(town.isLocalTownBackend3D('https://example.supabase.co','localhost',true),false);
  assert.equal(town.isLocalTownBackend3D('http://127.0.0.1:54329','example.com',true),false);
  assert.equal(town.isLocalTownBackend3D('http://127.0.0.1:54329','localhost',false),false);
});
test('two-tab test mode is local-only and seeds independent town positions without mutating the farm',()=>{
  assert.equal(sessions.townTestPlayer3D('?townTest=1',true),'1');
  assert.equal(sessions.townTestPlayer3D('?townTest=2',true),'2');
  assert.equal(sessions.townTestPlayer3D('?townTest=1',false),null);
  assert.equal(sessions.townTestPlayer3D('?townTest=anything',true),null);
  const saved=sessions.seedTownTestSave3D(null,'1'),snapshot=JSON.stringify(saved);
  const other=sessions.seedTownTestSave3D(saved,'2');
  assert.notEqual(saved.player.x,other.player.x);
  assert.equal(other.worldId,'town');
  assert.equal(JSON.stringify(saved),snapshot);
  assert.equal(other.coins,saved.coins);
  assert.deepEqual(other.farmLayout,saved.farmLayout);
});
test('movement uses Broadcast without retracking Presence, and leaving cancels all sends',async()=>{
  let tracks=0,sends=0,unsubscribed=false;
  const channel={on(){return this;},subscribe(callback){queueMicrotask(()=>callback('SUBSCRIBED'));return this;},
    track(){tracks++;return Promise.resolve('ok');},send(){sends++;return Promise.resolve('ok');},
    presenceState(){return {};},unsubscribe(){unsubscribed=true;return Promise.resolve('ok');},teardown(){}};
  const stop=connection.connectTown3D({channel:()=>channel},{userId:'user-a',clientId:'client-a',getPose:()=>pose,getProfile:()=>profile,onPeers:()=>{},onStatus:()=>{}});
  try {
    await new Promise(resolve=>setTimeout(resolve,1200));
    assert.equal(tracks,1,'Repeated Presence tracking disconnects clients on the local rate limit');
    assert.ok(sends>=5);
  } finally {await stop();}
  const sent=sends;await new Promise(resolve=>setTimeout(resolve,150));
  assert.equal(sends,sent);assert.equal(unsubscribed,true);
});
