begin;
-- Game administrators are assigned by trusted database operations, never profile metadata.
create table private.game_admins(user_id uuid primary key references auth.users on delete cascade);
create table private.game_world_edits(world text primary key,data jsonb not null,version bigint not null default 1);
create table private.game_edit_audit(id bigint generated always as identity primary key,actor uuid not null references auth.users,world text not null,version bigint not null,created_at timestamptz not null default clock_timestamp());
alter table private.game_admins enable row level security;
alter table private.game_world_edits enable row level security;
alter table private.game_edit_audit enable row level security;
revoke all on private.game_admins,private.game_world_edits,private.game_edit_audit from public,anon,authenticated;
insert into private.game_admins select id from auth.users where lower(email)='test@gmail.com' and email_confirmed_at is not null and not coalesce(is_anonymous,false);
create function private.game_is_admin(u uuid) returns boolean language sql stable set search_path='' as $$select exists(select 1 from private.game_admins where user_id=u)$$;
revoke all on function private.game_is_admin(uuid) from public,anon,authenticated;
insert into private.game_world_edits(world,data) values('town','{"objects": {"meadow": {"x": -7, "z": -4, "rotation": 0}, "cats": {"x": -7, "z": -14, "rotation": 0}, "h2h": {"x": 7, "z": -4, "rotation": 0}, "fountain": {"x": 0, "z": -6, "rotation": 0}, "npc-guide": {"x": -3, "z": 5, "rotation": 0}, "npc-merchant": {"x": -7, "z": 0, "rotation": 0}, "npc-host": {"x": 7, "z": 0, "rotation": 0}, "portal": {"x": 0, "z": 12, "rotation": 0}, "tree--14--12": {"x": -14, "z": -12, "rotation": 0}, "tree--14-0": {"x": -14, "z": 0, "rotation": 0}, "tree--14-12": {"x": -14, "z": 12, "rotation": 0}, "tree-14--12": {"x": 14, "z": -12, "rotation": 0}, "tree-14-0": {"x": 14, "z": 0, "rotation": 0}, "tree-14-12": {"x": 14, "z": 12, "rotation": 0}}}');
create function private.game_validate_town(d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare r record;baseline jsonb;
begin
 select data->'objects' into baseline from private.game_world_edits where world='town';
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'objects') is distinct from 'object' or octet_length(d::text)>16384 or (select count(*) from jsonb_object_keys(d->'objects'))<>14 then raise exception 'Invalid town layout';end if;
 for r in select * from jsonb_each(d->'objects') loop
  if not(baseline?r.key) then raise exception 'Unknown town object';end if;
  if r.value='null'::jsonb then
   if r.key in('meadow','cats','h2h','portal') then raise exception 'Shops and travel portal cannot be deleted';end if;
  elsif not coalesce(private.sf_transform(r.value),false) or abs((r.value->>'x')::numeric)>20 or abs((r.value->>'z')::numeric)>20 then raise exception 'Invalid town transform';end if;
 end loop;
 return jsonb_build_object('objects',d->'objects');
end$$;
create function private.game_validate_house(d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare r record;kind text;
begin
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'furniture') is distinct from 'object' or jsonb_typeof(d->'catPositions') is distinct from 'object' or octet_length(d::text)>32768 then raise exception 'Invalid house layout';end if;
 if(select count(*) from jsonb_each(d->'furniture'))>40 or(select count(*) from jsonb_each(d->'catPositions'))>12 then raise exception 'House object limit';end if;
 for r in select key,value,true as furniture from jsonb_each(d->'furniture') union all select key,value,false from jsonb_each(d->'catPositions') loop
  if r.key !~ '^[a-zA-Z0-9_-]{1,40}$' or jsonb_typeof(r.value) is distinct from 'object' or jsonb_typeof(r.value->'x') is distinct from 'number' or jsonb_typeof(r.value->'z') is distinct from 'number' or abs((r.value->>'x')::numeric)>5.5 or abs((r.value->>'z')::numeric)>5.5 or coalesce(r.value->>'rotation','') not in('0','1','2','3') then raise exception 'Invalid house object';end if;
  if r.furniture and coalesce(r.value->>'kind','') not in('bed','cabinet','table','rug','chair','catBed') then raise exception 'Invalid furniture';end if;
  if not r.furniture and r.key !~ '^cat-[0-9]+$' then raise exception 'Invalid cat position';end if;
 end loop;
 return jsonb_build_object('furniture',d->'furniture','catPositions',d->'catPositions');
