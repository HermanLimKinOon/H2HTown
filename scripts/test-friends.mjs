import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {Client} from '@colyseus/sdk';
import {validFriendsOrigin} from '../server/friends/config.mjs';
for(const file of ['.env.local','.env']){try{loadEnvFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
const session=JSON.parse(await readFile('.local/friends-session.json','utf8'));const origin=new URL(session.url).origin;
assert.ok(validFriendsOrigin(origin),'Exact public HTTPS origin required');
if(!new URL(origin).hostname.endsWith('.trycloudflare.com')){const named=JSON.parse(await readFile('.local/friends-named.json','utf8'));assert.equal(origin,named.origin,'Test only the configured permanent game origin');}
const key=process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;if(!key?.startsWith('sb_publishable_'))assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
const actors=[];const pause=ms=>new Promise(done=>setTimeout(done,ms));
const check=async(fn,label)=>{for(let n=0;n<100;n++){if(await fn())return;await pause(100);}throw new Error(`Timed out: ${label}`);};
const rpc=async(a,name,args)=>{const result=await a.client.rpc(name,args);if(result.error)throw new Error(`${name} failed (${result.error.code||'request'})`);return result.data;};
try{
 const anonymous=await fetch(`${origin}/supabase/rest/v1/rpc/mmo_connect`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({p_client:crypto.randomUUID(),p_name:'Not signed in',p_world:'town',p_server:'local-1'})});assert.ok([401,403].includes(anonymous.status),'Game connection requires login');
 const page=await fetch(`${origin}/game-3d`);assert.equal(page.status,200);assert.match(await page.text(),/<html/);
 assert.equal((await fetch(`${origin}/game/items/hoe.svg`)).status,200,'Shared 3D hotbar artwork loads');
 for(const path of ['/game','/.env','/src/main.tsx','/supabase/auth/v1/admin/users','/supabase/rest/v1/users','/assets/x.js.map'])assert.equal((await fetch(origin+path)).status,404,path);
 assert.equal((await fetch(`${origin}/multiplayer/health`,{headers:{Origin:'https://evil.example'}})).status,403);
 for(let n=0;n<2;n++){
  const client=createClient(`${origin}/supabase`,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Origin:origin}}});
  const a={client,lease:crypto.randomUUID(),seq:0,snapshot:null,pose:{x:0,y:0,z:8,yaw:0,moving:false,running:false},timer:null,stopped:false};actors.push(a);
  const auth=await client.auth.signUp({email:`friend-${crypto.randomUUID()}@example.test`,password:`Local-${crypto.randomUUID()}!`});if(auth.error||!auth.data.session)throw new Error('Public test signup failed');a.userId=auth.data.user.id;
  const connected=await rpc(a,'mmo_connect',{p_client:a.lease,p_name:`Tunnel test ${n+1}`,p_world:'town',p_server:'local-1'});a.pose.x=connected.presence.x;a.pose.z=connected.presence.z;
  const keep=async()=>{if(a.stopped)return;if(a.snapshot?.positionWriter){a.timer=setTimeout(keep,500);return;}try{const tick=await rpc(a,'mmo_tick',{p_client:a.lease,p_seq:++a.seq,p_x:a.pose.x,p_z:a.pose.z});if(tick.accepted===false&&!a.snapshot?.positionWriter)a.tickRejected=true;}catch{a.tickError=true;}if(!a.stopped)a.timer=setTimeout(keep,500);};await keep();
  const sdk=new Client(`${origin}/multiplayer`,{headers:{Origin:origin}});sdk.auth.token=auth.data.session.access_token;
  a.room=await sdk.joinOrCreate('h2h_world',{world:'town',serverId:'local-1'});a.room.reconnection.enabled=false;a.room.onMessage('snapshot',value=>{a.snapshot=value;});a.room.onMessage('correction',p=>{a.pose={...a.pose,...p};});a.room.onError(()=>{});
 }
 await check(()=>actors.every(a=>a.snapshot?.players.some(p=>p.userId===actors[0].userId)&&a.snapshot?.players.some(p=>p.userId===actors[1].userId)),'two public players visible');
 await check(()=>actors.every(a=>a.snapshot?.positionWriter===true),'server owns database position updates');
 const sender=actors[0],receiver=actors[1];const before=sender.pose.x;sender.pose.x+=0.2;sender.room.send('pose',{...sender.pose,seq:1,moving:true});
 await check(()=>receiver.snapshot?.players.some(p=>p.userId===sender.userId&&p.x>before+0.1),'movement through public WSS');
 assert.equal(actors.some(a=>a.tickError),false);
 const message=await rpc(sender,'mmo_send',{p_channel:'local',p_body:'Tunnel delivery verification',p_nonce:crypto.randomUUID(),p_target:null,p_kind:'text'});
 const history=await rpc(receiver,'mmo_history',{p_channel:'local',p_target:null,p_before:null,p_before_id:null,p_limit:30});
 assert.ok(history.some(item=>item.id===message.id&&item.sender_id===sender.userId),'Local chat delivered to nearby remote player');
 // Confirm the public realtime path actually upgrades to a websocket through the gateway.
 const channel=sender.client.channel(`friends-smoke-${crypto.randomUUID()}`);
 await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Public realtime websocket did not connect')),10000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);done();}else if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(new Error('Public realtime channel rejected'));}});});
 await sender.client.removeChannel(channel);
 // Short curved steps hug the fountain rim. Both independent position validators
 // must agree; the old chord-only checks repeatedly corrected these positions.
 let rimCorrections=0,poseSeq=2;sender.room.onMessage('correction',()=>{rimCorrections++;});
 const advance=async(x,z)=>{sender.pose={...sender.pose,x,z};sender.room.send('pose',{...sender.pose,seq:poseSeq++,moving:true});await pause(120);};
 while(Math.abs(sender.pose.x-2.35001)>.001)await advance(sender.pose.x+Math.sign(2.35001-sender.pose.x)*Math.min(.35,Math.abs(2.35001-sender.pose.x)),sender.pose.z);
 while(sender.pose.z> -6+.001)await advance(sender.pose.x,Math.max(-6,sender.pose.z-.35));
 for(let step=1;step<=40;step++){const angle=step*.03;await advance(2.35001*Math.cos(angle),-6+2.35001*Math.sin(angle));}
 const finalRim={x:sender.pose.x,z:sender.pose.z};
 await check(()=>sender.snapshot?.players.some(p=>p.userId===sender.userId&&Math.hypot(p.x-finalRim.x,p.z-finalRim.z)<1e-5),'final fountain rim position accepted by movement server');
 await pause(700);
 assert.equal(rimCorrections,0,'Colyseus must not snap valid fountain rim movement back');
 assert.equal(Boolean(sender.tickRejected),false,'Supabase must not reject the same rim movement');
 console.log('PASS: public page; restricted routes; foreign origin rejected; two accounts authenticated; Town presence; movement over WSS; Supabase realtime websocket; nearby local chat delivery; fountain rim with no corrections.');
}catch(error){console.error(`FAIL: ${String(error.message).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[redacted]').slice(0,180)}`);process.exitCode=1;}
finally{for(const a of actors){a.stopped=true;clearTimeout(a.timer);await a.room?.leave().catch(()=>{});await a.client.rpc('mmo_leave',{p_client:a.lease});await a.client.removeAllChannels();await a.client.realtime.disconnect();a.client.auth.stopAutoRefresh();}}
