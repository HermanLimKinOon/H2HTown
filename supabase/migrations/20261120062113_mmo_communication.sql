-- Authoritative MMO communication. No client table writes or broadcast sends.
create schema if not exists private;
create table private.mmo_servers(id text primary key);
insert into private.mmo_servers values ('local-1');
create table private.mmo_settings(singleton boolean primary key default true check(singleton),local_radius float8 not null default 30 check(local_radius>0 and local_radius<=200));
insert into private.mmo_settings(singleton) values(true);
create table private.mmo_players(
 id uuid primary key references auth.users(id) on delete cascade,name text not null,
 client uuid,world_id text not null default 'town',server_id text not null default 'local-1' references private.mmo_servers,
 x float8 not null default 0,z float8 not null default 5,seq bigint not null default 0,
 seen timestamptz not null default '-infinity',moved timestamptz not null default now(),budget float8 not null default 0,
 social_at timestamptz not null default '-infinity',pose_initialized boolean not null default false);
create table private.mmo_groups(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('party','guild')),name text not null,
 permissions jsonb not null default '{"owner":{"read":true,"write":true,"invite":true},"officer":{"read":true,"write":true,"invite":true},"member":{"read":true,"write":true,"invite":false}}');
create table private.mmo_members(group_id uuid references private.mmo_groups on delete cascade,user_id uuid references private.mmo_players on delete cascade,kind text not null,role text not null check(role in ('owner','officer','member')),joined_at timestamptz not null default clock_timestamp(),primary key(group_id,user_id),unique(user_id,kind));
create table private.mmo_invites(id uuid primary key default gen_random_uuid(),group_id uuid references private.mmo_groups on delete cascade,inviter uuid references private.mmo_players on delete cascade,target uuid references private.mmo_players on delete cascade,expires_at timestamptz not null default clock_timestamp()+interval '1 day',unique(group_id,target));
create table private.mmo_blocks(user_id uuid references private.mmo_players on delete cascade,target uuid references private.mmo_players on delete cascade,primary key(user_id,target));
create table private.mmo_staff(user_id uuid primary key references auth.users on delete cascade);
create table private.mmo_messages(id bigint generated always as identity primary key,channel text not null,sender_id uuid references private.mmo_players on delete set null,sender_name text not null,body text not null,kind text not null,created_at timestamptz not null default clock_timestamp(),group_id uuid references private.mmo_groups on delete set null,recipient_id uuid references private.mmo_players on delete set null,world_id text not null,server_id text not null,origin jsonb,nonce uuid,unique(sender_id,nonce));
create index mmo_message_rate on private.mmo_messages(sender_id,created_at desc);
create table private.mmo_deliveries(message_id bigint references private.mmo_messages on delete cascade,user_id uuid references private.mmo_players on delete cascade,read_at timestamptz,primary key(message_id,user_id));
create index mmo_delivery_user on private.mmo_deliveries(user_id,message_id desc);
-- No browser may forge either the new inbox or the old prototype inbox.
drop policy if exists "3D nearby chat inbox send" on realtime.messages;
create policy "MMO inbox receive" on realtime.messages for select to authenticated using(extension='broadcast' and topic='mmo:inbox:'||(select auth.uid())::text and (select realtime.topic())='mmo:inbox:'||(select auth.uid())::text);
create policy "MMO inbox isolation" on realtime.messages as restrictive for select to authenticated using (
 topic not like 'mmo:inbox:%' or (extension='broadcast' and topic='mmo:inbox:'||(select auth.uid())::text and (select realtime.topic())=topic));
create policy "MMO inbox never client write" on realtime.messages as restrictive for insert to authenticated with check (topic not like 'mmo:inbox:%' and (select realtime.topic()) not like 'mmo:inbox:%');

