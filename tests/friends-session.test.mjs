import test from 'node:test';
import assert from 'node:assert/strict';
import {runningFriendsSession} from '../server/friends/session.mjs';
const session={url:'https://friends.example.com/game-3d',pid:123,ports:{gateway:3002,multiplayer:2569}};
const healthy={isProcessAlive:()=>true,fetchImpl:async(url,options)=>{assert.equal(url,'http://127.0.0.1:3002/multiplayer/health');assert.equal(options.headers.Host,'friends.example.com');return {ok:true,json:async()=>({ok:true,players:0,limit:10})};}};
test('reuses a live recorded friends session after validating its gateway',async()=>assert.equal(await runningFriendsSession(session,healthy),session));
test('does not reuse a dead process or unhealthy service',async()=>{
 assert.equal(await runningFriendsSession(session,{...healthy,isProcessAlive:()=>false}),null);
 assert.equal(await runningFriendsSession(session,{...healthy,fetchImpl:async()=>({ok:false})}),null);
 assert.equal(await runningFriendsSession(session,{...healthy,fetchImpl:async()=>{throw Error('offline');}}),null);
 assert.equal(await runningFriendsSession(session,{...healthy,fetchImpl:async()=>({ok:true,json:async()=>({ok:true})})}),null);
});
test('rejects stale or malformed session records before making a request',async()=>{
 for(const bad of [null,{}, {...session,pid:-1},{...session,url:'http://localhost/game-3d'},{...session,url:'https://friends.example.com/other'},{...session,ports:{gateway:4000,multiplayer:2569}}])assert.equal(await runningFriendsSession(bad,{...healthy,fetchImpl:()=>{throw Error('must not fetch');}}),null);
});
