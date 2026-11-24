import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

const env=Object.fromEntries((await readFile(new URL('../.env',import.meta.url),'utf8')).split('\n').filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const n=line.indexOf('=');return [line.slice(0,n),line.slice(n+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=env.VITE_PUBLIC_SUPABASE_URL,key=env.VITE_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Only local Supabase is allowed.');
const modules=new Map();
async function moduleUrl(url){
  if(modules.has(url.href))return modules.get(url.href);
  let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(match[0],'from '+JSON.stringify(await moduleUrl(new URL(match[1]+'.ts',url))));
  const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;modules.set(url.href,result);return result;
}
const {connectTown3D}=await import(await moduleUrl(new URL('../src/pages/game3d/townConnection3D.ts',import.meta.url)));
const {connectTownChat3D}=await import(await moduleUrl(new URL('../src/pages/game3d/townChatConnection3D.ts',import.meta.url)));
const {townChatTopic3D}=await import(await moduleUrl(new URL('../src/pages/game3d/townChat3D.ts',import.meta.url)));
const clients=Array.from({length:4},(_,i)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:`nearby-chat-test-${i}-${crypto.randomUUID()}`}}));
const stops=[],chats=[],deniedChannels=[];
async function waitFor(check,label){const end=Date.now()+12000;while(Date.now()<end){if(check())return;await new Promise(r=>setTimeout(r,50));}throw new Error(`Timed out: ${label}`);}
try {
  const users=[];
  for(const client of clients.slice(0,3)){
    const result=await client.auth.signUp({email:`town-chat-${crypto.randomUUID()}@example.test`,password:`Test-${crypto.randomUUID()}!`});
    assert.equal(result.error,null);assert.ok(result.data.session);users.push(result.data.user);
    await client.realtime.setAuth(result.data.session.access_token);
  }
  const prefix=crypto.randomUUID().slice(0,8),ids=[0,1,2].map(i=>`chat-${prefix}-${i}`);
  const poses=[{x:18,y:0,z:18,yaw:0,moving:false,running:false},{x:19,y:0,z:18,yaw:0,moving:false,running:false},{x:16,y:0,z:18,yaw:0,moving:false,running:false}];
  const peers=[{},{},{}],online=[false,false,false],ready=[false,false,false],messages=[[],[],[]];
  for(let i=0;i<3;i++){
    const options={userId:users[i].id,clientId:ids[i],getPose:()=>poses[i],getProfile:()=>({name:`Chat tester ${i+1}`,appearance:{},choice:{model:'farmer'}})};
    stops.push(connectTown3D(clients[i],{...options,onPeers:p=>{peers[i]=p;},onStatus:s=>{online[i]=s==='online';}}));
    chats.push(connectTownChat3D(clients[i],{...options,getPeers:()=>peers[i],isTownOnline:()=>online[i],onMessage:m=>messages[i].push(m),onReady:r=>{ready[i]=r;}}));
  }
  await waitFor(()=>online.every(Boolean)&&ready.every(Boolean)&&peers[0][ids[1]]&&peers[0][ids[2]]&&peers[1][ids[0]],'three town and chat connections');
  let distantInboxPackets=0,sharedTownChatPackets=0;
  clients[2].getChannels().find(c=>c.topic===`realtime:${townChatTopic3D(users[2].id)}`).on('broadcast',{event:'nearby-chat'},()=>distantInboxPackets++);
  clients[2].getChannels().find(c=>c.topic==='realtime:h2h-town-3d-v1').on('broadcast',{event:'nearby-chat'},()=>sharedTownChatPackets++);
  assert.equal((await chats[0].send('Hello nearby!',ids[1])).ok,true);
  await waitFor(()=>messages[1].some(m=>m.text==='Hello nearby!'),'nearby recipient receives chat');
  await waitFor(()=>messages[0].some(m=>m.own&&m.text==='Hello nearby!'),'sender sees own message');
  assert.equal(messages[2].length,0);assert.equal(distantInboxPackets,0);assert.equal(sharedTownChatPackets,0);
  console.log('PASS: a highlighted neighbour receives the message; the distant inbox and shared town receive no chat packet.');
  poses[2]={...poses[2],x:18,z:19};
  await waitFor(()=>peers[0][ids[2]]?.x===18,'second neighbour enters range');
  await waitFor(()=>Date.now()-messages[0].at(-1).sentAt>=1100,'selected-player chat cooldown');
  assert.equal((await chats[0].send('For the selected player only',ids[1])).ok,true);
  await waitFor(()=>messages[1].some(m=>m.text==='For the selected player only'),'selected player receives direct chat');
  assert.equal(messages[2].length,0);assert.equal(distantInboxPackets,0);
  console.log('PASS: another nearby player receives no packet when a different player is selected.');
  poses[2]={...poses[2],x:16,z:18};
  await waitFor(()=>peers[0][ids[2]]?.x===16,'unselected neighbour leaves range');
  poses[1]={...poses[1],x:21};
  await waitFor(()=>peers[0][ids[1]]?.x===21,'neighbour leaves highlighted area');
  await waitFor(()=>Date.now()-messages[0].at(-1).sentAt>=1100,'chat cooldown before out-of-range send');
  const rejected=await chats[0].send('You should not hear this',ids[1]);
  assert.equal(rejected.ok,false);assert.match(rejected.message,/not inside/);
  console.log('PASS: sending is blocked when no players are inside the highlighted tiles.');
  poses[0]={...poses[0],x:17};
  await waitFor(()=>peers[2][ids[0]]?.x===17,'sender moves beside third player');
  const sentAt=messages[0].at(-1).sentAt;
  await waitFor(()=>Date.now()-sentAt>=1100,'chat cooldown');
  assert.equal((await chats[0].send('Hello new neighbour!',ids[2])).ok,true);
  await waitFor(()=>messages[2].some(m=>m.text==='Hello new neighbour!'),'new nearby player receives message');
  assert.equal(messages[1].length,2);
  console.log('PASS: moving changes who can hear the next message.');
  const denied=async(client,topic)=>new Promise(resolve=>{
    const channel=client.channel(topic,{config:{private:true}});deniedChannels.push(channel);
    const timer=setTimeout(()=>resolve('timeout'),8000);
    channel.subscribe(status=>{if(status==='SUBSCRIBED'||status==='CHANNEL_ERROR'){clearTimeout(timer);resolve(status);}});
  });
  assert.equal(await denied(clients[2],townChatTopic3D(users[1].id)),'CHANNEL_ERROR');
  assert.equal(await denied(clients[3],townChatTopic3D(users[0].id)),'CHANNEL_ERROR');
  console.log('PASS: another player and an unauthenticated client cannot subscribe to someone else’s inbox.');
} finally {
  await Promise.all(chats.map(chat=>chat.stop()));await Promise.all(stops.map(stop=>stop()));
  await Promise.all(clients.map(async client=>{await client.removeAllChannels();client.realtime.disconnect();client.auth.stopAutoRefresh();}));
  deniedChannels.forEach(channel=>channel.teardown());
  console.log('Cleanup: chat and town test connections closed.');
}