create function private.mmo_json(m private.mmo_messages) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',m.id::text,'channel',m.channel,'sender_id',m.sender_id,'sender_name',m.sender_name,'body',m.body,'kind',m.kind,'created_at',m.created_at,'group_id',m.group_id,'recipient_id',m.recipient_id,'world_id',m.world_id,'server_id',m.server_id,'origin',m.origin,'nonce',m.nonce)
$$;
create function private.mmo_blocked(a uuid,b uuid) returns boolean language sql stable set search_path='' as $$select exists(select 1 from private.mmo_blocks where (user_id=a and target=b) or (user_id=b and target=a))$$;
create function private.mmo_presence(p private.mmo_players,ok boolean default true) returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('x',p.x,'z',p.z,'seq',p.seq,'world_id',p.world_id,'server_id',p.server_id,'accepted',ok)$$;
create function private.mmo_player(p private.mmo_players) returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('id',p.id,'name',p.name,'online',p.client is not null and p.seen>clock_timestamp()-interval '15 seconds','world_id',p.world_id)$$;
create function private.mmo_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p private.mmo_players;r jsonb;
begin
 if u is null then raise exception 'Authentication required';end if;
 select * into p from private.mmo_players where id=u;
 if not found then raise exception 'Connect first';end if;
 select jsonb_build_object('profile',private.mmo_player(p),'config',jsonb_build_object('local_radius',(select local_radius from private.mmo_settings where singleton),'max_length',400,'preview_seconds',6.5,'retention_days',90),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'kind',g.kind,'name',g.name,'role',me.role,'permissions',g.permissions,'my_permissions',case when me.role='owner' then '{"read":true,"write":true,"invite":true}'::jsonb else g.permissions->me.role end,'members',(select jsonb_agg(private.mmo_player(pp)||jsonb_build_object('role',mm.role)) from private.mmo_members mm join private.mmo_players pp on pp.id=mm.user_id where mm.group_id=g.id))) from private.mmo_groups g join private.mmo_members me on me.group_id=g.id where me.user_id=u),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'group_id',g.id,'kind',g.kind,'group_name',g.name,'inviter_name',pp.name,'expires_at',i.expires_at)) from private.mmo_invites i join private.mmo_groups g on g.id=i.group_id join private.mmo_players pp on pp.id=i.inviter where i.target=u and i.expires_at>clock_timestamp() and not private.mmo_blocked(u,i.inviter)),'[]'::jsonb),
 'blocked',coalesce((select jsonb_agg(private.mmo_player(pp)) from private.mmo_blocks b join private.mmo_players pp on pp.id=b.target where b.user_id=u),'[]'::jsonb),
 'unread_private',(select count(*) from private.mmo_deliveries d join private.mmo_messages m on m.id=d.message_id where d.user_id=u and d.read_at is null and m.channel='private' and m.sender_id<>u),
 'conversations',coalesce((select jsonb_agg(jsonb_build_object('peer_id',q.peer,'peer_name',pp.name,'online',pp.client is not null and pp.seen>clock_timestamp()-interval '15 seconds','last_body',q.body,'last_at',q.created_at,'unread',(select count(*) from private.mmo_deliveries dd join private.mmo_messages mm on mm.id=dd.message_id where dd.user_id=u and dd.read_at is null and mm.channel='private' and mm.sender_id=q.peer))) from (select distinct on (case when m.sender_id=u then m.recipient_id else m.sender_id end) case when m.sender_id=u then m.recipient_id else m.sender_id end peer,m.body,m.created_at from private.mmo_messages m join private.mmo_deliveries d on d.message_id=m.id and d.user_id=u where m.channel='private' order by case when m.sender_id=u then m.recipient_id else m.sender_id end,m.id desc) q join private.mmo_players pp on pp.id=q.peer),'[]'::jsonb)) into r;
 return r;
