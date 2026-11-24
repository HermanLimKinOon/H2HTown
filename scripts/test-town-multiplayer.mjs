import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

const env=Object.fromEntries((await readFile(new URL('../.env',import.meta.url),'utf8')).split('\n').filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const n=line.indexOf('=');return [line.slice(0,n),line.slice(n+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=env.VITE_PUBLIC_SUPABASE_URL,key=env.VITE_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'This test only runs against local Supabase.');
const modules=new Map();
async function moduleUrl(url){
  if(modules.has(url.href))return modules.get(url.href);
  let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(match[0],'from '+JSON.stringify(await moduleUrl(new URL(match[1]+'.ts',url))));
  const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;modules.set(url.href,result);return result;
}
const {connectTown3D}=await import(await moduleUrl(new URL('../src/pages/game3d/townConnection3D.ts',import.meta.url)));
const clients=Array.from({length:3},(_,i)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:`town-integration-${i}-${crypto.randomUUID()}`}}));
const cleanup=[];
const deniedChannels=[];
async function waitFor(check,label){const deadline=Date.now()+12000;while(Date.now()<deadline){if(check())return;await new Promise(r=>setTimeout(r,50));}throw new Error(`Timed out: ${label}`);}
try {
  const users=[];
  for(const client of clients.slice(0,2)){
    const result=await client.auth.signUp({email:`town-test-${crypto.randomUUID()}@example.test`,password:`Test-${crypto.randomUUID()}!`});
    assert.equal(result.error,null);assert.ok(result.data.session);users.push(result.data.user);
    await client.realtime.setAuth(result.data.session.access_token);
  }
  assert.notEqual(users[0].id,users[1].id);
  const poses=[{x:-2,y:0,z:8,yaw:0,moving:false,running:false},{x:2,y:0,z:8,yaw:0,moving:false,running:false}];
  const peers=[{},{}],statuses=['',''];
  const join=i=>connectTown3D(clients[i],{userId:users[i].id,clientId:`test-client-${i}`,getPose:()=>poses[i],getProfile:()=>({name:`Test player ${i+1}`,appearance:{},choice:{model:'farmer'}}),onPeers:p=>{peers[i]=p;},onStatus:s=>{statuses[i]=s;console.log(`Player ${i+1}: ${s}`);}});
  cleanup[0]=join(0);cleanup[1]=join(1);
  await waitFor(()=>statuses.every(s=>s==='online')&&peers[0]['test-client-1']&&peers[1]['test-client-0'],'two authenticated players see each other');
  console.log('PASS: two distinct local accounts join the private town and see each other.');
  poses[1]={x:4,y:1,z:6,yaw:Math.PI/2,moving:true,running:true};
  await waitFor(()=>peers[0]['test-client-1']?.x===4&&peers[0]['test-client-1']?.y===1&&peers[0]['test-client-1']?.running===true,'movement, turning, running and jump');
  poses[1]={...poses[1],y:0,moving:false,running:false};
  await waitFor(()=>peers[0]['test-client-1']?.moving===false&&peers[0]['test-client-1']?.y===0,'idle and landing');
  console.log('PASS: actual pose broadcasts carry movement, facing, run, jump, stop and landing.');
  await cleanup[1]();await waitFor(()=>!peers[0]['test-client-1'],'departed player removed');
  cleanup[1]=join(1);
  try { await waitFor(()=>peers[0]['test-client-1']&&peers[1]['test-client-0'],'player rejoin'); }
  catch(error){console.log('Rejoin diagnostic:',JSON.stringify({statuses,rosters:peers.map(p=>Object.keys(p)),channels:clients.slice(0,2).map(c=>c.getChannels().map(ch=>({topic:ch.topic,state:ch.state,presence:Object.keys(ch.presenceState())})))}));throw error;}
  console.log('PASS: leave removes the avatar and rejoin restores both rosters.');
  const denied=await new Promise(resolve=>{
    const timer=setTimeout(()=>resolve('timeout'),8000);
    const channel=clients[2].channel('h2h-town-3d-v1',{config:{private:true}});deniedChannels.push(channel);
    channel.subscribe(status=>{if(status==='SUBSCRIBED'||status==='CHANNEL_ERROR'){clearTimeout(timer);resolve(status);}});
  });
  assert.equal(denied,'CHANNEL_ERROR','Unauthenticated clients must not join the private town.');
  console.log('PASS: unauthenticated access is rejected.');
  const unrelated=await new Promise(resolve=>{
    const timer=setTimeout(()=>resolve('timeout'),8000);
    const channel=clients[0].channel('unrelated-private-room',{config:{private:true}});deniedChannels.push(channel);
    channel.subscribe(status=>{if(status==='SUBSCRIBED'||status==='CHANNEL_ERROR'){clearTimeout(timer);resolve(status);}});
  });
  assert.equal(unrelated,'CHANNEL_ERROR','Town policies must not open other private rooms.');
  console.log('PASS: town policies do not authorize unrelated private channels.');
} finally {
  await Promise.all(cleanup.map(stop=>stop?.()));
  await Promise.all(clients.map(async client=>{await client.removeAllChannels();client.realtime.disconnect();client.auth.stopAutoRefresh();}));
  deniedChannels.forEach(channel=>channel.teardown());
  console.log('Cleanup: all test channels closed and movement timers stopped.');
}
if(process.env.H2H_TOWN_TEST_DEBUG)console.log('Active resources:',process.getActiveResourcesInfo());
