alter table private.mmo_players add column if not exists room_revision bigint not null default 0;
create or replace function private.mmo_farm_walkable(l jsonb,x float8,z float8) returns boolean
language plpgsql immutable set search_path='' as $$
declare h jsonb;r record;q record;dx float8;dz float8;ax float8;az float8;w float8;d float8;linked boolean;trees jsonb;
begin
 if x is null or z is null or not(abs(x)<=23.55 and abs(z)<=23.55) then return false;end if;
 for r in select value from jsonb_each(l->'buildings') union all select l->'house' loop
  h:=r.value;w:=case when(h->>'rotation')::int%2=0 then 2.95 else 2.45 end;d:=case when(h->>'rotation')::int%2=0 then 2.45 else 2.95 end;
  if abs(x-(h->>'x')::float8)<=w and abs(z-(h->>'z')::float8)<=d then return false;end if;
 end loop;
 h:=l->'pond';if h is not null and h<>'null'::jsonb and (x-(h->>'x')::float8)^2+(z-(h->>'z')::float8)^2<=4.65^2 then return false;end if;
 trees:='[[-18,-14],[-15,-15],[-12,-14],[-18,-10],[-14,-10],[-10,-11],[-18,1],[-16,4],[-19,8],[-15,9],[-12,7],[12,-16],[16,-16],[20,-14],[12,-11],[21,-9],[17,2],[20,4],[14,6],[18,9],[21,12],[-20,17],[-16,19],[-11,18],[11,18],[15,20],[20,18]]';
 for r in select value,ordinality from jsonb_array_elements(trees) with ordinality loop
  h:=l->'trees'->('tree-'||r.ordinality);if h='null'::jsonb then continue;end if;
  ax:=coalesce((h->>'x')::float8,(r.value->>0)::float8);az:=coalesce((h->>'z')::float8,(r.value->>1)::float8);
  if(x-ax)^2+(z-az)^2<=1.17^2 then return false;end if;
 end loop;
 h:=l->'portal';
 for dx in select unnest(array[-1.1::float8,1.1::float8]) loop
  ax:=(h->>'x')::float8+case when(h->>'rotation')::int%2=0 then dx else 0 end;
  az:=(h->>'z')::float8+case when(h->>'rotation')::int%2=0 then 0 else dx end;
  if(x-ax)^2+(z-az)^2<=.6^2 then return false;end if;
 end loop;
 for r in select * from jsonb_each(l->'decorations') loop
  if r.value->>'kind'='flowers' then continue;end if;
  ax:=split_part(r.key,',',1)::float8;az:=split_part(r.key,',',2)::float8;linked:=false;
  if r.value->>'kind'='fence' then
   for q in select * from(values(1,0),(-1,0),(0,1),(0,-1)) n(nx,nz) loop
    if l->'decorations'->((ax::int+q.nx)||','||(az::int+q.nz))->>'kind'='fence' then
     linked:=true;
     if abs(x-ax-q.nx*.25)<=(case when q.nx<>0 then .7 else .5 end) and abs(z-az-q.nz*.25)<=(case when q.nz<>0 then .7 else .5 end) then return false;end if;
    end if;
   end loop;
   if linked and(x-ax)^2+(z-az)^2<=.53^2 then return false;end if;
  end if;
  if not linked then
   w:=case when(r.value->>'rotation')::int%2=0 then .92 else .65 end;d:=case when(r.value->>'rotation')::int%2=0 then .65 else .92 end;
   if abs(x-ax)<=w and abs(z-az)<=d then return false;end if;
  end if;
 end loop;
 return true;
end$$;
revoke all on function private.mmo_farm_walkable(jsonb,float8,float8) from public,anon,authenticated;