end $$;
-- Segment sampling at <=0.2 units with avatar padding; max segment is speed limited.
create function private.mmo_clear(ax float8,az float8,bx float8,bz float8) returns boolean language sql immutable set search_path='' as $$
 select not exists(select 1 from generate_series(0,greatest(1,ceil(sqrt((bx-ax)^2+(bz-az)^2)/0.2)::int)) s cross join lateral (select ax+(bx-ax)*s/greatest(1,ceil(sqrt((bx-ax)^2+(bz-az)^2)/0.2)::int) x,az+(bz-az)*s/greatest(1,ceil(sqrt((bx-ax)^2+(bz-az)^2)/0.2)::int) z) p where
 (abs(x+7)<2.95 and (abs(z+4)<2.45 or abs(z+14)<2.45)) or(abs(x-7)<2.95 and abs(z+4)<2.45) or x*x+(z+6)^2<2.35^2 or exists(select 1 from (values(-14,-12),(-14,0),(-14,12),(14,-12),(14,0),(14,12)) trees(tx,tz) where (x-tx)^2+(z-tz)^2<1.25^2))
$$;
create function private.mmo_api(op text,a jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p private.mmo_players;m private.mmo_messages;g private.mmo_groups;me private.mmo_members;other private.mmo_members;i private.mmo_invites;
 t uuid:=nullif(a->>'target','')::uuid;gid uuid:=nullif(a->>'group','')::uuid;c text:=a->>'channel';action text:=a->>'action';k text:=coalesce(a->>'kind','party');
 tm timestamptz;v jsonb;rr record;w text;s text;nx float8;nz float8;b float8;ok boolean;cnt int;v_nonce uuid;
begin
 if u is null or not exists(select 1 from auth.users where id=u) then raise exception 'Authentication required';end if;
 if op='social' and action='invite' and t is not null then
  perform pg_advisory_xact_lock(hashtextextended('mmo-invite-target:'||t::text,0));
 end if;
 -- Serialize all user operations, including first connect/idempotency and social changes.
 perform pg_advisory_xact_lock(hashtextextended('mmo:'||u::text,0));
 select * into p from private.mmo_players where id=u for update;
 tm:=clock_timestamp();
 if op='connect' then
  s:=coalesce(a->>'server','local-1');w:=coalesce(a->>'world','town');
  if not exists(select 1 from private.mmo_servers where id=s) then raise exception 'Unknown server';end if;
  if w in ('farm','house') then w:=w||':'||u;elsif w<>'town' then raise exception 'Unknown world';end if;
  if a->>'client' is null then raise exception 'Client lease required';end if;
  insert into private.mmo_players(id,name,client,world_id,server_id,seen,moved,pose_initialized) values(u,left(coalesce(nullif(regexp_replace(a->>'name','[[:cntrl:]]','','g'),''),'Player'),32),(a->>'client')::uuid,w,s,tm,tm,w='town')
  on conflict(id) do update set name=excluded.name,client=excluded.client,world_id=w,server_id=s,x=case when private.mmo_players.world_id=w and private.mmo_players.server_id=s then private.mmo_players.x else 0 end,z=case when private.mmo_players.world_id=w and private.mmo_players.server_id=s then private.mmo_players.z else 5 end,seq=0,seen=tm,moved=tm,budget=0,pose_initialized=(w='town') returning * into p;
  return private.mmo_state()||jsonb_build_object('presence',private.mmo_presence(p));
 end if;
 if p.id is null then raise exception 'Connect first';end if;
 if op='state' then return private.mmo_state();end if;
 if op='tick' then
  if p.client is distinct from (a->>'client')::uuid then raise exception 'Inactive client lease';end if;
  nx:=(a->>'x')::float8;nz:=(a->>'z')::float8;b:=least(3.0,p.budget+greatest(0,extract(epoch from tm-p.moved))*8.5);
  ok:=nx is not null and nz is not null and abs(nx)<=case when p.world_id like 'house:%' then 5.5 else 23.55 end and abs(nz)<=case when p.world_id like 'house:%' then 5.5 else 23.55 end and (a->>'seq')::bigint>p.seq and ((not p.pose_initialized and p.world_id<>'town') or sqrt((nx-p.x)^2+(nz-p.z)^2)<=b) and (p.world_id<>'town' or private.mmo_clear(p.x,p.z,nx,nz));
  update private.mmo_players set x=case when ok then nx else x end,z=case when ok then nz else z end,pose_initialized=pose_initialized or ok,budget=case when ok and not p.pose_initialized and p.world_id<>'town' then 0 when ok then b-sqrt((nx-p.x)^2+(nz-p.z)^2) else b end,moved=tm,seen=tm,seq=greatest(seq,coalesce((a->>'seq')::bigint,seq)) where id=u returning * into p;
  return private.mmo_presence(p,ok);
 elsif op='leave' then
  update private.mmo_players set client=null,seen='-infinity' where id=u and client=(a->>'client')::uuid;return to_jsonb(found);
 elsif op='find' then
  return coalesce((select jsonb_agg(private.mmo_player(pp)) from (select * from private.mmo_players pp where pp.id<>u and not private.mmo_blocked(u,pp.id) and pp.name ilike '%'||left(coalesce(a->>'search',''),32)||'%' order by pp.seen desc limit greatest(1,least(30,coalesce((a->>'limit')::int,12)))) pp),'[]');
 elsif op in ('send','announce') then
  gid:=null;v_nonce:=(a->>'nonce')::uuid;
  if op='send' then
   if v_nonce is null then raise exception 'Nonce required';end if;
   select * into m from private.mmo_messages where sender_id=u and private.mmo_messages.nonce=v_nonce;
   if found then return private.mmo_json(m);end if;
  end if;
  if length(trim(coalesce(a->>'body','')))=0 or length(a->>'body')>400 or (a->>'body') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F]' then raise exception 'Invalid message';end if;
  if (select count(*) from private.mmo_messages where sender_id=u and created_at>tm-interval '10 seconds')>=8 or (select count(*) from private.mmo_messages where sender_id=u and created_at>tm-interval '1 minute')>=30 then raise exception 'Message rate limit';end if;
  if exists(select 1 from private.mmo_messages where sender_id=u and body=trim(a->>'body') and created_at>tm-interval '5 seconds') then raise exception 'Duplicate spam';end if;
  if op='announce' then
   if not exists(select 1 from private.mmo_staff where user_id=u) then raise exception 'Staff only';end if;
   c:='system';w:=coalesce(a->>'world','town');s:=coalesce(a->>'server','local-1');k:='announcement';
   if not exists(select 1 from private.mmo_servers where id=s) or w<>'town' then raise exception 'Unknown announcement scope';end if;
  else
   if c not in ('local','world','party','guild','private') or c is null then raise exception 'Invalid channel';end if;
   k:=coalesce(a->>'kind','text');if k not in ('text','emote') then raise exception 'Invalid kind';end if;
   w:=p.world_id;s:=p.server_id;
   if c in ('local','world') and (p.client is null or p.seen<tm-interval '15 seconds') then raise exception 'Position lease expired';end if;
   if c='private' and (t is null or t=u or not exists(select 1 from private.mmo_players where id=t) or private.mmo_blocked(u,t)) then raise exception 'Private peer unavailable';end if;
   if c in ('party','guild') then
    select gg.* into g from private.mmo_groups gg join private.mmo_members mm on mm.group_id=gg.id where mm.user_id=u and gg.kind=c for update of gg;
    tm:=clock_timestamp();
    select * into me from private.mmo_members where group_id=g.id and user_id=u;
    if g.id is null or (me.role<>'owner' and not coalesce((g.permissions->me.role->>'write')::boolean,false)) then raise exception 'Group write denied';end if;gid:=g.id;
   end if;
  end if;
  insert into private.mmo_messages(channel,sender_id,sender_name,body,kind,group_id,recipient_id,world_id,server_id,origin,nonce) values(c,u,p.name,trim(a->>'body'),k,gid,case when c='private' then t end,w,s,case when c='local' then jsonb_build_object('x',p.x,'z',p.z) end,v_nonce) returning * into m;
  for rr in select pp.id from private.mmo_players pp where (pp.id=u or not private.mmo_blocked(u,pp.id)) and
   (pp.id=u or(c='private' and pp.id=t) or(c in ('local','world','system') and pp.client is not null and pp.seen>tm-interval '15 seconds' and pp.world_id=w and pp.server_id=s and (c<>'local' or (pp.x-p.x)^2+(pp.z-p.z)^2<=(select local_radius^2 from private.mmo_settings where singleton))) or(c in ('party','guild') and exists(select 1 from private.mmo_members mm where mm.user_id=pp.id and mm.group_id=gid and (mm.role='owner' or coalesce((g.permissions->mm.role->>'read')::boolean,false)))))
  loop
   insert into private.mmo_deliveries values(m.id,rr.id,case when rr.id=u then tm end);
   perform realtime.send(jsonb_build_object('type','message','message',private.mmo_json(m)),'communication','mmo:inbox:'||rr.id,true);
  end loop;
  return private.mmo_json(m);
 elsif op in ('history','read') then
  if c not in ('local','world','private','party','guild','system') or c is null then raise exception 'Invalid channel';end if;
  if c='private' and t is null then raise exception 'Peer required';end if;
  if c in ('party','guild') then
   select gg.* into g from private.mmo_groups gg join private.mmo_members mm on mm.group_id=gg.id where mm.user_id=u and gg.kind=c;
   select * into me from private.mmo_members where group_id=g.id and user_id=u;
   if g.id is null or (me.role<>'owner' and not coalesce((g.permissions->me.role->>'read')::boolean,false)) then raise exception 'Group read denied';end if;
  end if;
  if op='read' then
   update private.mmo_deliveries d set read_at=tm from private.mmo_messages mm where d.message_id=mm.id and d.user_id=u and mm.channel=c and mm.id<=coalesce((a->>'through')::bigint,0) and(c<>'private' or mm.sender_id=t or mm.recipient_id=t) and(c not in ('party','guild') or mm.group_id=g.id);
   return jsonb_build_object('unread_private',(private.mmo_state()->'unread_private'));
  end if;
  return coalesce((select jsonb_agg(private.mmo_json(q) order by q.id desc) from(select mm.* from private.mmo_messages mm join private.mmo_deliveries d on d.message_id=mm.id where d.user_id=u and mm.channel=c and(c<>'private' or mm.sender_id=t or mm.recipient_id=t) and(c not in ('party','guild') or(mm.group_id=g.id and mm.created_at>=me.joined_at)) and (a->>'before' is null or (mm.created_at,mm.id)<((a->>'before')::timestamptz,coalesce((a->>'before_id')::bigint,9223372036854775807))) order by mm.id desc limit greatest(1,least(100,coalesce((a->>'limit')::int,30)))) q),'[]');
 elsif op='social' then
  if k not in ('party','guild') then raise exception 'Invalid group kind';end if;
  if p.social_at>tm-interval '150 milliseconds' then raise exception 'Social rate limit';end if;
  update private.mmo_players set social_at=tm where id=u;
  if action in ('block','unblock') then
   if t is null or t=u or not exists(select 1 from private.mmo_players where id=t) then raise exception 'Invalid peer';end if;
   if action='block' then insert into private.mmo_blocks values(u,t) on conflict do nothing;delete from private.mmo_invites where (target=u and inviter=t) or(target=t and inviter=u);
   else delete from private.mmo_blocks where user_id=u and target=t;end if;
  elsif action='create' then
   if exists(select 1 from private.mmo_members where user_id=u and kind=k) then raise exception 'Already a member';end if;
   if length(trim(coalesce(a->>'name','')))=0 or length(a->>'name')>48 then raise exception 'Invalid group name';end if;
   insert into private.mmo_groups(kind,name) values(k,trim(a->>'name')) returning * into g;
   insert into private.mmo_members(group_id,user_id,kind,role) values(g.id,u,k,'owner');
  elsif action in ('accept','decline') then
   select * into i from private.mmo_invites where id=t and target=u;
   if i.id is null then raise exception 'Invitation unavailable';end if;
   select * into g from private.mmo_groups where id=i.group_id for update;
   tm:=clock_timestamp();
   if action='accept' then
    if i.expires_at<tm or private.mmo_blocked(u,i.inviter) or not exists(select 1 from private.mmo_members mm where mm.group_id=g.id and mm.user_id=i.inviter and (mm.role='owner' or coalesce((g.permissions->mm.role->>'invite')::boolean,false))) then raise exception 'Invitation expired';end if;
    if (select count(*) from private.mmo_members where group_id=g.id)>=(case when g.kind='party' then 8 else 100 end) then raise exception 'Group full';end if;
    insert into private.mmo_members(group_id,user_id,kind,role) values(g.id,u,g.kind,'member');
   end if;
   delete from private.mmo_invites where id=i.id;
  else
   select * into g from private.mmo_groups where id=gid for update;
   tm:=clock_timestamp();
   select * into me from private.mmo_members where group_id=g.id and user_id=u;
   if me.user_id is null then raise exception 'Group membership required';end if;
   select * into other from private.mmo_members where group_id=g.id and user_id=t;
   if action='invite' then
    if (me.role<>'owner' and not coalesce((g.permissions->me.role->>'invite')::boolean,false)) or private.mmo_blocked(u,t) or t=u or t is null then raise exception 'Invite denied';end if;
    if (select count(*) from private.mmo_members where group_id=g.id)>=(case when g.kind='party' then 8 else 100 end) then raise exception 'Group full';end if;
    -- Ignore expired invitations for quotas; serialize target quota independently
    -- from user/group locks so concurrent inviters cannot overfill one inbox.
    delete from private.mmo_invites where group_id=g.id and expires_at<=tm;
    if not exists(select 1 from private.mmo_invites where group_id=g.id and target=t and expires_at>tm) then
     if (select count(*) from private.mmo_invites where group_id=g.id and expires_at>tm)>=(case when g.kind='party' then 16 else 200 end)
       or (select count(*) from private.mmo_invites where inviter=u and expires_at>tm)>=32
       or (select count(*) from private.mmo_invites where target=t and expires_at>tm)>=32 then raise exception 'Invitation limit';end if;
    end if;
    insert into private.mmo_invites(group_id,inviter,target) values(g.id,u,t) on conflict(group_id,target) do update set inviter=u,expires_at=tm+interval '1 day';
   elsif action='leave' then
    delete from private.mmo_members where group_id=g.id and user_id=u;
    if me.role='owner' then
     select * into other from private.mmo_members where group_id=g.id order by case role when 'officer' then 0 else 1 end,joined_at,user_id limit 1;
     if other.user_id is null then delete from private.mmo_groups where id=g.id;else update private.mmo_members set role='owner' where group_id=g.id and user_id=other.user_id;end if;
    end if;
   elsif action='kick' then
    if other.user_id is null or other.role='owner' or (me.role<>'owner' and not(me.role='officer' and other.role='member')) then raise exception 'Kick denied';end if;
    delete from private.mmo_members where group_id=g.id and user_id=t;
   elsif action='role' then
    if me.role<>'owner' or other.user_id is null or t=u or a->>'role' not in ('officer','member') then raise exception 'Role denied';end if;
    update private.mmo_members set role=a->>'role' where group_id=g.id and user_id=t;
   elsif action='permissions' then
    if me.role<>'owner' or jsonb_typeof(a->'permissions')<>'object' then raise exception 'Permissions denied';end if;
    for rr in select role,perm from (values('owner'),('officer'),('member')) roles(role) cross join (values('read'),('write'),('invite')) perms(perm) loop
     if jsonb_typeof(a->'permissions'->rr.role->rr.perm)<>'boolean' or a->'permissions'->rr.role->rr.perm is null then raise exception 'Invalid permissions';end if;
    end loop;
    update private.mmo_groups set permissions=(a->'permissions')||'{"owner":{"read":true,"write":true,"invite":true}}'::jsonb where id=g.id;
   else raise exception 'Invalid social action';end if;
  end if;
  update private.mmo_players set social_at=clock_timestamp() where id=u;
  -- Notify current members and the directly impacted peer, never the invitation
  -- backlog. Accept/decline p_target is an invitation UUID, not a user UUID.
  for rr in select user_id id from private.mmo_members where group_id=g.id union select u union select case when action in ('accept','decline') then i.inviter else t end where case when action in ('accept','decline') then i.inviter else t end is not null loop
   perform realtime.send('{"type":"social"}'::jsonb,'communication','mmo:inbox:'||rr.id,true);
  end loop;
  return private.mmo_state();
 end if;
 raise exception 'Unknown operation';