end$$;
revoke all on function private.game_validate_town(jsonb),private.game_validate_house(jsonb) from public,anon,authenticated;
create or replace function private.game_world_editor(op text,w text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);o uuid;house text;f private.sf_farms;e private.game_world_edits;data jsonb;v bigint;
begin
 if op='role' then return jsonb_build_object('role',case when admin then 'admin' else 'player' end);end if;
 if op='list' then
  if not admin then raise exception 'Admin access required' using errcode='42501';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('owner',q.owner,'name',q.name,'houses',q.houses)) from(select farms.owner,players.name,array['house']||array(select key from jsonb_each(farms.data->'farmLayout'->'buildings') where value->>'style'='cottage') as houses from private.sf_farms farms join private.mmo_players players on players.id=farms.owner order by players.name,farms.owner limit 200)q),'[]');
 end if;
 if op not in('read','save') then raise exception 'Invalid editor action';end if;
 if w<>'town' then
  if w !~ '^(farm|house):[0-9a-fA-F-]{36}(:[a-zA-Z0-9_-]{1,40})?$' then raise exception 'Invalid property';end if;
  o:=split_part(w,':',2)::uuid;house:=split_part(w,':',3);
  if not admin and o<>u then raise exception 'You can only edit your own farm and house' using errcode='42501';end if;
  select * into f from private.sf_farms where owner=o for update;
  if f.owner is null then raise exception 'Farm not published';end if;
  if w like 'house:%' and(house='' or(house<>'house' and coalesce(f.data->'farmLayout'->'buildings'->house->>'style','')<>'cottage')) then raise exception 'House unavailable';end if;
  if w like 'farm:%' and house<>'' then raise exception 'Invalid farm';end if;
 elsif op='save' and not admin then raise exception 'Only admins may edit Town' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('game-edit:'||w,0));
 if w like 'farm:%' then data:=f.data;v:=f.version;
 else select * into e from private.game_world_edits where world=w for update;data:=e.data;v:=coalesce(e.version,0);end if;
 if op='save' then
  if expected is null or expected<>v then raise exception 'This world changed. Reload before saving.' using errcode='40001';end if;
  if w='town' then d:=private.game_validate_town(d);
  elsif w like 'farm:%' then
   -- Layout editing cannot overwrite crops, inventory, economy or ownership.
   d:=private.sf_validate(f.data||jsonb_build_object('farmLayout',d->'farmLayout'));
  else d:=private.game_validate_house(d);end if;
  if w like 'farm:%' then update private.sf_farms set data=d,version=version+1,changed_at=clock_timestamp() where owner=o returning version into v;
  else insert into private.game_world_edits(world,data,version) values(w,d,v+1) on conflict(world) do update set data=excluded.data,version=excluded.version returning version into v;end if;
  insert into private.game_edit_audit(actor,world,version) values(u,w,v);
  data:=d;
 end if;
 return jsonb_build_object('world',w,'version',v,'data',data);
