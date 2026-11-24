import {normalizeTownLayout3D} from '../../src/pages/game3d/townCustomization3D';
import {canEnterGame3D} from '../../src/pages/game3d/gameAccount3D';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {normalizeAppearance3D} from '../../src/pages/game3d/game3d';
import {normalizeCharacterChoice3D} from '../../src/pages/game3d/characterChoice3D';
import {normalizeFarmLayout3D} from '../../src/pages/game3d/farmCustomization3D';
import {loopbackUrl,parseSession,type VerifiedSession} from './authority';
type Backend={getUser:()=>Promise<string|null>;getSession:()=>Promise<unknown>};
type VerificationDependencies={now?:()=>number;backend?:(url:string,key:string,token:string,signal:AbortSignal)=>Backend};
function supabaseBackend(url:string,key:string,token:string,signal:AbortSignal):Backend {
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>fetch(input,{...init,signal})}});
 return{
  async getUser(){const identity=await client.auth.getUser(token);if(identity.error||!canEnterGame3D(identity.data.user))throw new Error('Unauthorized');return identity.data.user?.id??null;},
  async getSession(){const result=await client.rpc('mmo_room_session');if(result.error)throw new Error('Unauthorized');return result.data;},
 };
}
export function createSessionVerifier(url:string,key:string,dependencies:VerificationDependencies={}):(token:string)=>Promise<VerifiedSession> {
 if(!loopbackUrl(url)||!key||key.startsWith('sb_secret_'))throw new Error('Local public Supabase configuration required');
 if(!key.startsWith('sb_publishable_')){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());if(payload.role!=='anon')throw new Error();}catch{throw new Error('Public Supabase key required');}}
 const now=dependencies.now??(()=>performance.now());const backend=dependencies.backend??supabaseBackend;
 // Only the verified token identity is cached. JWT/lease/grant/user existence are
 // checked by the authenticated room-session RPC on EVERY verification.
 const identities=new Map<string,{userId:string;until:number}>();
 return async token=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2500);
  try{
   const client=backend(url,key,token,controller.signal);let cached=identities.get(token);
   if(cached&&cached.until<=now()){identities.delete(token);cached=undefined;}
   if(!cached){const userId=await client.getUser();if(!userId)throw new Error('Unauthorized');cached={userId,until:now()+30000};}
   identities.delete(token);identities.set(token,cached);
   while(identities.size>100)identities.delete(identities.keys().next().value!);
   const session=parseSession(await client.getSession(),cached.userId);if(!session)throw new Error('Unauthorized');
   return{...session,townLayout:normalizeTownLayout3D(session.townLayout),appearance:normalizeAppearance3D(session.appearance),choice:normalizeCharacterChoice3D(session.choice),farmLayout:session.world==='town'?null:normalizeFarmLayout3D(session.farmLayout)};
  }catch{identities.delete(token);throw new Error('Unauthorized or expired session');}finally{clearTimeout(timer);}
 };
}

/** Write validated movement through the player's checked SQL lease; no service key. */
export function createPoseWriter(url:string,key:string){
 // Reuse the same loopback/public-key validation as authentication.
 createSessionVerifier(url,key);
 const clients=new Map<string,SupabaseClient>();
 return async(token:string,lease:string,seq:number,position:{x:number;z:number})=>{
  let client=clients.get(token);
  if(!client){client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(2500)})}});clients.set(token,client);while(clients.size>100)clients.delete(clients.keys().next().value!);}
  const {data,error}=await client.rpc('mmo_tick',{p_client:lease,p_seq:seq,p_x:position.x,p_z:position.z});
  if(error||!data||![data.x,data.z].every(Number.isFinite)||Math.abs(data.x)>23.55||Math.abs(data.z)>23.55||!Number.isSafeInteger(data.seq)||data.seq<0||typeof data.accepted!=='boolean'||typeof data.world_id!=='string'||typeof data.server_id!=='string')throw new Error('Position synchronization unavailable');
  return data as import('../../src/pages/game3d/mmoCommunicationTypes3D').MmoPresence3D;
 };
}
