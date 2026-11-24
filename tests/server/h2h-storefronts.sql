\set ON_ERROR_STOP on
begin;
do $$
declare a uuid:='f0960000-0000-4000-8000-000000000001';p uuid:='f0960000-0000-4000-8000-000000000002';v jsonb;d jsonb;
begin
 insert into auth.users(id,email,is_anonymous,email_confirmed_at) values(a,'store-admin@example.test',false,now()),(p,'store-player@example.test',false,now());insert into private.game_admins values(a);
 select data into d from private.game_world_edits where world='town';
 select jsonb_set(d,'{objects}',jsonb_object_agg(key,case when key='portal' then value else 'null'::jsonb end)) into d from jsonb_each(d->'objects');
 d:=jsonb_set(d,'{buildings}','{"building-1":{"x":19,"z":18,"rotation":1,"style":"h2h"}}');
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('read','town');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Player placed a shop';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 v:=public.mmo_world_editor('save','town',d,(v->>'version')::bigint);
 if v->'data'->'buildings'->'building-1'->>'style'<>'h2h' then raise exception 'H2H shop not saved';end if;
 reset role;
 if not exists(select 1 from private.game_town_collisions() where x=19 and z=18 and kind='box') then raise exception 'Shop missing server collision';end if;
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('shop_read','h2h');
 if jsonb_typeof(v->'products')<>'array' then raise exception 'Shared catalogue unavailable';end if;
 reset role;
end$$;
rollback;