-- Colyseus authenticates with each player's ordinary JWT, never a privileged key.
create or replace function private.mmo_room_session() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p private.mmo_players;avatar jsonb;layout jsonb;radius int;angle int;nx float8;nz float8;repaired boolean:=false;
begin
 if u is null or not exists(select 1 from auth.users where id=u) then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('sf-access',0));
 select * into p from private.mmo_players where id=u for update;
 if p.id is null or p.client is null or p.seen<=clock_timestamp()-interval '15 seconds' then raise exception 'Connect to the game first' using errcode='42501';end if;
 if p.world_id<>'town' and p.world_id not like 'farm:%' then raise exception 'This world is private' using errcode='42501';end if;
 if not private.sf_scope_ok(u,p.world_id) then raise exception 'Farm access denied' using errcode='42501';end if;
 select pr.avatar into avatar from private.sf_profiles pr where pr.user_id=u;
 if p.world_id like 'farm:%' then
  select data->'farmLayout' into layout from private.sf_farms where owner=substring(p.world_id from 6)::uuid;
  if layout is null then raise exception 'Farm is still loading' using errcode='42501';end if;
  -- Only a newly obstructed position may be repaired; the player supplies no destination.
  if not private.mmo_farm_walkable(layout,p.x,p.z) then
   for radius in 1..100 loop
    for angle in 0..31 loop
     nx:=p.x+radius*.5*cos(angle*pi()/16);nz:=p.z+radius*.5*sin(angle*pi()/16);
     if private.mmo_farm_walkable(layout,nx,nz) then
      update private.mmo_players set x=nx,z=nz,budget=0,moved=clock_timestamp(),seq=seq+1,room_revision=room_revision+1 where id=u returning * into p;
      repaired:=true;exit;
     end if;
    end loop;
    exit when repaired;
   end loop;
   if not repaired then raise exception 'No safe farm position' using errcode='42501';end if;
  end if;
 end if;
 return jsonb_build_object('userId',u,'name',p.name,'world',p.world_id,'serverId',p.server_id,'x',p.x,'z',p.z,'seq',p.seq,'leaseId',p.client,'roomRevision',p.room_revision,
 'allowInitialPosition',not p.pose_initialized and p.world_id='farm:'||u,
 'appearance',coalesce(avatar->'appearance','{}'),'choice',coalesce(avatar->'choice','{}'),'farmLayout',layout,
 'blockedUserIds',coalesce((select jsonb_agg(case when b.user_id=u then b.target else b.user_id end) from private.mmo_blocks b where b.user_id=u or b.target=u),'[]'::jsonb));
end$$;
revoke all on function private.mmo_room_session() from public,anon,authenticated;
grant execute on function private.mmo_room_session() to authenticated;
create or replace function public.mmo_room_session() returns jsonb language sql security invoker set search_path='' as $$select private.mmo_room_session()$$;
revoke all on function public.mmo_room_session() from public,anon;
grant execute on function public.mmo_room_session() to authenticated;
-- Keep the existing SQL authority consistent with Colyseus farm collisions.
-- A user cannot walk into an old obstacle merely to trigger an escape revision.
create or replace function private.mmo_farm_tick(a jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare u uuid:=auth.uid();p private.mmo_players;l jsonb;nx float8;nz float8;distance float8;steps int;i int;blocked boolean:=false;v jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('mmo:'||u::text,0));
 select * into p from private.mmo_players where id=u for update;
 if p.world_id like 'farm:%' then
  select data->'farmLayout' into l from private.sf_farms where owner=substring(p.world_id from 6)::uuid;
  if l is not null then
   nx:=(a->>'x')::float8;nz:=(a->>'z')::float8;
   blocked:=not private.mmo_farm_walkable(l,nx,nz);
   if not blocked and not(not p.pose_initialized and p.world_id='farm:'||u) and (nx<>p.x or nz<>p.z) then
    distance:=sqrt((nx-p.x)^2+(nz-p.z)^2);steps:=greatest(1,least(16.0,ceil(distance/.2))::int);
    for i in 0..steps loop
     if not private.mmo_farm_walkable(l,p.x+(nx-p.x)*i/steps,p.z+(nz-p.z)*i/steps) then blocked:=true;exit;end if;
    end loop;
   end if;
   if blocked then
    v:=private.mmo_base_api('tick',a||jsonb_build_object('x',p.x,'z',p.z));
    return v||jsonb_build_object('accepted',false);
   end if;
  end if;
 end if;
 return private.mmo_base_api('tick',a);
end$$;
revoke all on function private.mmo_farm_tick(jsonb) from public,anon,authenticated;
do $$declare src text;begin
 select pg_get_functiondef('private.mmo_api(text,jsonb)'::regprocedure) into src;
 if position('private.mmo_farm_tick(a)' in src)=0 then
  if position('v:=private.mmo_base_api(op,a);' in src)=0 then raise exception 'Unexpected MMO dispatcher version';end if;
  src:=replace(src,'v:=private.mmo_base_api(op,a);','if op=''tick'' then v:=private.mmo_farm_tick(a);else v:=private.mmo_base_api(op,a);end if;');
  execute src;
 end if;
end$$;

notify pgrst,'reload schema';
