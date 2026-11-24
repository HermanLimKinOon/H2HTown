import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const urls=new Map();
async function moduleUrl(url){if(urls.has(url.href))return urls.get(url.href);let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(match[0],`from ${JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`,url)))}`);const result=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;urls.set(url.href,result);return result;}
const {createSocialFarmClient3D}=await import(await moduleUrl(new URL('../src/pages/game3d/socialFarmClient3D.ts',import.meta.url)));
const {freshGame3DSave}=await import(await moduleUrl(new URL('../src/pages/game3d/game3d.ts',import.meta.url)));
const pause=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const social=()=>({friends:[],incoming:[],outgoing:[],farm_invitations:[],sent_invitations:[],visitors:[]});
const ownProfile=()=>({id:'self',name:'Self',bio:'Existing personal bio',avatar:null,friendship:'self'});
function setup(t){
 t.mock.timers.enable({apis:['setTimeout']});
 let save=freshGame3DSave(),world='farm',owner='self',ready=true,handler;
 const calls=[],updates=[],applied=[],visits=[];
 let version=1,harvested=0;
 const farm=(id='self',extra={})=>({owner_id:id,owner_name:id,version,server_now:new Date().toISOString(),harvested_carrots:harvested,snapshot:{farmLayout:save.farmLayout,soil:{},plants:{},choppedTrees:save.choppedTrees,growth:save.growth,chickens:save.chickens,farmPausedAt:null},occupants:[],...extra});
 const client={async rpc(name,args){calls.push({name,args});const override=handler?.(name,args);if(override!==undefined)return await override;if(name==='mmo_profile')return{data:{...ownProfile(),id:args.p_user},error:null};if(name==='mmo_profile_save')return{data:{...ownProfile(),bio:args.p_bio,avatar:args.p_avatar},error:null};if(name==='mmo_farm_publish')return{data:farm()};if(name==='mmo_farm_state'||name==='mmo_farm_action')return{data:farm(args.p_owner)};if(name==='mmo_farm_invitation')return{data:args.p_accept?farm('friend'):null};if(name==='mmo_farm_leave')return{data:true};if(name==='mmo_find_players')return{data:[]};return{data:social()};}};
 const service=createSocialFarmClient3D({client,userId:'self',get ready(){return ready;},getOwnSave:()=>save,getWorld:()=>world,getOwner:()=>owner,getAvatar:()=>({appearance:save.appearance,choice:{model:'farmer'}}),getPose:()=>({x:0,y:0,z:5,yaw:0,moving:false,running:false}),onChange:next=>updates.push(next),onFarm:next=>applied.push(next),onVisit:next=>{visits.push(next);owner=next?.owner_id??'self';world=next?`farm:${next.owner_id}`:'farm';}});
 t.after(()=>service.stop());
 return{service,calls,updates,applied,visits,farm,setHandler:next=>handler=next,getSave:()=>save,setSave:next=>save=next,setWorld:next=>world=next,setOwner:next=>owner=next,setReady:next=>ready=next,setVersion:next=>version=next,setHarvested:next=>harvested=next};
}
test('initial publication seeds existing crops, subsequent publication contains metadata only, and avatar saves preserve loaded bio',async t=>{
 const env=setup(t);env.getSave().soil={'1,1':{dug:true}};await env.service.start();
 assert.equal(env.service.snapshot().status,'online');
 const first=env.calls.find(call=>call.name==='mmo_farm_publish');assert.ok(first.args.p_snapshot.soil['1,1']);assert.ok('plants'in first.args.p_snapshot);
 const avatar=env.calls.find(call=>call.name==='mmo_profile_save');assert.equal(avatar.args.p_bio,'Existing personal bio');assert.ok(env.calls.findIndex(call=>call.name==='mmo_profile')<env.calls.findIndex(call=>call.name==='mmo_profile_save'));
 await env.service.snapshot().refresh();assert.equal(env.calls.filter(call=>call.name==='mmo_farm_publish').length,1);
 env.setSave({...env.getSave(),choppedTrees:{tree:12},plants:{'2,2':{plantedAt:100}}});await env.service.snapshot().refresh();
 const update=env.calls.filter(call=>call.name==='mmo_farm_publish').at(-1).args.p_snapshot;assert.equal(update.choppedTrees.tree,12);assert.equal('soil'in update,false);assert.equal('plants'in update,false);
});
test('crop-only local changes never trigger a publish and polling/action callbacks remain stable',async t=>{
 const env=setup(t);await env.service.start();const first=env.service.snapshot();env.setSave({...env.getSave(),soil:{'1,2':{}},plants:{'1,2':{}}});
 t.mock.timers.tick(700);await pause();assert.equal(env.calls.filter(call=>call.name==='mmo_farm_publish').length,1);assert.equal(env.service.snapshot().act,first.act);assert.equal(env.service.snapshot().refresh,first.refresh);
 assert.equal(env.calls.filter(call=>call.name==='mmo_social_state').length,1);t.mock.timers.tick(4300);await pause();assert.equal(env.calls.filter(call=>call.name==='mmo_social_state').length,2);
});
test('late lower versions and harvest receipts never replace newer farm state',async t=>{
 const env=setup(t);await env.service.start();const pending=deferred();env.setHandler(name=>name==='mmo_farm_state'?pending.promise:undefined);
 const refresh=env.service.snapshot().refresh();await pause();env.setVersion(4);env.setHarvested(3);assert.equal(await env.service.snapshot().act('harvest','1,1'),true);
 pending.resolve({data:env.farm('self',{version:2,harvested_carrots:0})});await refresh;
 assert.equal(env.service.snapshot().farm.version,4);assert.equal(env.service.snapshot().farm.harvested_carrots,3);assert.equal(env.applied.at(-1).version,4);
});
test('transient visit failure retains the visit and disables actions; access denial exits without touching own farm',async t=>{
 const env=setup(t);await env.service.start();await env.service.snapshot().respond('invite',true);assert.equal(env.visits.at(-1).owner_id,'friend');const ownCount=env.applied.filter(farm=>farm.owner_id==='self').length;
 env.setHandler(name=>name==='mmo_farm_state'?{error:{message:'Network connection failed'}}:undefined);await env.service.snapshot().refresh();assert.equal(env.service.snapshot().visiting.id,'friend');assert.equal(env.service.snapshot().status,'offline');assert.equal(await env.service.snapshot().act('dig','1,1'),false);
 env.setHandler(name=>name==='mmo_farm_state'?{data:env.farm('friend',{version:2})}:undefined);await env.service.snapshot().refresh();assert.equal(env.applied.at(-1).owner_id,'friend');assert.equal(env.applied.filter(farm=>farm.owner_id==='self').length,ownCount);
 env.setHandler(name=>name==='mmo_farm_state'?{error:{code:'42501',message:'Farm access denied'}}:undefined);await env.service.snapshot().refresh();assert.equal(env.visits.at(-1),null);assert.equal(env.service.snapshot().visiting,null);
});
test('pending actions cannot double send and ambiguous failures retry the same nonce',async t=>{
 const env=setup(t);await env.service.start();const pending=deferred();env.setHandler(name=>name==='mmo_farm_action'?pending.promise:undefined);
 const first=env.service.snapshot().act('harvest','1,1');assert.equal(await env.service.snapshot().act('harvest','1,1'),false);pending.resolve({error:{message:'Network failure'}});assert.equal(await first,false);
 env.setHandler(undefined);await env.service.snapshot().refresh();assert.equal(await env.service.snapshot().act('harvest','1,1'),true);const calls=env.calls.filter(call=>call.name==='mmo_farm_action');assert.equal(calls.length,2);assert.equal(calls[0].args.p_nonce,calls[1].args.p_nonce);
});
test('profile selection ignores stale requests and stopped services cannot apply pending cross-account farm responses',async t=>{
 const env=setup(t);await env.service.start();const old=deferred();env.setHandler((name,args)=>name==='mmo_profile'&&args.p_user==='alice'?old.promise:undefined);
 const first=env.service.snapshot().loadProfile('alice');await env.service.snapshot().loadProfile('bob');old.resolve({data:{...ownProfile(),id:'alice'}});await first;assert.equal(env.service.snapshot().profile.id,'bob');
 const farm=deferred();env.setHandler(name=>name==='mmo_farm_state'?farm.promise:undefined);const refresh=env.service.snapshot().refresh();const applied=env.applied.length;env.service.stop();farm.resolve({data:env.farm('self',{version:99})});await refresh;assert.equal(env.applied.length,applied);
});
test('ready false pauses RPCs without destroying visit state and resumes when communication reconnects',async t=>{
 const env=setup(t);env.setReady(false);await env.service.start();assert.equal(env.calls.length,0);env.setReady(true);t.mock.timers.tick(700);await pause();t.mock.timers.tick(4300);await pause();assert.equal(env.service.snapshot().status,'online');await env.service.snapshot().respond('invite',true);
 env.setReady(false);const count=env.calls.length;t.mock.timers.tick(700);await pause();assert.equal(env.calls.length,count);assert.equal(env.service.snapshot().visiting.id,'friend');assert.equal(await env.service.snapshot().act('dig','1,1'),false);
 env.setReady(true);t.mock.timers.tick(700);await pause();assert.equal(env.service.snapshot().status,'online');assert.equal(env.service.snapshot().visiting.id,'friend');
});
test('farm polling never overlaps and owner edits made during publication are not overwritten',async t=>{
 const env=setup(t),pending=deferred();env.setHandler(name=>name==='mmo_farm_publish'?pending.promise:undefined);const starting=env.service.start();await pause();env.setSave({...env.getSave(),choppedTrees:{newEdit:100}});t.mock.timers.tick(1400);await pause();assert.equal(env.calls.filter(call=>call.name==='mmo_farm_publish').length,1);
 pending.resolve({data:env.farm()});await starting;assert.equal(env.applied.length,0);env.setHandler(undefined);t.mock.timers.tick(700);await pause();assert.equal(env.calls.filter(call=>call.name==='mmo_farm_publish').length,2);assert.ok(env.applied.length>0);
});
test('manual bio changes and automatic avatar changes serialize without restoring old bio',async t=>{
 const env=setup(t);await env.service.start();assert.equal(await env.service.snapshot().saveProfile('New bio'),true);env.setSave({...env.getSave(),appearance:{...env.getSave().appearance,name:'New look'}});await env.service.snapshot().refresh();assert.equal(env.calls.filter(call=>call.name==='mmo_profile_save').at(-1).args.p_bio,'New bio');
});
test('offline leave returns locally immediately and revokes the old grant after readiness recovers',async t=>{
 const env=setup(t);await env.service.start();await env.service.snapshot().respond('invite',true);env.setReady(false);await env.service.snapshot().leave();assert.equal(env.visits.at(-1),null);assert.equal(env.service.snapshot().visiting,null);assert.equal(env.calls.some(call=>call.name==='mmo_farm_leave'),false);
 env.setReady(true);t.mock.timers.tick(700);await pause();assert.equal(env.calls.find(call=>call.name==='mmo_farm_leave').args.p_owner,'friend');
});
test('friend mutations update the selected card friendship immediately, including a late profile response',async t=>{
 const env=setup(t);await env.service.start();await env.service.snapshot().loadProfile('friend');assert.equal(env.service.snapshot().profile.friendship,'none');env.setHandler(name=>name==='mmo_friend_action'?{data:{...social(),outgoing:[{id:'friend',name:'Friend'}]}}:undefined);
 assert.equal(await env.service.snapshot().friend('request','friend'),true);assert.equal(env.service.snapshot().profile.friendship,'outgoing');
 env.setHandler(name=>name==='mmo_friend_action'?{data:social()}:undefined);assert.equal(await env.service.snapshot().friend('cancel','friend'),true);assert.equal(env.service.snapshot().profile.friendship,'none');
});
test('accepted travel succeeds even when readiness drops before follow-up social refresh',async t=>{
 const env=setup(t);await env.service.start();env.setHandler(name=>{if(name==='mmo_farm_invitation'){queueMicrotask(()=>env.setReady(false));return {data:env.farm('friend')};}});
 assert.equal(await env.service.snapshot().respond('invite',true),true);assert.equal(env.visits.at(-1).owner_id,'friend');assert.equal(env.service.snapshot().error,'');
});
