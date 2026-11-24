import {validFriendsOrigin} from './config.mjs';
import {get} from 'node:http';

// Node fetch can replace Host. The gateway requires the exact public hostname.
function localHealth(url,options){
 return new Promise((resolve,reject)=>{
  const request=get(url,{headers:options.headers,signal:options.signal},response=>{
   let body='';
   response.on('data',chunk=>{body+=chunk;if(body.length>8192)request.destroy(new Error('Invalid health response'));});
   response.on('end',()=>resolve({ok:response.statusCode===200,json:async()=>JSON.parse(body)}));
   response.on('error',reject);
  });
  request.on('error',reject);
 });
}

// Validate the recorded local service before treating a duplicate start as success.
export async function runningFriendsSession(session,{fetchImpl=localHealth,isProcessAlive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}}}={}){
 try{
  if(!session||!Number.isSafeInteger(session.pid)||session.pid<=0||session.ports?.gateway!==3002||session.ports?.multiplayer!==2569)return null;
  const url=new URL(session.url);
  if(!validFriendsOrigin(url.origin)||url.href!==`${url.origin}/game-3d`||!isProcessAlive(session.pid))return null;
  const response=await fetchImpl('http://127.0.0.1:3002/multiplayer/health',{headers:{Host:url.host},signal:AbortSignal.timeout(3000)});
  if(!response.ok)return null;
  const health=await response.json();
  return health.ok===true&&Number.isInteger(health.players)&&health.players>=0&&Number.isInteger(health.limit)&&health.limit>0?session:null;
 }catch{return null;}
}
