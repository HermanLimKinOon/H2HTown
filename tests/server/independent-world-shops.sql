\set ON_ERROR_STOP on
begin;
do $$
declare a uuid:='f0960000-0000-4000-8000-000000000001';p uuid:='f0960000-0000-4000-8000-000000000002';v jsonb;d jsonb;own_product jsonb;h jsonb;
begin
 insert into auth.users(id,email,is_anonymous,email_confirmed_at) values(a,'store-admin@example.test',false,now()),(p,'store-player@example.test',false,now());insert into private.game_admins values(a);
 select data into d from private.game_world_edits where world='town';
 select jsonb_set(d,'{objects}',jsonb_object_agg(key,case when key='portal' then value else 'null'::jsonb end)) into d from jsonb_each(d->'objects');
 d:=jsonb_set(d,'{buildings}','{"building-1":{"x":19,"z":18,"rotation":1,"style":"market","shopType":"website","name":"Bloom Store"}}');
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('read','town');
 begin perform public.mmo_world_editor('save','town',d,(v->>'version')::bigint);raise exception 'Player placed a shop';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 v:=public.mmo_world_editor('save','town',d,(v->>'version')::bigint);
 if v->'data'->'buildings'->'building-1'->>'style'<>'market' then raise exception 'H2H shop not saved';end if;

 if v->'data'->'buildings'->'building-1'->>'name'<>'Bloom Store' then raise exception 'Shop name lost';end if;
 v:=public.mmo_world_editor('shop_read','building-1');
 if jsonb_array_length(v->'products')<>0 or not(v->>'website')::boolean then raise exception 'New shop not empty website catalogue';end if;
 d:=jsonb_build_object('products',jsonb_build_array(jsonb_build_object('id','new-flower','kind','website','reference','','name','Rollback Bloom Flower','image','/game/items/carrot.svg','description','Flower','category','Flowers','active',true,'buyPrice',1500,'sellPrice',null,'originalPrice',1500)));
 v:=public.mmo_world_editor('shop_save','building-1',d,(v->>'version')::bigint);
 if jsonb_array_length(v->'products')<>1 or v->'products'->0->>'name'<>'Rollback Bloom Flower' then raise exception 'Shop save failed';end if;
 d:=jsonb_set(v,'{products,0,name}','"Rollback Bloom Rose"');
 v:=public.mmo_world_editor('shop_save','building-1',d,(v->>'version')::bigint);
 if jsonb_array_length(v->'products')<>1 or v->'products'->0->>'name'<>'Rollback Bloom Rose' then raise exception 'Shop edit failed';end if;

 own_product:=v->'products'->0;
 h:=public.mmo_world_editor('shop_read','h2h');
 if exists(select 1 from jsonb_array_elements(h->'products') b where b->>'reference'=own_product->>'reference') then raise exception 'H2H leaked another shops product';end if;
 begin
  perform public.mmo_world_editor('shop_save','h2h',jsonb_build_object('products',jsonb_build_array(own_product)),(h->>'version')::bigint);
  raise exception 'H2H edited another shops product';
 exception when insufficient_privilege then null;end;
 reset role;
 if not exists(select 1 from public.products where name='Rollback Bloom Rose' and member_price=1500) then raise exception 'Website catalogue not updated';end if;
 if not exists(select 1 from private.game_town_collisions() where x=19 and z=18 and kind='box') then raise exception 'Shop missing server collision';end if;
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('shop_read','building-1');
 if jsonb_array_length(v->'products')<>1 then raise exception 'Shop contains unrelated website products';end if;
 if jsonb_typeof(v->'products')<>'array' then raise exception 'Shared catalogue unavailable';end if;

 reset role;
 update private.game_world_edits set data=jsonb_set(data,'{buildings}','{}') where world='town';
 if exists(select 1 from private.game_shop_catalog where shop='building-1') then raise exception 'Deleted shop catalogue survived';end if;
 if not exists(select 1 from public.products where name='Rollback Bloom Rose') then raise exception 'Deleting shop removed website product';end if;
end$$;
rollback;
