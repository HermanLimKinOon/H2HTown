-- In-game social profiles and cooperative, invite-only farms.
create table private.sf_profiles(user_id uuid primary key references private.mmo_players on delete cascade,bio text not null default '',avatar jsonb,changed_at timestamptz not null default '-infinity');
create table private.sf_friends(a uuid references private.mmo_players on delete cascade,b uuid references private.mmo_players on delete cascade,primary key(a,b),check(a<b));
create table private.sf_requests(sender uuid references private.mmo_players on delete cascade,target uuid references private.mmo_players on delete cascade,created_at timestamptz not null default clock_timestamp(),primary key(sender,target),check(sender<>target));
create table private.sf_farms(owner uuid primary key references private.mmo_players on delete cascade,data jsonb not null,version bigint not null default 1,harvested_carrots bigint not null default 0,changed_at timestamptz not null default clock_timestamp());
create table private.sf_invites(id uuid primary key default gen_random_uuid(),owner uuid references private.sf_farms on delete cascade,target uuid references private.mmo_players on delete cascade,expires_at timestamptz not null default clock_timestamp()+interval '10 minutes',unique(owner,target));
create table private.sf_grants(owner uuid references private.sf_farms on delete cascade,guest uuid references private.mmo_players on delete cascade,expires_at timestamptz not null default clock_timestamp()+interval '1 hour',primary key(owner,guest));
create table private.sf_poses(user_id uuid primary key references private.mmo_players on delete cascade,pose jsonb not null default '{}');
create table private.sf_actions(user_id uuid references private.mmo_players on delete cascade,nonce uuid not null,owner uuid references private.sf_farms on delete cascade,action text not null,tile text not null,created_at timestamptz not null default clock_timestamp(),primary key(user_id,nonce));
create index sf_actions_rate on private.sf_actions(user_id,created_at desc);
create index sf_invites_target on private.sf_invites(target,expires_at);
create index sf_requests_target on private.sf_requests(target);
create function private.sf_friend(x uuid,y uuid) returns boolean language sql stable set search_path='' as $$select exists(select 1 from private.sf_friends where a=least(x,y) and b=greatest(x,y)) and not private.mmo_blocked(x,y)$$;
create function private.sf_access(x uuid,o uuid) returns boolean language sql volatile set search_path='' as $$select x=o or (private.sf_friend(x,o) and exists(select 1 from private.sf_grants where owner=o and guest=x and expires_at>clock_timestamp()))$$;
create function private.sf_scope_ok(x uuid,w text) returns boolean language plpgsql volatile set search_path='' as $$begin
 if w like 'farm:%' then return private.sf_access(x,substring(w from 6)::uuid);end if;return true;
exception when invalid_text_representation then return false;end$$;
create function private.sf_world(x uuid,w text) returns text language plpgsql set search_path='' as $$begin
 if w in ('farm','house') then return w||':'||x;end if;
 if w='town' then return w;end if;
 if w like 'farm:%' and private.sf_scope_ok(x,w) then return w;end if;
 raise exception 'Farm access denied';end$$;
create function private.sf_invalidate(x uuid,y uuid) returns void language plpgsql set search_path='' as $$begin
 delete from private.sf_invites where(owner=x and target=y) or(owner=y and target=x);
 delete from private.sf_grants where(owner=x and guest=y) or(owner=y and guest=x);
 update private.mmo_players set world_id='farm:'||id,x=0,z=5,seq=0,budget=0,pose_initialized=false,seen='-infinity' where(id=$1 and world_id='farm:'||$2) or(id=$2 and world_id='farm:'||$1);
end$$;
create function private.sf_notify(x uuid) returns void language plpgsql set search_path='' as $$begin
 perform realtime.send('{"type":"social"}'::jsonb,'communication','mmo:inbox:'||x,true);
end$$;
create function private.sf_tile(k text) returns boolean language plpgsql immutable set search_path='' as $$declare x int;z int;begin
 if k is null or length(k)>8 or k !~ '^-?[0-9]+,-?[0-9]+$' then return false;end if;
 x:=split_part(k,',',1)::int;z:=split_part(k,',',2)::int;return abs(x)<=23 and abs(z)<=23 and k=x||','||z;
