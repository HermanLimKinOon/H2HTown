import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/pages/game3d/gameAccount3D.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {canEnterGame3D,gameLoginError3D}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('game access requires a real account instead of anonymous or generated legacy guests',()=>{
 assert.equal(canEnterGame3D(null),false);
 assert.equal(canEnterGame3D({id:'user',email:'player@example.com',is_anonymous:false}),true);
 assert.equal(canEnterGame3D({id:'user',email:'player@example.com',is_anonymous:true}),false);
 assert.equal(canEnterGame3D({id:'user',email:'town-a1000000-0000-4000-8000-000000000001@example.test'}),false);
 assert.equal(canEnterGame3D({email:'player@example.com'}),false);
});
test('login errors are useful without exposing raw server details or credentials',()=>{
 assert.match(gameLoginError3D({message:'Invalid login credentials'}),/email or password/i);
 assert.match(gameLoginError3D({message:'Email not confirmed'}),/confirm/i);
 assert.doesNotMatch(gameLoginError3D({message:'internal detail secret-password'}),/secret-password/);
});
const {createGameAccount3D}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const user={id:'account-a',email:'player@example.com',is_anonymous:false};
const session={access_token:'valid-fixture-token',user};
const pause=()=>new Promise(done=>setImmediate(done));
function setup(initial=null){let current=initial;const callbacks=new Set(),updates=[],calls=[];const client={auth:{async getSession(){calls.push('getSession');return{data:{session:current}};},async getUser(){calls.push('getUser');return{data:{user:current?.user??null},error:null};},onAuthStateChange(fn){callbacks.add(fn);return{data:{subscription:{unsubscribe(){callbacks.delete(fn);}}}};},async signInWithPassword(credentials){calls.push('signIn');if(credentials.password!=='fixture-password')return{error:{message:'Invalid login credentials'},data:{session:null}};current=session;for(const fn of callbacks)fn('SIGNED_IN',current);return{data:{session:current},error:null};},async signUp(){calls.push('signUp');current=session;for(const fn of callbacks)fn('SIGNED_IN',current);return{data:{session:current},error:null};},async signOut(){calls.push('signOut');current=null;for(const fn of callbacks)fn('SIGNED_OUT',null);return{error:null};}},realtime:{async setAuth(){calls.push('setAuth');}}};const account=createGameAccount3D(client,state=>updates.push(state));return{client,account,updates,calls};}
test('opening the game never creates or signs in a guest account',async()=>{const env=setup();await env.account.start();assert.equal(env.updates.at(-1).status,'offline');assert.equal(env.calls.includes('signUp'),false);assert.equal(env.calls.includes('signIn'),false);env.account.stop();});
test('explicit login verifies the account before granting access and logout removes it',async()=>{const env=setup();await env.account.start();assert.equal(await env.account.signIn(user.email,'wrong'),false);assert.equal(env.updates.at(-1).status,'offline');assert.equal(await env.account.signIn(user.email,'fixture-password'),true);await pause();assert.equal(env.updates.at(-1).status,'ready');assert.equal(env.updates.at(-1).session.user.id,user.id);await env.account.signOut();await pause();assert.equal(env.updates.at(-1).session,null);env.account.stop();});
test('signup happens only after an explicit create-account request',async()=>{const env=setup();await env.account.start();assert.equal(await env.account.signUp(user.email,'fixture-password'),'signed-in');await pause();assert.equal(env.calls.filter(c=>c==='signUp').length,1);assert.equal(env.updates.at(-1).status,'ready');env.account.stop();});
test('stored anonymous sessions cannot enter the game',async()=>{const env=setup({...session,user:{...user,is_anonymous:true}});await env.account.start();await pause();assert.equal(env.updates.at(-1).session,null);assert.notEqual(env.updates.at(-1).status,'ready');env.account.stop();});
test('late session validation cannot sign the player back in after logout',async()=>{const env=setup(session);let finish;env.client.auth.getUser=()=>new Promise(done=>finish=done);const starting=env.account.start();await pause();await env.account.signOut();finish({data:{user},error:null});await starting;await pause();assert.equal(env.updates.at(-1).session,null);assert.equal(env.updates.some(s=>s.status==='ready'),false);env.account.stop();});
test('a stale stored-session response cannot reopen the game after sign-out',async()=>{
 const env=setup(session);let finish;
 env.client.auth.getSession=()=>new Promise(done=>finish=done);
 env.client.auth.getUser=async()=>({data:{user},error:null});
 const starting=env.account.start();await env.account.signOut();await pause();finish({data:{session}});await starting;await pause();
 assert.equal(env.updates.some(s=>s.status==='ready'),false);env.account.stop();
});
