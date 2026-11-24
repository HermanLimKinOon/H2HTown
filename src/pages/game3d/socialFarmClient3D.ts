import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game3DSave } from './game3d';
import type { MmoPlayer3D } from './mmoCommunicationTypes3D';
import type { TownLocalPose3D, TownProfile3D } from './townMultiplayer3D';
import type { FarmAction3D, FarmSnapshot3D, PlayerProfile3D, SocialFarmModel3D, SocialState3D } from './socialFarmTypes3D';
import { farmPeers3D, farmSnapshotData3D } from './socialFarm3D';

export type SocialFarmOptions3D={client:SupabaseClient|null;userId:string|null;ready:boolean;getOwnSave:()=>Game3DSave;getWorld:()=>string;getOwner:()=>string|null;getAvatar:()=>Pick<TownProfile3D,'appearance'|'choice'>;getPose:()=>TownLocalPose3D;onFarm:(farm:FarmSnapshot3D)=>void;onVisit:(farm:FarmSnapshot3D|null)=>void};
type Options=SocialFarmOptions3D&{onChange:(model:SocialFarmModel3D)=>void};
const errorText=(reason:unknown)=>reason&&typeof reason==='object'&&'message' in reason?String(reason.message).slice(0,180):'Could not connect. Please try again.';
const accessDenied=(reason:unknown)=>Boolean(reason&&typeof reason==='object'&&'code' in reason&&reason.code==='42501')||/access.*denied|permission|unauthori[sz]ed|revoked|grant.*(expired|required|missing|invalid)|not.*friend|visit.*(expired|denied|required|unavailable)/i.test(errorText(reason));
function metadata(save:Game3DSave){const {farmLayout,choppedTrees,growth,chickens,farmPausedAt}=save;return {farmLayout,choppedTrees,growth,chickens,farmPausedAt};}
function validFarm(value:FarmSnapshot3D):boolean{return Boolean(value&&typeof value.owner_id==='string'&&Number.isSafeInteger(value.version)&&value.version>=0&&Number.isFinite(value.harvested_carrots)&&value.harvested_carrots>=0&&value.snapshot&&Array.isArray(value.occupants)&&Number.isFinite(Date.parse(value.server_now)));}

