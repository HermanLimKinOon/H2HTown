import {spawn} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile,access,chmod} from 'node:fs/promises';
import {resolveNs} from 'node:dns/promises';
import {parseNamedTunnel} from '../server/friends/config.mjs';
import net from 'node:net';
import {createFriendsGateway} from '../server/friends/gateway.mjs';
import {runningFriendsSession} from '../server/friends/session.mjs';

const children=new Set();let gateway,stopping=false;
function child(command,args,env=process.env,stdio='inherit'){
 const processChild=spawn(command,args,{env,stdio});children.add(processChild);processChild.once('exit',()=>{children.delete(processChild);});return processChild;
}
function waitExit(processChild){return new Promise((done,reject)=>{processChild.once('error',reject);processChild.once('exit',code=>code===0?done():reject(new Error('Child process stopped with an error')));});}
async function free(port){await new Promise((done,reject)=>{const socket=net.createServer();socket.once('error',()=>reject(new Error(`Port ${port} is already in use; stop the previous friends session first.`)));socket.listen(port,'127.0.0.1',()=>socket.close(done));});}
async function health(url){const response=await fetch(url,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Local backend not ready');return response.json();}
async function waitHealth(url){for(let n=0;n<30;n++){try{return await health(url);}catch{await new Promise(done=>setTimeout(done,500));}}throw new Error('Local multiplayer did not become ready');}
async function stop(code=0){if(stopping)return;stopping=true;gateway?.close();for(const processChild of children)processChild.kill('SIGTERM');setTimeout(()=>{for(const processChild of children)processChild.kill('SIGKILL');process.exit(code);},2000).unref();}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
 let existing=null;
 try{existing=await runningFriendsSession(JSON.parse(await readFile('.local/friends-session.json','utf8')));}catch{/* No usable previous session. Continue normal startup. */}
 if(existing){
  console.log(`\nFriends session is already running. Keep using this same link:\n${existing.url}\n\nNo second server was started. Keep the original friends terminal open.\n`);
  process.exit(0);
 }
 for(const file of ['.env.local','.env']){try{loadEnvFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}}
 let named=null;
 if(!process.argv.includes('--temporary')){
  try{named=parseNamedTunnel(JSON.parse(await readFile('.local/friends-named.json','utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(named){
  await access(named.tokenFile);await chmod(named.tokenFile,0o600);
  const config=JSON.parse(await readFile('.local/friends-named.json','utf8'));
  if(config.zone&&Array.isArray(config.nameServers)){
   const actual=await resolveNs(config.zone);
   if(actual.length!==config.nameServers.length||!config.nameServers.every(ns=>actual.includes(ns))){
    const message=`Permanent address ${named.origin} is waiting for Cloudflare domain activation. Required nameservers: ${config.nameServers.join(', ')}.`;
    if(process.argv.includes('--fixed'))throw new Error(message);
    console.warn(message+' Keeping temporary mode until activation is complete.');named=null;
   }
  }
 }
 const backend=new URL(process.env.SUPABASE_URL??process.env.VITE_PUBLIC_SUPABASE_URL??'');if(backend.protocol!=='http:'||!['127.0.0.1','localhost'].includes(backend.hostname))throw new Error('This launcher requires local Supabase.');
 await health(`${backend.origin}/auth/v1/health`);await free(3002);await free(2569);
 if(process.env.H2H_FRIENDS_SKIP_BUILD!=='1')await waitExit(child(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','friends','--outDir','out-friends'],{...process.env,H2H_FRIENDS_BUILD:'1'}));
 const tunnel=child('cloudflared',named?['tunnel','--config','/dev/null','--no-autoupdate','--protocol','http2','run','--token-file',resolve(named.tokenFile)]:['tunnel','--config','/dev/null','--url','http://127.0.0.1:3002','--no-autoupdate','--protocol','http2'],process.env,['ignore','pipe','pipe']);
 const connected=new Promise((done,reject)=>{
  let recent='';const timer=setTimeout(()=>reject(new Error('Cloudflare did not connect. Check internet access.')),45000);
  const onData=data=>{recent=(recent+data.toString()).slice(-12000);const match=recent.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(named?recent.includes('Registered tunnel connection'):Boolean(match)){clearTimeout(timer);done(named?named.origin:match[0]);}};
  tunnel.stdout.on('data',onData);tunnel.stderr.on('data',onData);tunnel.once('error',error=>{clearTimeout(timer);reject(error);});tunnel.once('exit',()=>{clearTimeout(timer);reject(new Error('Cloudflare tunnel stopped before startup'));});
 });
 const origin=named?named.origin:await connected;
 // A named tunnel can connect while its local service starts. Consume any early
 // rejection immediately, then require successful registration before advertising it.
 if(named)void connected.catch(()=>{});
 const movement=child(process.execPath,['--import','tsx','server/colyseus/index.ts'],{...process.env,COLYSEUS_PORT:'2569',H2H_FRIENDS_ORIGIN:origin},['ignore','pipe','pipe']);
 // Child errors contain no bearer tokens; retain only a bounded status summary.
 movement.stdout.on('data',()=>{});movement.stderr.on('data',()=>{});
 await waitHealth('http://127.0.0.1:2569/health');
 gateway=await createFriendsGateway({origin,root:resolve('out-friends'),supabasePort:Number(backend.port||80)});
 await connected;
 for(const processChild of [tunnel,movement])processChild.once('exit',()=>{if(!stopping){console.error('Friends connection stopped; restart npm run game:friends.');void stop(1);}});
 await mkdir('.local',{recursive:true});await writeFile('.local/friends-session.json',JSON.stringify({url:`${origin}/game-3d`,startedAt:new Date().toISOString(),pid:process.pid,ports:{gateway:3002,multiplayer:2569}},null,2));
 console.log(`\nShare this game URL with your friends:\n${origin}/game-3d\n\n10-player friends test. Keep this process, Docker and Supabase running.\nPress Ctrl+C here to stop public access. ${named?'Restarts keep this same URL.':'Each restart creates a new URL.'}\n`);
}catch(error){console.error(`Friends startup failed: ${error.message==='fetch failed'?'Start Docker and local Supabase, then retry.':error.message}`);void stop(1);process.exitCode=1;}
