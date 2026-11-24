import type {Session,SupabaseClient,User} from '@supabase/supabase-js';
export type GameAccountState3D={session:Session|null;status:'connecting'|'ready'|'offline'|'error';error:string};
export function canEnterGame3D(user:Pick<User,'id'> & Partial<Pick<User,'email'|'is_anonymous'>>|null|undefined):boolean{
 return Boolean(user?.id&&!user.is_anonymous&&!/^town-[0-9a-f-]{36}@example\.test$/i.test(user.email??''));
}
export function gameLoginError3D(error:unknown):string{
 const message=error&&typeof error==='object'&&'message'in error?String(error.message):'';
 if(/invalid.*(login|credential)|invalid_credentials/i.test(message))return 'The email or password is incorrect.';
 if(/not.confirmed/i.test(message))return 'Confirm your email address before signing in.';
 if(/already.*registered|already.*exists/i.test(message))return 'Try signing in with this email address.';
 if(/rate|too.many/i.test(message))return 'Too many attempts. Please wait a moment and try again.';
 if(/password.*(short|least|weak)/i.test(message))return 'Choose a stronger password with at least 8 characters.';
 return 'Unable to sign in. Check your details and connection, then try again.';
}
export function createGameAccount3D(client:SupabaseClient,onChange:(state:GameAccountState3D)=>void){
 let stopped=false,started=false,revision=0,unsubscribe:(()=>void)|undefined;
 let state:GameAccountState3D={session:null,status:'connecting',error:''};
 const emit=(next:GameAccountState3D)=>{if(!stopped){state=next;onChange({...state});}};
 const verify=async(session:Session|null):Promise<boolean>=>{
  const current=++revision;
  if(!session){emit({session:null,status:'offline',error:''});return false;}
  if(state.status!=='ready'||state.session?.user.id!==session.user.id)emit({session:null,status:'connecting',error:''});
  const result=await client.auth.getUser(session.access_token).catch(error=>{if(!stopped&&current===revision)failure(error);return null;});
  if(!result||stopped||current!==revision)return false;
  if(result.error||!result.data.user){emit({session:null,status:'offline',error:gameLoginError3D(result.error)});return false;}
  if(!canEnterGame3D(result.data.user)||result.data.user.id!==session.user.id){emit({session:null,status:'offline',error:'Sign in with your player account to enter the game.'});await client.auth.signOut({scope:'local'});return false;}
  try{await client.realtime.setAuth(session.access_token);}catch(error){if(!stopped&&current===revision)failure(error);return false;}if(stopped||current!==revision)return false;
  emit({session:{...session,user:result.data.user},status:'ready',error:''});return true;
 };
 const failure=(error:unknown)=>{emit({session:null,status:'offline',error:gameLoginError3D(error)});};
 return{
  async start(){if(started||stopped)return;started=true;
   const subscription=client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||stopped)return;queueMicrotask(()=>{if(!stopped)void verify(session).catch(failure);});});unsubscribe=()=>subscription.data.subscription.unsubscribe();
   const initialRevision=revision;
   try{const result=await client.auth.getSession();if(stopped||initialRevision!==revision)return;if(result.error)throw result.error;await verify(result.data.session);}catch(error){if(!stopped)failure(error);}
  },
  async signIn(email:string,password:string){if(stopped)return false;++revision;emit({session:null,status:'connecting',error:''});
   try{const result=await client.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;return await verify(result.data.session);}catch(error){failure(error);return false;}
  },
  async signUp(email:string,password:string):Promise<'signed-in'|'verify-email'|'error'>{if(stopped)return 'error';++revision;emit({session:null,status:'connecting',error:''});
   try{if(password.length<8)throw new Error('Password too short');const result=await client.auth.signUp({email:email.trim(),password});if(result.error)throw result.error;
    if(result.data.session)return await verify(result.data.session)?'signed-in':'error';emit({session:null,status:'offline',error:''});return 'verify-email';
   }catch(error){failure(error);return 'error';}
  },
  async signOut(){++revision;emit({session:null,status:'offline',error:''});const result=await client.auth.signOut({scope:'local'});if(result.error)failure(result.error);},
  stop(){stopped=true;++revision;unsubscribe?.();},
 };
}
