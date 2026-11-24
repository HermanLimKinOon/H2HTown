import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source=await readFile(new URL('../src/pages/game3d/mmoSpeechBubbleLayout3D.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const bubbles=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const now=10000;
const message=(id,sender_id,body='Hi',receivedAt=now)=>({id,sender_id,body,receivedAt,channel:'local'});

test('speech bubbles use only fresh delivered local messages and newest per user',()=>{
  const messages=[message('1','alice'),message('2','alice','newer'),message('3','bob'),{...message('4','world'),channel:'world'},message('5','history','old',undefined),{...message('6','pending'),pending:true},{...message('7','failed'),failed:true},message('8','future','bad',now+1),message('9',null)];
  delete messages[4].receivedAt;
  assert.deepEqual(bubbles.activeMmoBubbles3D(messages,now).map(m=>m.id),['2','3']);
  assert.deepEqual(bubbles.activeMmoBubbles3D(messages,now,1).map(m=>m.id),['2']);
});
test('expiration never resurrects an older longer message from the same user',()=>{
  const messages=[message('1','alice','x'.repeat(100),5000),message('2','alice','Hi',5500)];
  assert.equal(bubbles.activeMmoBubbles3D(messages,now).length,0);
  assert.equal(bubbles.activeMmoBubbles3D([message('3','bob','Hi',5960)],now).length,0);
  assert.equal(bubbles.mmoBubbleLifetime3D(''),4000);
  assert.equal(bubbles.mmoBubbleLifetime3D('x'.repeat(500)),6000);
});
test('text is bounded by Unicode characters, cleans controls, and preserves literal markup',()=>{
  assert.equal(bubbles.mmoBubbleText3D(null),'');assert.equal(bubbles.mmoBubbleText3D(22),'');
  assert.equal(bubbles.mmoBubbleText3D(' \u0000 \n '),'');
  assert.equal(bubbles.mmoBubbleText3D('Hello\u202e\u0000 friend'),'Hello friend');
  assert.equal(bubbles.mmoBubbleText3D('<img src=x onerror=alert(1)>'),'<img src=x onerror=alert(1)>');
  const text=bubbles.mmoBubbleText3D('😄'.repeat(120));
  assert.equal(Array.from(text).length,100);assert.equal(text.at(-1),'…');
  assert.equal(bubbles.activeMmoBubbles3D([message('1','alice','\u0000')],now).length,0);
});
test('projection hides behind-camera, clipped, invalid, and outside viewport anchors',()=>{
  assert.equal(bubbles.mmoBubbleOnscreen3D({x:0,y:0,z:0},-5),true);
  for(const [ndc,z] of [[{x:0,y:0,z:0},5],[{x:1.1,y:0,z:0},-5],[{x:0,y:-1.1,z:0},-5],[{x:0,y:0,z:1.1},-5],[{x:NaN,y:0,z:0},-5]])assert.equal(bubbles.mmoBubbleOnscreen3D(ndc,z),false);
});
test('greedy layout offsets overlaps, hides crowding, caps count, and clamps mobile edges',()=>{
  const candidate={x:160,y:240,width:100,height:40};
  const placed=bubbles.layoutMmoBubbles3D(Array.from({length:10},(_,i)=>({...candidate,id:String(i)})),320,480);
  assert.equal(placed.length,3);
  for(let i=1;i<placed.length;i++)assert.ok(placed[i].y+placed[i].height<placed[i-1].y);
  const edge=bubbles.layoutMmoBubbles3D([{...candidate,id:'edge',x:0,y:0}],160,200)[0];
  assert.equal(edge.x,8);assert.equal(edge.y,8);
  assert.deepEqual(bubbles.layoutMmoBubbles3D([{...candidate,id:'off',x:-1}],320,480),[]);
  assert.deepEqual(bubbles.layoutMmoBubbles3D([{...candidate,id:'wide',width:500}],320,480),[]);
  assert.equal(bubbles.layoutMmoBubbles3D(Array.from({length:10},(_,i)=>({...candidate,id:String(i),x:60+i*130})),1600,800).length,5);
  assert.deepEqual(bubbles.layoutMmoBubbles3D([{...candidate,id:'a'}],0,0),[]);
});
