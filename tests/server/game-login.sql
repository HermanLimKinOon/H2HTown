\set ON_ERROR_STOP on
begin;
create function pg_temp.login_denied(q text) returns boolean language plpgsql as $$begin execute q;return false;exception when insufficient_privilege then return true;end$$;
do $$
declare real_user uuid:='f0120000-0000-4000-8000-000000000001';legacy uuid:='f0120000-0000-4000-8000-000000000002';anonymous_user uuid:='f0120000-0000-4000-8000-000000000003';client uuid:='f0120000-0000-4000-8000-000000000004';r jsonb;u uuid;
begin
 insert into auth.users(id,email,is_anonymous) values(real_user,'login-fixture@example.test',false),(legacy,'town-f0120000-0000-4000-8000-000000000002@example.test',false),(anonymous_user,null,true);
 foreach u in array array[legacy,anonymous_user] loop
  perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
  if not pg_temp.login_denied(format('select public.mmo_connect(%L::uuid,''Guest'')',client)) then raise exception 'Guest connected without account login';end if;
  if not pg_temp.login_denied('select public.mmo_room_session()') then raise exception 'Guest received room proof';end if;
  reset role;
 end loop;
 perform set_config('request.jwt.claim.sub',real_user::text,true);set local role authenticated;
 r:=public.mmo_connect(client,'Registered player');
 if r->'profile'->>'id'<>real_user::text then raise exception 'Registered account cannot enter game';end if;
 r:=public.mmo_social_state();
 reset role;
end $$;
rollback;
