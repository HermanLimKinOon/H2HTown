import {validFriendsOrigin} from './config.mjs';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const RPCS=new Set(['mmo_world_editor','get_best_selling_product_ids','get_member_profile','register_member','register_guest_member','is_admin','mmo_connect','mmo_tick','mmo_leave','mmo_state','mmo_history','mmo_send','mmo_read','mmo_social','mmo_find_players','mmo_social_state','mmo_profile','mmo_profile_save','mmo_friend_action','mmo_farm_invite','mmo_farm_revoke','mmo_farm_invitation','mmo_farm_action','mmo_farm_leave','mmo_farm_publish','mmo_farm_state']);
export function routeFriendsRequest(method,raw,upgrade=false){
 const deny={kind:'deny'};
 if(!raw?.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return deny;
 const path=raw.split('?')[0];
 if(path.includes('%')||path.split('/').some(p=>p==='.'||p==='..'||p.startsWith('.'))||path.endsWith('.map'))return deny;
 if(upgrade){
  if(method!=='GET')return deny;
  if(path==='/supabase/realtime/v1/websocket')return{kind:'supabase',path:raw.slice('/supabase'.length)};
  if(/^\/multiplayer\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(path))return{kind:'multiplayer',path:raw.slice('/multiplayer'.length)};
  return deny;
 }
 if(method==='POST'&&path.startsWith('/supabase/rest/v1/rpc/')&&RPCS.has(path.slice('/supabase/rest/v1/rpc/'.length)))return{kind:'supabase',path:raw.slice('/supabase'.length)};
 // Public catalogue reads and the existing authenticated payment functions only.
 if(method==='GET'&&path==='/supabase/rest/v1/products')return{kind:'supabase',path:raw.slice('/supabase'.length)};
 if(method==='POST'&&['/supabase/functions/v1/rm-create-payment','/supabase/functions/v1/rm-payment-status'].includes(path))return{kind:'supabase',path:raw.slice('/supabase'.length)};
 const auth=path.slice('/supabase/auth/v1/'.length);
 if(path.startsWith('/supabase/auth/v1/')&&((method==='POST'&&['signup','token','logout','otp','verify','recover','resend'].includes(auth))||(method==='GET'&&['user','settings','health','authorize','callback','verify'].includes(auth))||(method==='PUT'&&auth==='user')))return{kind:'supabase',path:raw.slice('/supabase'.length)};
 if((method==='POST'&&path==='/multiplayer/matchmake/joinOrCreate/h2h_world')||(method==='GET'&&path==='/multiplayer/health'))return{kind:'multiplayer',path:raw.slice('/multiplayer'.length)};
 if(['GET','HEAD'].includes(method)&&(['/members/register','/members/profile','/cart','/shop','/payment/return','/members/orders'].includes(path)||/^\/shop\/[1-9][0-9]*$/.test(path)))return{kind:'static',path:'/index.html'};
 if(['GET','HEAD'].includes(method)&&(path==='/'||path==='/game-3d'||path==='/game-3d/'||/^\/(assets|game3d|images)\/[a-zA-Z0-9_./-]+$/.test(path)||/^\/game\/(?:items\/)?[a-zA-Z0-9_-]+\.(?:svg|png|jpg|jpeg|gif|json)$/.test(path)))return{kind:'static',path:['/','/game-3d','/game-3d/'].includes(path)?'/index.html':path};
 return deny;
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.woff2':'font/woff2','.mp3':'audio/mpeg'};
export function createFriendsGateway({origin,root,port=3002,multiplayerPort=2569,supabasePort=54329}){
 if(!validFriendsOrigin(origin))throw new Error('Exact public HTTPS game origin required');const parsed=new URL(origin);
 const base=resolve(root);
 const valid=request=>request.headers.host===parsed.host&&(!request.headers.origin||request.headers.origin===origin);
 const headers=request=>{const h={...request.headers};delete h.cookie;delete h['x-forwarded-host'];delete h['x-forwarded-proto'];delete h.forwarded;h.host='127.0.0.1';return h;};
 const server=http.createServer(async(request,response)=>{
  response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');response.setHeader('Cache-Control','no-store');
  if(!valid(request)){response.writeHead(403).end('Unrecognized game origin');return;}
  const route=routeFriendsRequest(request.method,request.url);
  if(route.kind==='deny'){response.writeHead(404).end('Not available');return;}
  if(route.kind==='static'){
   const file=resolve(base,'.'+route.path);
   if(!file.startsWith(base+sep)){response.writeHead(404).end();return;}
   try{const info=await stat(file);if(!info.isFile())throw new Error();response.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Content-Length':info.size});if(request.method==='HEAD')response.end();else createReadStream(file).on('error',()=>response.destroy()).pipe(response);}catch{response.writeHead(404).end('Not found');}
   return;
  }
  const upstream=http.request({hostname:'127.0.0.1',port:route.kind==='supabase'?supabasePort:multiplayerPort,path:route.path,method:request.method,headers:headers(request),timeout:15000},res=>{const h={...res.headers};delete h['set-cookie'];delete h['access-control-allow-origin'];response.writeHead(res.statusCode||502,h);res.pipe(response);});
  upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end('Local game backend unavailable');});request.on('aborted',()=>upstream.destroy());request.pipe(upstream);
 });
 server.on('upgrade',(request,socket,head)=>{
  const route=routeFriendsRequest(request.method,request.url,true);
  if(!valid(request)||!['supabase','multiplayer'].includes(route.kind)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  const upstream=http.request({hostname:'127.0.0.1',port:route.kind==='supabase'?supabasePort:multiplayerPort,path:route.path,method:'GET',headers:headers(request)});
  upstream.on('upgrade',(res,peer,buffer)=>{
   socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n`+Object.entries(res.headers).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}\r\n`).join('')+'\r\n');
   if(head.length)peer.write(head);if(buffer.length)socket.write(buffer);socket.pipe(peer).pipe(socket);socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());socket.on('close',()=>peer.destroy());peer.on('close',()=>socket.destroy());
  });
  upstream.on('response',res=>{socket.end(`HTTP/1.1 ${res.statusCode||502} Rejected\r\nConnection: close\r\n\r\n`);res.resume();});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());upstream.end();
 });
 server.requestTimeout=20000;server.headersTimeout=10000;
 return new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>done(server));});
}
