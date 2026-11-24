import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../src/pages/game3d/mmoCommunication3D.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const comm=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const base={id:'1',channel:'local',sender_id:'alice',sender_name:'Alice',body:'Hello',kind:'text',created_at:'2026-11-20T00:00:00.000Z',group_id:null,recipient_id:null,world_id:'town',server_id:'local-1',origin:{x:1,z:2}};
test('a replaced player lease explains the competing game tab',()=>{
 assert.match(comm.mmoErrorText3D({message:'Inactive client lease'}),/another tab/i);
});
test('communication packets reject invalid channel, identity, time, content and coordinates',()=>{
  assert.equal(comm.parseMmoMessage3D(base,true,100).receivedAt,100);
  for(const invalid of [{channel:'admin'},{id:'<script>'},{body:'x'.repeat(401)},{created_at:'yesterday'},{origin:{x:NaN,z:2}},{sender_name:''}])assert.equal(comm.parseMmoMessage3D({...base,...invalid}),null);
});
test('history never becomes a new speech bubble and live metadata survives history reload',()=>{
  const live=comm.parseMmoMessage3D(base,true,100),history=comm.parseMmoMessage3D(base);
  assert.equal(history.receivedAt,undefined);
  assert.equal(comm.mergeMmoMessages3D([live],[history])[0].receivedAt,100);
});
test('retries deduplicate server IDs, reconcile optimistic nonce, and preserve decimal ID ordering',()=>{
  const optimistic={...base,id:'pending-abc',nonce:'abc',pending:true};
  const confirmed={...base,id:'9007199254740994',nonce:'abc'};
  const earlier={...base,id:'9007199254740993'};
  const merged=comm.mergeMmoMessages3D([optimistic],[confirmed,earlier,confirmed]);
  assert.deepEqual(merged.map(m=>m.id),['9007199254740993','9007199254740994']);
  assert.equal(merged.some(m=>m.pending),false);
});
test('server errors are translated into useful player-facing text',()=>{
  assert.match(comm.mmoErrorText3D({message:'rate_limited'}),/wait|slow/i);
  assert.match(comm.mmoErrorText3D({message:'not_in_group'}),/party|guild|group/i);
});