end$$;
revoke all on function private.game_world_editor(text,text,jsonb,bigint) from public,anon;
grant execute on function private.game_world_editor(text,text,jsonb,bigint) to authenticated;
create function public.mmo_world_editor(p_action text default 'read',p_world text default 'town',p_data jsonb default null,p_version bigint default null) returns jsonb language sql security invoker set search_path='' as $$select private.game_world_editor(p_action,p_world,p_data,p_version)$$;
revoke all on function public.mmo_world_editor(text,text,jsonb,bigint) from public,anon;
grant execute on function public.mmo_world_editor(text,text,jsonb,bigint) to authenticated;
-- Called only inside authenticated security-definer APIs and server room proofs.
create function private.game_town_collisions() returns table(kind text,x float8,z float8,r float8,w float8,d float8) language sql stable set search_path='' as $$
 select case when key in('meadow','cats','h2h') then 'box' else 'circle' end,(value->>'x')::float8,(value->>'z')::float8,
 case when key='fountain' then 2.35 else 1.25 end,
 case when(value->>'rotation')::int%2=0 then 2.95 else 2.45 end,case when(value->>'rotation')::int%2=0 then 2.45 else 2.95 end
 from private.game_world_edits,jsonb_each(data->'objects') where world='town' and value<>'null'::jsonb and(key in('meadow','cats','h2h','fountain') or key like 'tree-%')
$$;
revoke all on function private.game_town_collisions() from public,anon,authenticated;
do $$declare signature text;src text;begin
 foreach signature in array array['private.mmo_town_segment_clear(double precision,double precision,double precision,double precision)','private.mmo_town_path_distance(double precision,double precision,double precision,double precision)'] loop
  select pg_get_functiondef(signature::regprocedure) into src;
  src:=replace(src,'IMMUTABLE','STABLE');
  src:=replace(src,'select * from (values(0::float8,-6::float8,2.35::float8),(-14,-12,1.25),(-14,0,1.25),(-14,12,1.25),(14,-12,1.25),(14,0,1.25),(14,12,1.25)) c(x,z,r)','select * from private.game_town_collisions() where kind=''circle''');
  src:=replace(src,'select * from (values(-7::float8,-4::float8),(-7,-14),(7,-4)) b(x,z)','select * from private.game_town_collisions() where kind=''box''');
  src:=replace(src,'array[ax,bx,o.x,2.95::float8],array[az,bz,o.z,2.45::float8]','array[ax,bx,o.x,o.w],array[az,bz,o.z,o.d]');execute src;
 end loop;
end$$;
alter function private.mmo_clear(float8,float8,float8,float8) stable;
-- Add authoritative Town layout and repair positions obstructed by an admin edit.
do $$declare src text;begin
 select pg_get_functiondef('private.mmo_room_session()'::regprocedure) into src;
 src:=replace(src,'private.mmo_room_session()', 'private.mmo_room_session_before_editor()');execute src;
end$$;
revoke all on function private.mmo_room_session_before_editor() from public,anon,authenticated;
create or replace function private.mmo_room_session() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();p private.mmo_players;v jsonb;l jsonb;radius int;angle int;nx float8;nz float8;fixed boolean:=false;
begin
 select * into p from private.mmo_players where id=u for update;
 if p.world_id='town' and p.client is not null and p.seen>clock_timestamp()-interval '15 seconds' and not private.mmo_town_segment_clear(p.x,p.z,p.x,p.z) then
  for radius in 1..100 loop
   for angle in 0..31 loop
    nx:=p.x+radius*.5*cos(angle*pi()/16);nz:=p.z+radius*.5*sin(angle*pi()/16);
    if private.mmo_town_segment_clear(nx,nz,nx,nz) then update private.mmo_players set x=nx,z=nz,budget=0,moved=clock_timestamp(),seq=seq+1,room_revision=room_revision+1 where id=u;fixed:=true;exit;end if;
   end loop;exit when fixed;
  end loop;
  if not fixed then raise exception 'No safe town position';end if;
 end if;
 v:=private.mmo_room_session_before_editor();
 select data into l from private.game_world_edits where world='town';
 return v||jsonb_build_object('townLayout',l);
end$$;
revoke all on function private.mmo_room_session() from public,anon;
grant execute on function private.mmo_room_session() to authenticated;
commit;
