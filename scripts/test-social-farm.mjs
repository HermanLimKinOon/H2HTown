import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import ts from 'typescript';

// Real throwaway accounts and checked RPCs only, restricted to the existing local stack.
const env=Object.fromEntries((await readFile(new URL('../.env',import.meta.url),'utf8')).split('\n').filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const split=line.indexOf('=');return[line.slice(0,split),line.slice(split+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=env.VITE_PUBLIC_SUPABASE_URL,key=env.VITE_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Smoke test permits local Supabase only.');
const urls=new Map();
async function moduleUrl(url){if(urls.has(url.href))return urls.get(url.href);let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(match[0],`from ${JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`,url)))}`);const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;urls.set(url.href,result);return result;}
const {createSocialFarmClient3D}=await import(await moduleUrl(new URL('../src/pages/game3d/socialFarmClient3D.ts',import.meta.url)));
const {freshGame3DSave}=await import(await moduleUrl(new URL('../src/pages/game3d/game3d.ts',import.meta.url)));
const {ownedFarmSnapshot3D}=await import(await moduleUrl(new URL('../src/pages/game3d/socialFarm3D.ts',import.meta.url)));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clients=[0,1].map(index=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:`farm-smoke-${index}-${crypto.randomUUID()}`}}));
const actors=clients.map(client=>({client,user:null,service:null,save:freshGame3DSave(),world:'farm',owner:null,ready:false,reconnecting:false,lastAction:null,lease:null,seq:0,pose:{x:0,y:0,z:5,yaw:0,moving:false,running:false},timer:null,stopped:false,transition:Promise.resolve(),model:null}));
async function rpc(actor,name,args){const response=await actor.client.rpc(name,args);if(response.error)throw new Error(`${name}: ${response.error.message}`);return response.data;}
async function waitFor(check,description,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(check())return;await pause(75);}throw new Error(`Timed out: ${description}. ${actors.map(actor=>`${actor.model?.status}: ${actor.model?.error}`).join('; ')}`);}
async function connect(actor){actor.ready=false;actor.lease=crypto.randomUUID();actor.seq=0;const connected=await rpc(actor,'mmo_connect',{p_client:actor.lease,p_name:`Farm smoke ${actor.user.id.slice(0,6)}`,p_world:actor.world,p_server:'local-1'});actor.pose={...actor.pose,x:connected.presence.x,z:connected.presence.z};actor.ready=true;actor.reconnecting=false;}
async function tick(actor){if(actor.stopped)return;try{if(actor.ready&&!actor.reconnecting)await rpc(actor,'mmo_tick',{p_client:actor.lease,p_seq:++actor.seq,p_x:actor.pose.x,p_z:actor.pose.z});}catch(reason){console.error(reason.message);}if(!actor.stopped)actor.timer=setTimeout(()=>{void tick(actor);},250);}
async function action(actor,run,description){await waitFor(()=>actor.model?.status==='online'&&!actor.model.busy,`${description} ready`);await pause(250);assert.equal(await run(),true,`${description}: ${actor.model.error}`);}
try{
 for(const actor of actors){
  actor.save.growth={...actor.save.growth,carrotSeconds:1};
  const originalRpc=actor.client.rpc.bind(actor.client);actor.client.rpc=(name,args,...rest)=>{if(name==='mmo_farm_action')actor.lastAction=args;return originalRpc(name,args,...rest);};
  const result=await actor.client.auth.signUp({email:`farm-smoke-${crypto.randomUUID()}@example.test`,password:`Local-${crypto.randomUUID()}!`});assert.equal(result.error,null,'Local signup failed');assert.ok(result.data.session,'Local anonymous-key signup must return a session');actor.user=result.data.user;actor.owner=actor.user.id;
  await connect(actor);await rpc(actor,'mmo_profile_save',{p_bio:'Preserve my smoke-test bio',p_avatar:{appearance:actor.save.appearance,choice:{model:'farmer'}}});
  actor.service=createSocialFarmClient3D({client:actor.client,userId:actor.user.id,get ready(){return actor.ready;},getOwnSave:()=>actor.save,getWorld:()=>actor.world,getOwner:()=>actor.owner,getPose:()=>actor.pose,getAvatar:()=>({appearance:actor.save.appearance,choice:{model:'farmer'}}),onChange:model=>{actor.model=model;},onFarm:farm=>{if(farm.owner_id===actor.user.id)actor.save=ownedFarmSnapshot3D(actor.save,farm,actor.user.id);},onVisit:farm=>{actor.owner=farm?.owner_id??actor.user.id;actor.world=farm?`farm:${farm.owner_id}`:'farm';actor.transition=connect(actor);}});
  await actor.service.start();void tick(actor);
 }
 const [host,guest]=actors;await waitFor(()=>actors.every(actor=>actor.model.status==='online'),'both social clients initialized');
 assert.equal((await rpc(host,'mmo_profile',{p_user:host.user.id})).bio,'Preserve my smoke-test bio');
 await action(host,()=>host.model.friend('request',guest.user.id),'friend request');await guest.model.refresh();assert.ok(guest.model.state.incoming.some(player=>player.id===host.user.id));
 await action(guest,()=>guest.model.friend('accept',host.user.id),'friend acceptance');await host.model.refresh();assert.ok(host.model.state.friends.some(player=>player.id===guest.user.id));
 console.log('PASS: real profiles preserve bio and explicit friend request/accept works.');
 await action(host,()=>host.model.invite(guest.user.id),'private farm invitation');await guest.model.refresh();const invite=guest.model.state.farm_invitations.find(item=>item.owner_id===host.user.id);assert.ok(invite);
 const ownGuestLayout=JSON.stringify(guest.save.farmLayout),ownGuestSoil=JSON.stringify(guest.save.soil);
 await action(guest,()=>guest.model.respond(invite.id,true),'addressed invitation acceptance');await guest.transition;await guest.model.refresh();await host.model.refresh();
 assert.equal(guest.model.farm.owner_id,host.user.id);await waitFor(()=>Object.values(host.model.peers).some(peer=>peer.userId===guest.user.id),'validated visitor occupancy');
 assert.equal(JSON.stringify(guest.save.farmLayout),ownGuestLayout);assert.equal(JSON.stringify(guest.save.soil),ownGuestSoil);
 console.log('PASS: accepted visit connects to the owner scope, shows validated occupants, and preserves the visitor farm.');
 // Keep the protected central path intact; move one validated step beside it.
 guest.pose={...guest.pose,x:1,z:8};await pause(500);await host.model.refresh();
 await waitFor(()=>Object.values(host.model.peers).some(peer=>peer.userId===guest.user.id&&Math.abs(peer.x-1)<.1),'visitor validated movement');
 await action(guest,()=>guest.model.act('dig','2,8'),'cooperative dig');await host.model.refresh();assert.ok(host.model.farm.snapshot.soil['2,8']);
 await action(guest,()=>guest.model.act('plant','2,8'),'cooperative planting');await action(guest,()=>guest.model.act('water','2,8'),'cooperative watering');await host.model.refresh();assert.ok(host.model.farm.snapshot.plants['2,8']);
 assert.equal(JSON.stringify(guest.save.soil),ownGuestSoil);
 console.log('PASS: visitor dig/plant/water updates authoritative host crops without replacing visitor crops.');
 await waitFor(()=>guest.model.farm?.snapshot.plants['2,8']?.stage===2,'first watered growth stage');
 await action(guest,()=>guest.model.act('water','2,8'),'watering second stage');
 await waitFor(()=>guest.model.farm?.snapshot.plants['2,8']?.stage===3,'ripe shared carrot');
 const carrotsBefore=host.save.inventory.carrot;await action(guest,()=>guest.model.act('harvest','2,8'),'visitor harvest');const receiptArgs=guest.lastAction;await host.model.refresh();assert.equal(host.save.inventory.carrot,carrotsBefore+1);assert.equal(guest.save.inventory.carrot,0);
 const retry=await rpc(guest,'mmo_farm_action',receiptArgs);assert.equal(retry.harvested_carrots,host.model.farm.harvested_carrots);await host.model.refresh();assert.equal(host.save.inventory.carrot,carrotsBefore+1);
 console.log('PASS: both stages require water; visitor harvest rewards only the host and nonce retry cannot duplicate the reward.');
 guest.reconnecting=true;
 await action(host,()=>host.model.revoke(guest.user.id),'host revocation');await guest.model.refresh();await guest.transition;assert.equal(guest.model.visiting,null);assert.equal(guest.owner,guest.user.id);
 const denied=await guest.client.rpc('mmo_farm_state',{p_owner:host.user.id,p_pose:null});assert.ok(denied.error,'Revoked guest must not read owner farm');
 console.log('PASS: revocation exits the visitor and server denies subsequent owner-farm reads.');
}catch(reason){console.error(`FAIL: ${reason instanceof Error?reason.message:String(reason)}`);process.exitCode=1;}
finally{
 for(const actor of actors){actor.stopped=true;clearTimeout(actor.timer);actor.service?.stop();if(actor.user&&actor.owner!==actor.user.id)await actor.client.rpc('mmo_farm_leave',{p_owner:actor.owner});if(actor.lease)await actor.client.rpc('mmo_leave',{p_client:actor.lease});await actor.client.auth.signOut();await actor.client.removeAllChannels();actor.client.realtime.disconnect();}
}