/** Polls checked RPCs; never writes tables or authorizes visits from local state. */
export function createSocialFarmClient3D(options:Options){
 const {client,userId}=options;
 let stopped=false,started=false,generation=0,mutation=false;
 let slowTimer:ReturnType<typeof setTimeout>|undefined,fastTimer:ReturnType<typeof setTimeout>|undefined;
 let state:SocialState3D|null=null,profile:PlayerProfile3D|null=null,ownProfile:PlayerProfile3D|null=null,farm:FarmSnapshot3D|null=null;
 let visiting:SocialFarmModel3D['visiting']=null,status:SocialFarmModel3D['status']='connecting',error='';
 let published=false,publishedSignature='',avatarSignature='',socialGood=false,farmGood=false,profileGood=false;
 let stateVersion=0,selectedVersion=0,profileVersion=0,visitVersion=0;
 let leaveRunning:Promise<void>|null=null;const pendingLeaves=new Set<string>();
 let socialRunning:Promise<void>|null=null,farmRunning:Promise<void>|null=null,profileRunning:Promise<void>|null=null;
 let profileQueue:Promise<unknown>=Promise.resolve();
 const farmVersions=new Map<string,{version:number;time:number;harvested:number}>(),failedActions=new Map<string,string>();
 const active=(token:number)=>!stopped&&generation===token;
 const owner=()=>{const world=options.getWorld();return world==='farm'||world.startsWith('farm:')?(options.getOwner()??userId):null;};
 const recalculate=()=>{if(!options.ready){status='connecting';return;}status=socialGood&&profileGood&&published&&(!owner()||farmGood)?'online':'offline';};
 const emit=()=>{if(!stopped)options.onChange(snapshot());};
 const rpc=async<T,>(name:string,args?:Record<string,unknown>):Promise<T>=>{if(!client||!userId||!options.ready)throw new Error('Connect to the game first.');const response=await client.rpc(name,args);if(response.error)throw response.error;return response.data as T;};
 const failure=(reason:unknown)=>{error=errorText(reason);recalculate();emit();};
 const acceptFarm=(next:FarmSnapshot3D,expectedOwner:string,token:number)=>{
  if(!active(token)||!validFarm(next)||next.owner_id!==expectedOwner)return false;
  const previous=farmVersions.get(expectedOwner),time=Date.parse(next.server_now);
  if(previous&&(next.version<previous.version||next.harvested_carrots<previous.harvested||(next.version===previous.version&&time<previous.time)))return false;
  farmVersions.set(expectedOwner,{version:next.version,time,harvested:next.harvested_carrots});
  if(expectedOwner!==userId&&owner()===expectedOwner)options.onFarm(next);
  if(expectedOwner===userId){
   // Do not replace owner edits made while this response was in flight.
   if(JSON.stringify(metadata(options.getOwnSave()))===publishedSignature)options.onFarm(next);
  }
  if(owner()===expectedOwner){farm=next;farmGood=true;}
  return true;
 };
 const relationship=(next:PlayerProfile3D):PlayerProfile3D=>{if(!state||next.id===userId||next.friendship==='blocked')return next;return {...next,friendship:state.friends.some(peer=>peer.id===next.id)?'friend':state.incoming.some(peer=>peer.id===next.id)?'incoming':state.outgoing.some(peer=>peer.id===next.id)?'outgoing':'none'};};
 const applySocial=(next:SocialState3D)=>{state=next;if(profile)profile=relationship(profile);socialGood=true;};
 const syncSocial=():Promise<void>=>{
  if(mutation)return Promise.resolve();
  if(!options.ready){recalculate();emit();return Promise.resolve();}
  if(socialRunning)return socialRunning;
  const token=generation,version=++stateVersion;
  const run=(async()=>{try{const next=await rpc<SocialState3D>('mmo_social_state');if(!active(token)||version!==stateVersion)return;applySocial(next);recalculate();emit();}catch(reason){if(active(token)&&version===stateVersion){socialGood=false;failure(reason);}}})();
  const tracked=run.finally(()=>{if(socialRunning===tracked)socialRunning=null;});socialRunning=tracked;return tracked;
 };
 const queueProfile=<T,>(task:()=>Promise<T>)=>{const next=profileQueue.then(task,task);profileQueue=next.catch(()=>{});return next;};
 const syncProfile=():Promise<void>=>{
  if(!options.ready){recalculate();emit();return Promise.resolve();}
  if(profileRunning)return profileRunning;
  const token=generation;
  const run=queueProfile(async()=>{
   try{
    if(!active(token))return;
    if(!ownProfile){const own=await rpc<PlayerProfile3D>('mmo_profile',{p_user:userId});if(!active(token))return;if(own.id!==userId)throw new Error('Invalid player profile.');ownProfile=own;}
    const avatar=options.getAvatar(),signature=JSON.stringify(avatar);
    if(signature!==avatarSignature){const next=await rpc<PlayerProfile3D>('mmo_profile_save',{p_bio:ownProfile.bio,p_avatar:avatar});if(!active(token))return;ownProfile=next;avatarSignature=signature;if(profile?.id===userId)profile=next;}
    profileGood=true;recalculate();emit();
   }catch(reason){if(active(token)){profileGood=false;failure(reason);}}
  });
  const tracked=run.finally(()=>{if(profileRunning===tracked)profileRunning=null;});profileRunning=tracked;return tracked;
 };
 const exitVisit=()=>{visiting=null;farm=null;farmGood=false;failedActions.clear();options.onVisit(null);};
 const flushLeaves=():Promise<void>=>{
  if(leaveRunning)return leaveRunning;if(!options.ready||pendingLeaves.size===0)return Promise.resolve();const token=generation;
  const run=(async()=>{for(const expected of pendingLeaves){if(!active(token)||!options.ready)return;try{await rpc('mmo_farm_leave',{p_owner:expected});if(active(token))pendingLeaves.delete(expected);}catch(reason){if(active(token))failure(reason);return;}}})();
  const tracked=run.finally(()=>{if(leaveRunning===tracked)leaveRunning=null;});leaveRunning=tracked;return tracked;
 };
 const syncFarm=():Promise<void>=>{
  if(!options.ready){farmGood=false;recalculate();emit();return Promise.resolve();}
  if(farmRunning)return farmRunning;
  const token=generation;
  const run=(async()=>{try{
   const save=options.getOwnSave(),signature=JSON.stringify(metadata(save));
   if(!published||signature!==publishedSignature){
    const next=await rpc<FarmSnapshot3D>('mmo_farm_publish',{p_snapshot:published?metadata(save):farmSnapshotData3D(save)});
    if(!active(token))return;
    if(!validFarm(next)||next.owner_id!==userId)throw new Error('Invalid farm response.');
    published=true;publishedSignature=signature;acceptFarm(next,userId!,token);
   }
   const expected=owner();
   if(!expected){farm=null;farmGood=true;recalculate();emit();return;}
   const next=await rpc<FarmSnapshot3D>('mmo_farm_state',{p_owner:expected,p_pose:options.getPose()});
   if(!active(token)||owner()!==expected)return;
   if(!validFarm(next)||next.owner_id!==expected)throw new Error('Invalid farm response.');
   acceptFarm(next,expected,token);recalculate();emit();
  }catch(reason){if(active(token)){farmGood=false;if(visiting&&accessDenied(reason))exitVisit();failure(reason);}}})();
  const tracked=run.finally(()=>{if(farmRunning===tracked)farmRunning=null;});farmRunning=tracked;return tracked;
 };
 const refresh=async()=>{if(stopped||!started)return;await Promise.all([syncSocial(),syncProfile(),syncFarm(),flushLeaves()]);};
 const mutate=async(task:(token:number)=>Promise<void>,allowOffline=false):Promise<boolean>=>{
  if(stopped||!started||mutation||!options.ready||(!allowOffline&&status!=='online'))return false;
  mutation=true;stateVersion++;const token=generation;emit();
  try{await task(token);if(!active(token))return false;error='';emit();return true;}
  catch(reason){if(active(token))failure(reason);return false;}
  finally{if(active(token)){mutation=false;emit();}}
 };
 const stateMutation=(name:string,args:Record<string,unknown>)=>mutate(async token=>{const next=await rpc<SocialState3D>(name,args);if(active(token)){applySocial(next);recalculate();}});
 const findPlayers:SocialFarmModel3D['findPlayers']=async query=>{if(stopped||!started||query.trim().length<2)return[];const token=generation;try{const next=await rpc<MmoPlayer3D[]>('mmo_find_players',{p_search:query.trim().slice(0,60),p_limit:12});return active(token)&&Array.isArray(next)?next.filter(player=>player.id!==userId):[];}catch(reason){if(active(token))failure(reason);return[];}};
 const loadProfile:SocialFarmModel3D['loadProfile']=async id=>{
  if(stopped||!started)return;const token=generation,version=++selectedVersion,ownVersion=profileVersion;profile=null;emit();
  try{const next=await rpc<PlayerProfile3D>('mmo_profile',{p_user:id});if(active(token)&&version===selectedVersion&&next.id===id){profile=id===userId&&ownVersion!==profileVersion?ownProfile:relationship(next);emit();}}
  catch(reason){if(active(token)&&version===selectedVersion)failure(reason);}
 };
 const saveProfile:SocialFarmModel3D['saveProfile']=bio=>mutate(async token=>{
  await queueProfile(async()=>{if(!active(token))return;profileVersion++;const avatar=options.getAvatar();const next=await rpc<PlayerProfile3D>('mmo_profile_save',{p_bio:bio,p_avatar:avatar});if(active(token)){ownProfile=next;avatarSignature=JSON.stringify(avatar);profileGood=true;if(!profile||profile.id===userId)profile=next;recalculate();}});
 });
 const friend:SocialFarmModel3D['friend']=(action,target)=>stateMutation('mmo_friend_action',{p_action:action,p_target:target});
 const invite:SocialFarmModel3D['invite']=target=>stateMutation('mmo_farm_invite',{p_target:target});
 const revoke:SocialFarmModel3D['revoke']=guest=>stateMutation('mmo_farm_revoke',{p_guest:guest});
 const respond:SocialFarmModel3D['respond']=(id,accept)=>mutate(async token=>{
  await flushLeaves();if(pendingLeaves.size)throw new Error('Could not finish leaving the previous farm. Please try again.');
  const version=++visitVersion;const next=await rpc<FarmSnapshot3D|null>('mmo_farm_invitation',{p_id:id,p_accept:accept});if(!active(token))return;if(version!==visitVersion){if(accept&&next?.owner_id){pendingLeaves.add(next.owner_id);void flushLeaves();}return;}
  if(accept){if(!validFarm(next!)||next!.owner_id===userId)throw new Error('Invalid visit response.');visiting={id:next!.owner_id,name:next!.owner_name,online:true};farm=next;farmGood=true;farmVersions.set(next!.owner_id,{version:next!.version,time:Date.parse(next!.server_now),harvested:next!.harvested_carrots});options.onVisit(next);}
  if(state)state={...state,farm_invitations:state.farm_invitations.filter(invitation=>invitation.id!==id)};
  // Travel can temporarily pause communication; primary acceptance already succeeded.
  if(options.ready)void syncSocial();recalculate();
 });
 const leave:SocialFarmModel3D['leave']=async()=>{if(stopped)return;const expected=visiting?.id??(owner()!==userId?owner():null);visitVersion++;if(expected)pendingLeaves.add(expected);exitVisit();recalculate();emit();await flushLeaves();};
 const act:SocialFarmModel3D['act']=(action:FarmAction3D,tile:string)=>{
  const expected=owner();if(!expected||!farmGood||farm?.owner_id!==expected)return Promise.resolve(false);
  const signature=JSON.stringify([expected,action,tile]);const nonce=failedActions.get(signature)??crypto.randomUUID();
  return mutate(async token=>{
   failedActions.set(signature,nonce);if(failedActions.size>64)failedActions.delete(failedActions.keys().next().value!);
   const next=await rpc<FarmSnapshot3D>('mmo_farm_action',{p_owner:expected,p_action:action,p_tile:tile,p_nonce:nonce});
   if(!active(token))return;if(!validFarm(next)||next.owner_id!==expected)throw new Error('Invalid farm response.');failedActions.delete(signature);
   if(owner()===expected)acceptFarm(next,expected,token);
  });
 };
 const clearError=()=>{error='';emit();};
 function snapshot():SocialFarmModel3D{return {status,error,busy:mutation,state,profile,selfId:userId,visiting,farm,peers:farm&&userId?farmPeers3D(farm,userId,Date.now()):{},findPlayers,loadProfile,saveProfile,friend,invite,respond,revoke,leave,refresh,clearError,act};}
 const fast=async(token:number)=>{if(!active(token))return;if(options.ready&&!socialGood)await syncSocial();await Promise.all([syncProfile(),syncFarm(),flushLeaves()]);if(active(token))fastTimer=setTimeout(()=>{void fast(token);},700);};
 const slow=async(token:number)=>{if(!active(token))return;if(!mutation)await syncSocial();if(active(token))slowTimer=setTimeout(()=>{void slow(token);},5000);};
 const start=async()=>{if(started||stopped)return;started=true;generation++;if(!client||!userId){status='offline';emit();return;}const token=generation;status='connecting';emit();await Promise.all([fast(token),slow(token)]);};
 const stop=()=>{stopped=true;generation++;clearTimeout(slowTimer);clearTimeout(fastTimer);};
 return {start,stop,snapshot};
}
