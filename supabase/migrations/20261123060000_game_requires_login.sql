-- Registered accounts are required for all checked 3D game operations.
-- Preserve accounts and farms; invalidate only active legacy/anonymous player leases.
begin;
create or replace function private.mmo_require_login() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and not coalesce(is_anonymous,false) and coalesce(email,'')!~*'^town-[0-9a-f-]{36}@example\.test$') then
  raise exception 'Sign in with a player account to access the game' using errcode='42501';
 end if;
 return u;
end $$;
revoke all on function private.mmo_require_login() from public,anon,authenticated;
do $$
declare signature text;src text;
begin
 foreach signature in array array['private.mmo_api(text,jsonb)','private.mmo_base_api(text,jsonb)','private.sf_api(text,jsonb)','private.mmo_room_session()'] loop
  select pg_get_functiondef(signature::regprocedure) into src;
  if position('private.mmo_require_login()' in src)=0 then
   if position('u uuid:=auth.uid()' in src)=0 then raise exception 'Unexpected game authorization entry point: %',signature;end if;
   execute replace(src,'u uuid:=auth.uid()','u uuid:=private.mmo_require_login()');
  end if;
 end loop;
end $$;
update private.mmo_players p set client=null
where exists(select 1 from auth.users u where u.id=p.id and(coalesce(u.is_anonymous,false) or coalesce(u.email,'')~*'^town-[0-9a-f-]{36}@example\.test$'));
commit;