end $$;
create function public.mmo_connect(p_client uuid,p_name text,p_world text default 'town',p_server text default 'local-1') returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('connect',jsonb_build_object('client',p_client,'name',p_name,'world',p_world,'server',p_server))$$;
create function public.mmo_tick(p_client uuid,p_seq bigint,p_x float8,p_z float8) returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('tick',jsonb_build_object('client',p_client,'seq',p_seq,'x',p_x,'z',p_z))$$;
create function public.mmo_leave(p_client uuid) returns boolean language sql security invoker set search_path='' as $$select private.mmo_api('leave',jsonb_build_object('client',p_client))::boolean$$;
create function public.mmo_send(p_channel text,p_body text,p_nonce uuid,p_target uuid default null,p_kind text default 'text') returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('send',jsonb_build_object('channel',p_channel,'body',p_body,'nonce',p_nonce,'target',p_target,'kind',p_kind))$$;
create function public.mmo_history(p_channel text,p_target uuid default null,p_before timestamptz default null,p_before_id bigint default null,p_limit int default 30) returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('history',jsonb_build_object('channel',p_channel,'target',p_target,'before',p_before,'before_id',p_before_id,'limit',p_limit))$$;
create function public.mmo_state() returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('state','{}')$$;
create function public.mmo_social(p_action text,p_kind text default 'party',p_target uuid default null,p_name text default null,p_group uuid default null,p_role text default null,p_permissions jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('social',jsonb_build_object('action',p_action,'kind',p_kind,'target',p_target,'name',p_name,'group',p_group,'role',p_role,'permissions',p_permissions))$$;
create function public.mmo_read(p_channel text,p_target uuid default null,p_through bigint default null) returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('read',jsonb_build_object('channel',p_channel,'target',p_target,'through',p_through))$$;
create function public.mmo_find_players(p_search text,p_limit int default 12) returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('find',jsonb_build_object('search',p_search,'limit',p_limit))$$;
create function public.mmo_announce(p_body text,p_world text default 'town',p_server text default 'local-1') returns jsonb language sql security invoker set search_path='' as $$select private.mmo_api('announce',jsonb_build_object('body',p_body,'world',p_world,'server',p_server))$$;
-- Private functions are not exposed through PostgREST; authenticated needs EXECUTE
-- only on checked entrypoints to support SECURITY INVOKER public wrappers.
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='private' and tablename like 'mmo_%' loop
 execute format('alter table private.%I enable row level security',r.tablename);
 execute format('revoke all on private.%I from public,anon,authenticated',r.tablename);
 end loop;
 for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname like 'mmo_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',r.sig);
 if r.sig::text like 'mmo_%' then execute format('grant execute on function %s to authenticated',r.sig);end if;
 end loop;
end $$;
grant usage on schema private to authenticated;
grant execute on function private.mmo_api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
