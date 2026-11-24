\set ON_ERROR_STOP on
begin;
insert into auth.users(id,aud,role,email)values('c0100000-0000-4000-8000-000000000001','authenticated','authenticated','colyseus-session-test@example.test');
insert into private.mmo_players(id,name,client,seen,moved,world_id)values('c0100000-0000-4000-8000-000000000001','Local tester',gen_random_uuid(),clock_timestamp(),clock_timestamp(),'town');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c0100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare s jsonb;begin
 s:=public.mmo_room_session();
 if s->>'world'<>'town' or s->>'userId'<>'c0100000-0000-4000-8000-000000000001' or s?'access_token' then raise exception 'Invalid room proof';end if;
 if not(s?'blockedUserIds') or s->'allowInitialPosition'<>'false' then raise exception 'Missing authorization fields';end if;
end$$;
reset role;
update private.mmo_players set seen=clock_timestamp()-interval '16 seconds' where id='c0100000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin
 begin perform public.mmo_room_session();raise exception 'Stale lease allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update private.mmo_players set seen=clock_timestamp(),world_id='farm:c0100000-0000-4000-8000-000000000002' where id='c0100000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin
 begin perform public.mmo_room_session();raise exception 'Uninvited farm allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into auth.users(id,aud,role,email)values('c0100000-0000-4000-8000-000000000002','authenticated','authenticated','colyseus-host-test@example.test');
insert into private.mmo_players(id,name,client,seen,moved,world_id)values('c0100000-0000-4000-8000-000000000002','Host',gen_random_uuid(),clock_timestamp(),clock_timestamp(),'farm:c0100000-0000-4000-8000-000000000002');
insert into private.sf_farms(owner,data)values('c0100000-0000-4000-8000-000000000002','{"farmLayout":{}}');
insert into private.sf_friends(a,b)values('c0100000-0000-4000-8000-000000000001','c0100000-0000-4000-8000-000000000002');
insert into private.sf_grants(owner,guest)values('c0100000-0000-4000-8000-000000000002','c0100000-0000-4000-8000-000000000001');
set local role authenticated;
do $$declare s jsonb;begin
 s:=public.mmo_room_session();
 if s->>'world'<>'farm:c0100000-0000-4000-8000-000000000002' or s->'allowInitialPosition'<>'false' then raise exception 'Invalid guest session';end if;
end$$;
reset role;
update private.sf_farms set data='{"farmLayout":{"pond":{"x":0,"z":5,"rotation":0},"trees":{},"buildings":{},"decorations":{}}}' where owner='c0100000-0000-4000-8000-000000000002';
set local role authenticated;
do $$declare s jsonb;t jsonb;r bigint;begin
 s:=public.mmo_room_session();r:=(s->>'roomRevision')::bigint;
 if r<>1 or sqrt(((s->>'x')::float8)^2+((s->>'z')::float8-5)^2)<4.65 then raise exception 'Obstructed position was not repaired';end if;
 t:=public.mmo_tick((s->>'leaseId')::uuid,(s->>'seq')::bigint+1,(s->>'x')::float8,(s->>'z')::float8);
 if t->'accepted'<>'true' then raise exception 'SQL rejected coordinated correction';end if;
 t:=public.mmo_room_session();
 if t->>'roomRevision'<>s->>'roomRevision' or t->>'x'<>s->>'x' or t->>'z'<>s->>'z' then raise exception 'Position did not converge';end if;
end$$;
reset role;
update private.mmo_players set budget=3,moved=clock_timestamp() where id='c0100000-0000-4000-8000-000000000001';
set local role authenticated;
do $$declare s jsonb;t jsonb;begin
 s:=public.mmo_room_session();
 -- Existing pond is unchanged. A normal small tick cannot enter it and mint a repair revision.
 t:=public.mmo_tick((s->>'leaseId')::uuid,(s->>'seq')::bigint+1,4.5,5);
 if t->'accepted'<>'false' then raise exception 'Existing pond movement allowed';end if;
 t:=public.mmo_room_session();
 if t->>'roomRevision'<>s->>'roomRevision' or t->>'x'<>s->>'x' or t->>'z'<>s->>'z' then raise exception 'Existing obstacle granted free relocation';end if;
end$$;
reset role;
update private.sf_grants set expires_at=clock_timestamp()-interval '1 second' where owner='c0100000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin
 begin perform public.mmo_room_session();raise exception 'Expired visit allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update private.sf_grants set expires_at=clock_timestamp()+interval '1 hour' where owner='c0100000-0000-4000-8000-000000000002';
insert into private.mmo_blocks(user_id,target)values('c0100000-0000-4000-8000-000000000002','c0100000-0000-4000-8000-000000000001');
set local role authenticated;
do $$begin
 begin perform public.mmo_room_session();raise exception 'Blocked visit allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.mmo_room_session();raise exception 'Anonymous join allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
