import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const urls=new Map();
async function moduleUrl(url){
  if(urls.has(url.href))return urls.get(url.href);
  let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const m of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(m[0],'from '+JSON.stringify(await moduleUrl(new URL(m[1]+'.ts',url))));
  const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;urls.set(url.href,result);return result;
}
const chat=await import(await moduleUrl(new URL('../src/pages/game3d/townChat3D.ts',import.meta.url)));
const navigation=await import(await moduleUrl(new URL('../src/pages/game3d/objectWalk3D.ts',import.meta.url)));
const now=10000;
const sender={clientId:'alice-tab',userId:'alice',name:'Alice',x:0,z:0,lastSeen:now};
const self={clientId:'bob-tab',userId:'bob',x:1,z:0};
const packet={v:1,id:'message-1',clientId:sender.clientId,userId:sender.userId,toClientId:self.clientId,text:'Hello neighbour!',sentAt:now,x:0,z:0};

test('nearby chat follows all nine highlighted tiles, including diagonals and the shared tile',()=>{
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)assert.equal(chat.isTownChatNearby3D({x:0,z:0},{x,z}),true);
  for(const p of [{x:2,z:0},{x:0,z:-2},{x:2,z:2}])assert.equal(chat.isTownChatNearby3D({x:0,z:0},p),false);
  assert.equal(chat.isTownChatNearby3D({x:.49,z:-.49},{x:1.49,z:-1.49}),true);
  assert.equal(chat.isTownChatNearby3D({x:.49,z:0},{x:1.51,z:0}),false);
});
test('only fresh players within the sender highlight are chosen as recipients',()=>{
  const peers={near:{...sender,clientId:'near',x:1,z:1},far:{...sender,clientId:'far',x:2,z:0},stale:{...sender,clientId:'stale',x:1,z:0,lastSeen:0}};
  assert.deepEqual(chat.townChatRecipients3D(sender,peers,now).map(p=>p.clientId),['near']);
});
test('received chat requires a known nearby sender and the addressed local client',()=>{
  const received=chat.receiveTownChat3D(packet,self,{'alice-tab':sender},new Set(),now);
  assert.equal(received.text,'Hello neighbour!');assert.equal(received.name,'Alice');
  for(const change of [{toClientId:'other-tab'},{userId:'imposter'},{clientId:'unknown'},{x:8},{sentAt:0}])assert.equal(chat.receiveTownChat3D({...packet,...change},self,{'alice-tab':sender},new Set(),now),null);
  assert.equal(chat.receiveTownChat3D(packet,{...self,x:3},{'alice-tab':sender},new Set(),now),null);
});
test('duplicate messages, empty text, oversized text and invalid coordinates are rejected',()=>{
  assert.equal(chat.receiveTownChat3D(packet,self,{'alice-tab':sender},new Set(['message-1']),now),null);
  for(const change of [{text:'  '},{text:'x'.repeat(241)},{text:5},{x:NaN},{x:25},{id:''},{sentAt:Infinity}])assert.equal(chat.parseTownChat3D({...packet,...change}),null);
  assert.equal(chat.parseTownChat3D({...packet,text:'  Hi\u0000there  '}).text,'Hi there');
});
test('message text stays literal and cannot supply a forged display name',()=>{
  const text='<img src=x onerror=alert(1)>';
  const result=chat.receiveTownChat3D({...packet,text,name:'Admin'},self,{'alice-tab':sender},new Set(),now);
  assert.equal(result.name,'Alice');assert.equal(result.text,text);
});

test('chat dialog opens for a selected player, escapes text, and excludes other conversations',async()=>{
  const source=await readFile(new URL('../src/pages/game3d/TownChatPanel3D.tsx',import.meta.url),'utf8');
  let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  for(const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]){
    const target=match[1].startsWith('.')?await moduleUrl(new URL(`../src/pages/game3d/${match[1].slice(2)}.ts`,import.meta.url)):import.meta.resolve(match[1]);
    js=js.replaceAll(match[0],'from '+JSON.stringify(target));
  }
  const Panel=(await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).default;
  const town={nearbyCount:1,chatReady:true,messages:[{id:'test',clientId:'alice-tab',name:'Alice',text:'<img src=x onerror=alert(1)>',own:false},{id:'other',clientId:'charlie-tab',name:'Charlie',text:'OTHER CONVERSATION',own:false}],sendChat:async()=>({ok:true})};
  assert.equal(renderToStaticMarkup(createElement(Panel,{town,partner:null,inRange:false,onClose:()=>{},onFocusChange:()=>{}})),'');
  const html=renderToStaticMarkup(createElement(Panel,{town,partner:sender,inRange:false,onClose:()=>{},onFocusChange:()=>{}}));
  assert.match(html,/role="dialog"/);assert.ok(html.includes('Chat with Alice'));
  assert.ok(!html.includes('OTHER CONVERSATION'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.match(html,/role="log"/);
  assert.match(html,/maxLength="240"/);
  assert.match(html,/<button[^>]*type="submit"[^>]*disabled=""/);
});

test('conversation history keeps replies and only the outgoing messages for that player',()=>{
  const messages=[{id:'a',clientId:'alice-tab',own:false},{id:'b',clientId:'charlie-tab',own:false},{id:'c',clientId:'self',own:true,toClientId:'alice-tab'},{id:'d',clientId:'self',own:true,toClientId:'charlie-tab'}];
  assert.deepEqual(chat.townConversation3D(messages,'alice-tab').map(m=>m.id),['a','c']);
});
test('approaching a selected player supports town coordinates beyond the house bounds',()=>{
  const target={x:18,z:10};
  const path=navigation.findObjectWalkPath3D({x:12,z:10},target,[],23.5);
  assert.ok(path.length>0);assert.equal(chat.isTownChatNearby3D(path.at(-1),target),true);
});
test('direct chat sends only to the chosen neighbour even when two neighbours are in range',async()=>{
  const {connectTownChat3D}=await import(await moduleUrl(new URL('../src/pages/game3d/townChatConnection3D.ts',import.meta.url)));
  const sent=[],ownMessages=[];
  const channels=new Map();
  const client={channel(topic){if(!channels.has(topic))channels.set(topic,{on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;},send(message){sent.push({topic,...message});return Promise.resolve('ok');},unsubscribe(){return Promise.resolve('ok');},teardown(){}});return channels.get(topic);}};
  const time=Date.now(),peers={bob:{...sender,clientId:'bob-tab',userId:'bob',x:1,z:0,lastSeen:time},charlie:{...sender,clientId:'charlie-tab',userId:'charlie',x:0,z:1,lastSeen:time}};
  const connection=connectTownChat3D(client,{userId:'alice',clientId:'alice-tab',getPose:()=>({x:0,z:0}),getPeers:()=>peers,getProfile:()=>({name:'Alice'}),isTownOnline:()=>true,onMessage:m=>ownMessages.push(m),onReady:()=>{}});
  try {
    assert.equal((await connection.send('Do not send this to another nearby player','unknown-tab')).ok,false);
    assert.equal(sent.length,0);
    assert.equal((await connection.send('Only Bob should receive this','bob-tab')).ok,true);
    assert.equal(sent.length,1);assert.equal(sent[0].payload.toClientId,'bob-tab');assert.equal(sent[0].topic,chat.townChatTopic3D('bob'));
    assert.equal(ownMessages[0].toClientId,'bob-tab');
  }finally{await connection.stop();}
});
