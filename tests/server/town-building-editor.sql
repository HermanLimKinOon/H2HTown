\set ON_ERROR_STOP on
begin;
do $$
declare u uuid:='f0980000-0000-4000-8000-000000000001';v jsonb;d jsonb;before jsonb;
begin
 insert into auth.users(id,email,is_anonymous,email_confirmed_at) values(u,'town-build-fixture@example.test',false,now());insert into private.game_admins values(u);
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 v:=public.mmo_world_editor('read');before:=v->'data';
 d:=jsonb_set(v->'data','{buildings}','{"building-1":{"x":17,"z":-5,"rotation":1,"style":"market"}}');
 v:=public.mmo_world_editor('save','town',d,(v->>'version')::bigint);
 if v->'data'->'buildings'->'building-1'->>'style' is distinct from 'market' then raise exception 'New building was not retained';end if;
 reset role;
 if private.mmo_town_segment_clear(17,-5,17,-5) then raise exception 'New global building has no authoritative collision';end if;
 set local role authenticated;
 d:=jsonb_set(v->'data','{objects,h2h}','null');v:=public.mmo_world_editor('save','town',d,(v->>'version')::bigint);
 if v->'data'->'objects'->'h2h'<>'null'::jsonb then raise exception 'Shop deletion not retained';end if;
 d:=(v->'data')-'buildings';
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Old payload could erase shared buildings';exception when raise_exception then if sqlerrm='Old payload could erase shared buildings' then raise;end if;end;
 d:=jsonb_set(v->'data','{objects,portal}','null');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Portal deleted';exception when raise_exception then if sqlerrm='Portal deleted' then raise;end if;end;
 d:=jsonb_set(v->'data','{buildings,building-1,style}','"not-a-style"');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Unknown building style accepted';exception when raise_exception then if sqlerrm='Unknown building style accepted' then raise;end if;end;
 d:=jsonb_set(v->'data','{buildings,building-1,x}','24');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Out of bounds accepted';exception when raise_exception then if sqlerrm='Out of bounds accepted' then raise;end if;end;
 d:=jsonb_set(v->'data','{buildings,building-1}','{"x":-7,"z":-4,"rotation":0,"style":"cottage"}');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Overlapping buildings accepted';exception when raise_exception then if sqlerrm='Overlapping buildings accepted' then raise;end if;end;
 d:=jsonb_set(v->'data','{buildings}','{}');v:=public.mmo_world_editor('save','town',d,(v->>'version')::bigint);
 reset role;
 if not private.mmo_town_segment_clear(17,-5,17,-5) then raise exception 'Deleted building left stale collision';end if;
 delete from private.game_admins where user_id=u;set local role authenticated;
 begin perform public.mmo_world_editor('save','town',before,(v->>'version')::bigint);raise exception 'Player placed global building';exception when insufficient_privilege then null;end;
 reset role;
end$$;
rollback;