exception when others then return false;end$$;
create function private.sf_transform(v jsonb) returns boolean language sql immutable set search_path='' as $$select jsonb_typeof(v)='object' and jsonb_typeof(v->'x')='number' and jsonb_typeof(v->'z')='number' and private.sf_tile((v->>'x')||','||(v->>'z')) and coalesce(v->>'rotation','') in ('0','1','2','3')$$;
-- Bound every collection and validate all renderable values; exclude unrelated save/economy fields.
create function private.sf_validate(d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare l jsonb:=d->'farmLayout';r record;n numeric;nowms numeric:=extract(epoch from clock_timestamp())*1000;
begin
 if not(d ?& array['farmLayout','soil','plants','choppedTrees','growth','chickens','farmPausedAt']) or not(l ?& array['house','portal','pond','trees','buildings','terrain','decorations']) or jsonb_typeof(d)<>'object' or octet_length(d::text)>524288 or jsonb_typeof(l)<>'object' then raise exception 'Invalid farm snapshot';end if;
 if not coalesce(private.sf_transform(l->'house'),false) or not coalesce(private.sf_transform(l->'portal'),false) or not(l->'pond'='null'::jsonb or coalesce(private.sf_transform(l->'pond'),false)) then raise exception 'Invalid farm transform';end if;
 for r in select * from jsonb_each(jsonb_build_object('trees',l->'trees','buildings',l->'buildings','terrain',l->'terrain','decorations',l->'decorations','soil',d->'soil','plants',d->'plants','choppedTrees',d->'choppedTrees','growth',d->'growth')) loop
  if jsonb_typeof(r.value)<>'object' or r.value is null then raise exception 'Invalid farm collection: %',r.key;end if;
 end loop;
 if jsonb_array_length(d->'chickens')>120 or jsonb_typeof(d->'chickens') is distinct from 'array' then raise exception 'Invalid chickens';end if;
 if (select count(*) from jsonb_each(l->'buildings'))>20 or (select count(*) from jsonb_each(l->'decorations'))>100 or (select count(*) from jsonb_each(l->'terrain'))>2209 or (select count(*) from jsonb_each(d->'soil'))>2209 or (select count(*) from jsonb_each(d->'plants'))>2209 then raise exception 'Farm collection limit';end if;
 for r in select * from jsonb_each(l->'buildings') loop
  if r.key !~ '^house-[0-9]{1,8}$' or not coalesce(private.sf_transform(r.value),false) or coalesce(r.value->>'style','') not in ('cottage','coop') then raise exception 'Invalid building';end if;
 end loop;
 for r in select * from jsonb_each(l->'trees') loop
  if r.key !~ '^tree-([1-9]|1[0-9]|2[0-7])$' or not(r.value='null'::jsonb or coalesce(private.sf_transform(r.value),false)) then raise exception 'Invalid tree';end if;
 end loop;
 for r in select * from jsonb_each(l->'terrain') loop
  if not private.sf_tile(r.key) or r.value not in ('"grass"'::jsonb,'"path"'::jsonb) then raise exception 'Invalid terrain';end if;
 end loop;
 for r in select * from jsonb_each(l->'decorations') loop
  if not private.sf_tile(r.key) or coalesce(r.value->>'kind','') not in('fence','flowers','bench') or coalesce(r.value->>'rotation','') not in('0','1','2','3') then raise exception 'Invalid decoration';end if;
 end loop;
 for r in select * from jsonb_each(d->'soil') loop
  if not private.sf_tile(r.key) or jsonb_typeof(r.value->'watered') is distinct from 'boolean' then raise exception 'Invalid soil';end if;
 end loop;
 for r in select * from jsonb_each(d->'plants') loop
  if not(r.value ?& array['stage','watered','wateredAt']) or not private.sf_tile(r.key) or not(d->'soil'?r.key) or coalesce(r.value->>'stage','') not in('1','2','3') or jsonb_typeof(r.value->'watered') is distinct from 'boolean' or not(r.value->'wateredAt'='null'::jsonb or(jsonb_typeof(r.value->'wateredAt')='number' and (r.value->>'wateredAt')::numeric between 0 and nowms)) then raise exception 'Invalid plant';end if;
  if (r.value->>'watered')::boolean and r.value->'wateredAt'='null'::jsonb then raise exception 'Watered crop requires clock';end if;
 end loop;
 for r in select * from jsonb_each(d->'choppedTrees') loop
  if r.key !~ '^tree-([1-9]|1[0-9]|2[0-7])$' or jsonb_typeof(r.value)<>'number' or (r.value::text)::numeric not between 0 and nowms then raise exception 'Invalid chopped tree';end if;
 end loop;
 for r in select key from(values('carrotSeconds'),('treeSeconds'),('eggSeconds')) q(key) loop
  if jsonb_typeof(d->'growth'->r.key) is distinct from 'number' or (d->'growth'->>r.key)::numeric not between 1 and 86400 then raise exception 'Invalid growth duration';end if;
 end loop;
 if not(d->'farmPausedAt'='null'::jsonb or(jsonb_typeof(d->'farmPausedAt')='number' and (d->>'farmPausedAt')::numeric between 0 and nowms)) then raise exception 'Invalid pause timestamp';end if;
 for r in select value from jsonb_array_elements(d->'chickens') loop
  if not(r.value ?& array['id','coopId','fedAt']) or coalesce(r.value->>'id','') !~ '^chicken-[0-9]{1,8}$' or coalesce(l->'buildings'->(r.value->>'coopId')->>'style','')<>'coop' or not(r.value->'fedAt'='null'::jsonb or(jsonb_typeof(r.value->'fedAt')='number' and (r.value->>'fedAt')::numeric between 0 and nowms)) then raise exception 'Invalid chicken';end if;
 end loop;
 return jsonb_build_object('farmLayout',l,'soil',d->'soil','plants',d->'plants','choppedTrees',d->'choppedTrees','growth',d->'growth','chickens',d->'chickens','farmPausedAt',d->'farmPausedAt');
end$$;
create function private.sf_clear(l jsonb,tx int,tz int) returns boolean language plpgsql immutable set search_path='' as $$
declare h jsonb;r record;dx float8;dz float8;trees jsonb;terrain text;
begin
 terrain:=l->'terrain'->>(tx||','||tz);
 if terrain is null then terrain:=case when(abs(tx)<1.5 and abs(tz-2)<15) or(abs(tx)<10 and abs(tz-1)<1.3) then 'path' else 'grass' end;end if;
 if terrain<>'grass' or l->'decorations'?(tx||','||tz) then return false;end if;
 h:=l->'portal';if abs(tx-(h->>'x')::float8)<=1.8 and abs(tz-(h->>'z')::float8)<=1.8 then return false;end if;
 h:=l->'pond';if h<>'null'::jsonb and (tx-(h->>'x')::float8)^2+(tz-(h->>'z')::float8)^2<=4.7^2 then return false;end if;
 for r in select value from jsonb_each(l->'buildings') union all select l->'house' loop
  h:=r.value;dx:=abs(tx-(h->>'x')::float8);dz:=abs(tz-(h->>'z')::float8);
  if dx<=(case when (h->>'rotation')::int%2=0 then 2.6 else 2.1 end) and dz<=(case when(h->>'rotation')::int%2=0 then 2.1 else 2.6 end) then return false;end if;
 end loop;
 trees:='[[-18,-14],[-15,-15],[-12,-14],[-18,-10],[-14,-10],[-10,-11],[-18,1],[-16,4],[-19,8],[-15,9],[-12,7],[12,-16],[16,-16],[20,-14],[12,-11],[21,-9],[17,2],[20,4],[14,6],[18,9],[21,12],[-20,17],[-16,19],[-11,18],[11,18],[15,20],[20,18]]';
 for r in select value,ordinality from jsonb_array_elements(trees) with ordinality loop
  h:=l->'trees'->('tree-'||r.ordinality);if h='null'::jsonb then continue;end if;
  dx:=coalesce((h->>'x')::float8,(r.value->>0)::float8);dz:=coalesce((h->>'z')::float8,(r.value->>1)::float8);
  if(tx-dx)^2+(tz-dz)^2<=1.22^2 then return false;end if;
 end loop;return true;
end$$;
create function private.sf_grow(d jsonb,nowms numeric) returns jsonb language plpgsql set search_path='' as $$declare r record;p jsonb;begin
 if d->'farmPausedAt'<>'null'::jsonb then return d;end if;
 for r in select * from jsonb_each(d->'plants') loop
  p:=r.value;
  if(p->>'stage')::int<3 and(p->>'watered')::boolean and p->'wateredAt'<>'null'::jsonb and nowms-(p->>'wateredAt')::numeric>=(d->'growth'->>'carrotSeconds')::numeric*1000 then
   p:=jsonb_build_object('stage',(p->>'stage')::int+1,'watered',false,'wateredAt',null);d:=jsonb_set(d,array['plants',r.key],p);d:=jsonb_set(d,array['soil',r.key,'watered'],'false');
  end if;
 end loop;return d;
end$$;
create function private.sf_profile(u uuid,t uuid) returns jsonb language sql stable set search_path='' as $$select private.mmo_player(p)||jsonb_build_object('bio',coalesce(q.bio,''),'avatar',q.avatar,'friendship',case when u=t then 'self' when private.mmo_blocked(u,t) then 'blocked' when private.sf_friend(u,t) then 'friend' when exists(select 1 from private.sf_requests where sender=u and target=t) then 'outgoing' when exists(select 1 from private.sf_requests where sender=t and target=u) then 'incoming' else 'none' end) from private.mmo_players p left join private.sf_profiles q on q.user_id=p.id where p.id=t$$;
create function private.sf_state(u uuid) returns jsonb language sql volatile set search_path='' as $$select jsonb_build_object(
 'friends',coalesce((select jsonb_agg(private.mmo_player(p)) from private.sf_friends f join private.mmo_players p on p.id=case when f.a=u then f.b else f.a end where u in(f.a,f.b) and not private.mmo_blocked(u,p.id)),'[]'),
 'incoming',coalesce((select jsonb_agg(private.mmo_player(p)) from private.sf_requests r join private.mmo_players p on p.id=r.sender where r.target=u and not private.mmo_blocked(u,p.id)),'[]'),
 'outgoing',coalesce((select jsonb_agg(private.mmo_player(p)) from private.sf_requests r join private.mmo_players p on p.id=r.target where r.sender=u and not private.mmo_blocked(u,p.id)),'[]'),
 'farm_invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'owner_id',i.owner,'owner_name',p.name,'expires_at',i.expires_at)) from private.sf_invites i join private.mmo_players p on p.id=i.owner where i.target=u and i.expires_at>clock_timestamp() and private.sf_friend(u,i.owner)),'[]'),
 'sent_invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'target_id',i.target,'target_name',p.name,'expires_at',i.expires_at)) from private.sf_invites i join private.mmo_players p on p.id=i.target where i.owner=u and i.expires_at>clock_timestamp() and private.sf_friend(u,i.target)),'[]'),
 'visitors',coalesce((select jsonb_agg(jsonb_build_object('id',g.guest,'name',p.name,'expires_at',g.expires_at)) from private.sf_grants g join private.mmo_players p on p.id=g.guest where g.owner=u and g.expires_at>clock_timestamp() and private.sf_friend(u,g.guest)),'[]'))$$;
create function private.sf_snapshot(u uuid,o uuid) returns jsonb language plpgsql set search_path='' as $$
declare f private.sf_farms;d jsonb;nowms numeric;occupants jsonb;
begin
 select * into f from private.sf_farms where owner=o for update;
 if f.owner is null then raise exception 'Farm not published';end if;
 if not private.sf_access(u,o) then raise exception 'Farm access denied';end if;
 nowms:=floor(extract(epoch from clock_timestamp())*1000);d:=private.sf_grow(f.data,nowms);
 if d<>f.data then update private.sf_farms set data=d,version=version+1,changed_at=clock_timestamp() where owner=o returning * into f;end if;
 select coalesce(jsonb_agg(jsonb_build_object('v',1,'userId',p.id,'clientId',p.client,'seq',p.seq,'x',p.x,'z',p.z,'y',coalesce((po.pose->>'y')::float8,0),'yaw',coalesce((po.pose->>'yaw')::float8,0),'moving',coalesce((po.pose->>'moving')::boolean,false),'running',coalesce((po.pose->>'running')::boolean,false),'name',p.name,'appearance',coalesce(pr.avatar->'appearance','{}'),'choice',coalesce(pr.avatar->'choice','{}'))),'[]') into occupants
 from private.mmo_players p left join private.sf_poses po on po.user_id=p.id left join private.sf_profiles pr on pr.user_id=p.id where p.world_id='farm:'||o and p.client is not null and p.seen>clock_timestamp()-interval '15 seconds' and private.sf_access(p.id,o) and not private.mmo_blocked(u,p.id);
 return jsonb_build_object('owner_id',o,'owner_name',(select name from private.mmo_players where id=o),'version',f.version,'server_now',clock_timestamp(),'harvested_carrots',f.harvested_carrots,'snapshot',f.data,'occupants',occupants);
end$$;
create table private.sf_limits(user_id uuid primary key references private.mmo_players on delete cascade,last_social timestamptz not null default '-infinity',last_request timestamptz not null default '-infinity');
create function private.sf_api(op text,a jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t uuid:=(a->>'target')::uuid;o uuid:=(a->>'owner')::uuid;act text:=a->>'action';nowms numeric;tm timestamptz;f private.sf_farms;i private.sf_invites;p private.mmo_players;d jsonb;v jsonb;old jsonb;plant jsonb;tx int;tz int;v_nonce uuid;receipt private.sf_actions;r record;delta numeric;li private.sf_limits;
begin
 if u is null or not exists(select 1 from auth.users where id=u) or not exists(select 1 from private.mmo_players where id=u) then raise exception 'Connect first';end if;
 -- Access mutations are exclusive; reads/ticks/actions remain concurrent with one another.
 if op in('friend','invite','invitation','leave','revoke') then perform pg_advisory_xact_lock(hashtextextended('sf-access',0));else perform pg_advisory_xact_lock_shared(hashtextextended('sf-access',0));end if;
 if op in('publish','action','save_profile') then perform pg_advisory_xact_lock(hashtextextended('mmo:'||u::text,0));end if;
 tm:=clock_timestamp();nowms:=floor(extract(epoch from tm)*1000);
 if op='profile' then
  v:=private.sf_profile(u,t);if v is null then raise exception 'Player unavailable';end if;return v;
 elsif op='save_profile' then
  if length(coalesce(a->>'bio',''))>240 or regexp_replace(a->>'bio',E'[\n\r\t]','','g')~'[[:cntrl:]]' or octet_length(coalesce((a->'avatar')::text,''))>24576 or (a->'avatar'<>'null'::jsonb and jsonb_typeof(a->'avatar')<>'object') then raise exception 'Invalid profile';end if;
  insert into private.sf_profiles(user_id,bio,avatar,changed_at) values(u,coalesce(a->>'bio',''),nullif(a->'avatar','null'::jsonb),tm) on conflict(user_id) do update set bio=excluded.bio,avatar=excluded.avatar,changed_at=tm;
  return private.sf_profile(u,u);
 elsif op='state' then return private.sf_state(u);
 elsif op='friend' then
  if t is null or t=u or not exists(select 1 from private.mmo_players where id=t) then raise exception 'Invalid peer';end if;
  insert into private.sf_limits(user_id) values(u) on conflict do nothing;
  select * into li from private.sf_limits where user_id=u for update;
  if li.last_social>tm-interval '200 milliseconds' then raise exception 'Social rate limit';end if;
  if act='request' then
   if private.mmo_blocked(u,t) or private.sf_friend(u,t) or exists(select 1 from private.sf_requests where sender=u and target=t) then raise exception 'Request unavailable';end if;
   if li.last_request>tm-interval '5 seconds' or(select count(*) from private.sf_requests where sender=u)>=32 or(select count(*) from private.sf_requests where target=t)>=32 then raise exception 'Friend request limit';end if;
   insert into private.sf_requests(sender,target) values(u,t);update private.sf_limits set last_request=tm where user_id=u;
  elsif act='accept' then
   if private.mmo_blocked(u,t) or not exists(select 1 from private.sf_requests where sender=t and target=u) then raise exception 'Request unavailable';end if;
   if(select count(*) from private.sf_friends where u in(sf_friends.a,sf_friends.b))>=200 or(select count(*) from private.sf_friends where t in(sf_friends.a,sf_friends.b))>=200 then raise exception 'Friend limit';end if;
   insert into private.sf_friends values(least(u,t),greatest(u,t)) on conflict do nothing;
   delete from private.sf_requests where(sender=u and target=t)or(sender=t and target=u);
  elsif act='decline' then delete from private.sf_requests where sender=t and target=u;
  elsif act='cancel' then delete from private.sf_requests where sender=u and target=t;
  elsif act='remove' then
   delete from private.sf_friends where sf_friends.a=least(u,t) and b=greatest(u,t);perform private.sf_invalidate(u,t);
  else raise exception 'Invalid friend action';end if;
  update private.sf_limits set last_social=clock_timestamp() where user_id=u;
  perform private.sf_notify(u);perform private.sf_notify(t);return private.sf_state(u);
 elsif op='invite' then
  if t=u or t is null or not private.sf_friend(u,t) or not exists(select 1 from private.sf_farms where owner=u) then raise exception 'Farm invite denied';end if;
  delete from private.sf_invites where expires_at<=clock_timestamp();
  if(select count(*) from private.sf_invites where owner=u)>=16 or(select count(*) from private.sf_invites where target=t)>=32 then raise exception 'Farm invitation limit';end if;
  if exists(select 1 from private.sf_invites where owner=u and target=t and expires_at>tm+interval '9 minutes 55 seconds') then raise exception 'Invitation cooldown';end if;
  insert into private.sf_invites(owner,target) values(u,t) on conflict(owner,target) do update set expires_at=clock_timestamp()+interval '10 minutes';
  perform private.sf_notify(t);return private.sf_state(u);
 elsif op='invitation' then
  select * into i from private.sf_invites where id=(a->>'id')::uuid and target=u for update;
  if i.id is null then raise exception 'Invitation unavailable';end if;
  if(a->>'accept')::boolean then
   if i.expires_at<=clock_timestamp() or not private.sf_friend(u,i.owner) then raise exception 'Invitation expired';end if;
   if(select count(*) from private.sf_grants where owner=i.owner and expires_at>clock_timestamp())>=8 then raise exception 'Farm visitor limit';end if;
   insert into private.sf_grants(owner,guest) values(i.owner,u) on conflict(owner,guest) do update set expires_at=clock_timestamp()+interval '1 hour';
   delete from private.sf_invites where id=i.id;perform private.sf_notify(i.owner);return private.sf_snapshot(u,i.owner);
  end if;
  delete from private.sf_invites where id=i.id;return 'null';
 elsif op in('leave','revoke') then
  if op='leave' then delete from private.sf_grants where owner=o and guest=u;delete from private.sf_invites where owner=o and target=u;update private.mmo_players set world_id='farm:'||id,x=0,z=5,seq=0,budget=0,pose_initialized=false,seen='-infinity' where id=u and world_id='farm:'||o;perform private.sf_notify(o);return 'true';end if;
  delete from private.sf_grants where owner=u and guest=t;delete from private.sf_invites where owner=u and target=t;
  update private.mmo_players set world_id='farm:'||id,x=0,z=5,seen='-infinity',pose_initialized=false where id=t and world_id='farm:'||u;
  perform private.sf_notify(t);return private.sf_state(u);
 elsif op='publish' then
  select * into f from private.sf_farms where owner=u for update;
  d:=private.sf_validate(case when f.owner is null then a->'snapshot' else (a->'snapshot')||jsonb_build_object('soil',f.data->'soil','plants',f.data->'plants') end);
  tm:=clock_timestamp();nowms:=floor(extract(epoch from tm)*1000);
  if f.owner is null then
   if d->'farmPausedAt'<>'null'::jsonb then d:=jsonb_set(d,'{farmPausedAt}',to_jsonb(nowms));end if;
   insert into private.sf_farms(owner,data) values(u,d);
  else
   old:=private.sf_grow(f.data,nowms);d:=d||jsonb_build_object('soil',old->'soil','plants',old->'plants');
   if old->'farmPausedAt'<>'null'::jsonb then
    if d->'farmPausedAt'='null'::jsonb then
     delta:=greatest(0,nowms-(old->>'farmPausedAt')::numeric);
     for r in select * from jsonb_each(old->'plants') loop
      if r.value->'wateredAt'<>'null'::jsonb then d:=jsonb_set(d,array['plants',r.key,'wateredAt'],to_jsonb((r.value->>'wateredAt')::numeric+delta));end if;
     end loop;
     for r in select * from jsonb_each(old->'choppedTrees') loop
      if d->'choppedTrees'?r.key then d:=jsonb_set(d,array['choppedTrees',r.key],to_jsonb((r.value::text)::numeric+delta));end if;
     end loop;
     for r in select value,ordinality from jsonb_array_elements(d->'chickens') with ordinality loop
      select value into plant from jsonb_array_elements(old->'chickens') where value->>'id'=r.value->>'id';
      if plant->'fedAt'<>'null'::jsonb then d:=jsonb_set(d,array['chickens',(r.ordinality-1)::text,'fedAt'],to_jsonb((plant->>'fedAt')::numeric+delta));end if;
     end loop;
    else d:=jsonb_set(d,'{farmPausedAt}',old->'farmPausedAt');end if;
   elsif d->'farmPausedAt'<>'null'::jsonb then d:=jsonb_set(d,'{farmPausedAt}',to_jsonb(nowms));end if;
   update private.sf_farms set data=d,version=version+1,changed_at=tm where owner=u;
  end if;
  return private.sf_snapshot(u,u);
 elsif op in('farm_state','action') then
  if not private.sf_access(u,o) then raise exception 'Farm access denied';end if;
  if op='farm_state' then
   v:=a->'pose';if v<>'null'::jsonb then
    if octet_length(v::text)>1024 or jsonb_typeof(v)<>'object' or jsonb_typeof(v->'y') is distinct from 'number' or jsonb_typeof(v->'yaw') is distinct from 'number' or jsonb_typeof(v->'moving') is distinct from 'boolean' or jsonb_typeof(v->'running') is distinct from 'boolean' or (v->>'y')::numeric not between 0 and 4 or abs((v->>'yaw')::numeric)>100000 then raise exception 'Invalid cosmetic pose';end if;
    insert into private.sf_poses(user_id,pose) values(u,jsonb_build_object('y',v->'y','yaw',v->'yaw','moving',v->'moving','running',(v->>'moving')::boolean and(v->>'running')::boolean)) on conflict(user_id) do update set pose=excluded.pose;
   end if;
   return private.sf_snapshot(u,o);
  end if;
  select * into p from private.mmo_players where id=u for update;
  select * into f from private.sf_farms where owner=o for update;
  tm:=clock_timestamp();nowms:=floor(extract(epoch from tm)*1000);
  if not private.sf_access(u,o) then raise exception 'Farm access denied';end if;
  if p.client is null or p.world_id<>'farm:'||o or p.seen<=tm-interval '15 seconds' then raise exception 'Active farm lease required';end if;
  v_nonce:=(a->>'nonce')::uuid;if v_nonce is null then raise exception 'Nonce required';end if;
  select * into receipt from private.sf_actions where user_id=u and private.sf_actions.nonce=v_nonce;
  if found then
   if receipt.owner<>o or receipt.action<>act or receipt.tile<>a->>'tile' then raise exception 'Nonce conflict';end if;
   return private.sf_snapshot(u,o);
  end if;
  if(select count(*) from private.sf_actions where user_id=u and created_at>tm-interval '1 second')>=10 or(select count(*) from private.sf_actions where user_id=u and created_at>tm-interval '1 minute')>=120 then raise exception 'Farm action rate limit';end if;
  if f.owner is null then raise exception 'Farm not published';end if;
  if f.data->'farmPausedAt'<>'null'::jsonb then raise exception 'Farm paused';end if;
  if not private.sf_tile(a->>'tile') then raise exception 'Invalid farm tile';end if;
  tx:=split_part(a->>'tile',',',1)::int;tz:=split_part(a->>'tile',',',2)::int;
  if abs(tx-floor(p.x+0.5))>1 or abs(tz-floor(p.z+0.5))>1 or(tx=floor(p.x+0.5) and tz=floor(p.z+0.5)) then raise exception 'Use a surrounding tile';end if;
  d:=private.sf_grow(f.data,nowms);plant:=d->'plants'->(a->>'tile');
  if act='dig' then
   if d->'soil'?(a->>'tile') or not private.sf_clear(d->'farmLayout',tx,tz) then raise exception 'Clear grass required';end if;
   d:=jsonb_set(d,array['soil',a->>'tile'],'{"watered":false}');
  elsif act='plant' then
   if not(d->'soil'?(a->>'tile')) or plant is not null then raise exception 'Empty soil required';end if;
   d:=jsonb_set(d,array['plants',a->>'tile'],'{"stage":1,"watered":false,"wateredAt":null}');
  elsif act='water' then
   if plant is null or(plant->>'stage')::int>=3 or(plant->>'watered')::boolean then raise exception 'Crop does not need water';end if;
   d:=jsonb_set(d,array['plants',a->>'tile'],plant||jsonb_build_object('watered',true,'wateredAt',nowms));d:=jsonb_set(d,array['soil',a->>'tile','watered'],'true');
  elsif act='harvest' then
   if plant is null or(plant->>'stage')::int<>3 then raise exception 'Crop not ready';end if;
   d:=d#-array['plants',a->>'tile'];update private.sf_farms set harvested_carrots=harvested_carrots+1 where owner=o;
  elsif act='restore' then
   if u<>o then raise exception 'Owner only';end if;
   if not(d->'soil'?(a->>'tile')) then raise exception 'Soil required';end if;
   d:=(d#-array['soil',a->>'tile'])#-array['plants',a->>'tile'];
  else raise exception 'Invalid farm action';end if;
  update private.sf_farms set data=d,version=version+1,changed_at=tm where owner=o;
  insert into private.sf_actions(user_id,nonce,owner,action,tile) values(u,v_nonce,o,act,a->>'tile');
  return private.sf_snapshot(u,o);
 end if;
 raise exception 'Invalid social operation';
end$$;
-- Upgrade the existing dispatcher without editing its historical migration.
-- Preserve its tested routing, rate limits and movement validation behind a checked wrapper.
do $$declare src text;begin
 select pg_get_functiondef('private.mmo_api(text,jsonb)'::regprocedure) into src;
 if position('if w in (''farm'',''house'') then w:=w||'':''||u;elsif w<>''town'' then raise exception ''Unknown world'';end if;' in src)=0 then raise exception 'Unexpected MMO dispatcher version';end if;
 alter function private.mmo_api(text,jsonb) rename to mmo_base_api;
 src:=replace(src,'FUNCTION private.mmo_api(','FUNCTION private.mmo_base_api(');
 src:=replace(src,'if w in (''farm'',''house'') then w:=w||'':''||u;elsif w<>''town'' then raise exception ''Unknown world'';end if;','w:=private.sf_world(u,w);');
 src:=replace(src,'not p.pose_initialized and p.world_id<>''town''','not p.pose_initialized and (p.world_id=''farm:''||u or p.world_id=''house:''||u)');
 src:=replace(src,'else 5 end,seq=0','else case when w like ''farm:%'' and w<>''farm:''||u then 8 else 5 end end,seq=0');
 src:=replace(src,'c in (''local'',''world'',''system'') and pp.client','c in (''local'',''world'',''system'') and private.sf_scope_ok(pp.id,pp.world_id) and pp.client');
 execute src;
end$$;
create function private.mmo_api(op text,a jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p private.mmo_players;v jsonb;t uuid;begin
 if u is null or not exists(select 1 from auth.users where id=u) then raise exception 'Authentication required';end if;
 if op='social' and a->>'action' in('block','unblock') then perform pg_advisory_xact_lock(hashtextextended('sf-access',0));else perform pg_advisory_xact_lock_shared(hashtextextended('sf-access',0));end if;
 select * into p from private.mmo_players where id=u;
 if(op='tick' or(op in('send','history','read') and a->>'channel' in('local','world'))) and not private.sf_scope_ok(u,p.world_id) then raise exception 'Farm access denied';end if;
 v:=private.mmo_base_api(op,a);
 if op='social' and a->>'action'='block' then
  t:=(a->>'target')::uuid;perform private.sf_invalidate(u,t);
  delete from private.sf_requests where(sender=u and target=t)or(sender=t and target=u);
  delete from private.sf_friends where sf_friends.a=least(u,t) and b=greatest(u,t);
  perform private.sf_notify(t);
 end if;
 return v;
end$$;
create function public.mmo_social_state() returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('state','{}')$$;
create function public.mmo_profile(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('profile',jsonb_build_object('target',p_user))$$;
create function public.mmo_profile_save(p_bio text,p_avatar jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('save_profile',jsonb_build_object('bio',p_bio,'avatar',p_avatar))$$;
create function public.mmo_friend_action(p_action text,p_target uuid) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('friend',jsonb_build_object('action',p_action,'target',p_target))$$;
create function public.mmo_farm_invite(p_target uuid) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('invite',jsonb_build_object('target',p_target))$$;
create function public.mmo_farm_invitation(p_id uuid,p_accept boolean) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('invitation',jsonb_build_object('id',p_id,'accept',p_accept))$$;
create function public.mmo_farm_leave(p_owner uuid) returns boolean language sql security invoker set search_path='' as $$select private.sf_api('leave',jsonb_build_object('owner',p_owner))::boolean$$;
create function public.mmo_farm_revoke(p_guest uuid) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('revoke',jsonb_build_object('target',p_guest))$$;
create function public.mmo_farm_publish(p_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('publish',jsonb_build_object('snapshot',p_snapshot))$$;
create function public.mmo_farm_state(p_owner uuid,p_pose jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('farm_state',jsonb_build_object('owner',p_owner,'pose',p_pose))$$;
create function public.mmo_farm_action(p_owner uuid,p_action text,p_tile text,p_nonce uuid) returns jsonb language sql security invoker set search_path='' as $$select private.sf_api('action',jsonb_build_object('owner',p_owner,'action',p_action,'tile',p_tile,'nonce',p_nonce))$$;
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='private' and tablename like 'sf_%' loop
  execute format('alter table private.%I enable row level security',r.tablename);execute format('revoke all on private.%I from public,anon,authenticated',r.tablename);
 end loop;
 for r in select p.oid::regprocedure sig,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='private' and(p.proname like 'sf_%' or p.proname in('mmo_api','mmo_base_api')))or(n.nspname='public' and(p.proname like 'mmo_farm_%' or p.proname in('mmo_social_state','mmo_profile','mmo_profile_save','mmo_friend_action'))) loop
  execute format('revoke all on function %s from public,anon,authenticated',r.sig);
  if r.nspname='public' or r.proname in('sf_api','mmo_api') then execute format('grant execute on function %s to authenticated',r.sig);end if;
 end loop;
end$$;
notify pgrst,'reload schema';
