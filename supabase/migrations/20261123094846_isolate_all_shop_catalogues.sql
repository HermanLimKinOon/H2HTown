begin;
-- Preserve the original H2H catalogue, excluding products already assigned to other shops.
-- This is a one-time assignment; future website products are not automatically listed in any shop.
update private.game_shop_catalog h set products=(
 select coalesce(jsonb_agg(jsonb_build_object('reference',p.id::text) order by p.id),'[]')
 from public.products p where not exists(
  select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) b
  where c.shop<>'h2h' and b->>'reference'=p.id::text
 )
),version=version+1 where h.shop='h2h';
create or replace function private.game_shop_api(op text,s text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);c private.game_shop_catalog;r record;p jsonb;list jsonb;seen text[]:='{}';ids bigint[]:='{}';product_id bigint;ref text;product_name text;price bigint;sell bigint;original bigint;website boolean:=s='h2h';custom_website boolean:=false;shop_title text;bindings jsonb;

begin
 select (data->'buildings'->s->>'style' in('shop','h2h') or data->'buildings'->s->>'shopType'='website'),data->'buildings'->s->>'name' into custom_website,shop_title from private.game_world_edits where world='town';
 custom_website:=coalesce(custom_website,false);website:=website or custom_website;
 if s not in('h2h','meadow','cats') and not(s~'^building-[1-9][0-9]{0,7}$' and exists(select 1 from private.game_world_edits where world='town' and data->'buildings'->s->>'style' in('market','shop','h2h'))) then raise exception 'Shop unavailable';end if;
 if op not in('shop_read','shop_save') then raise exception 'Invalid shop action';end if;
 if op='shop_save' and not admin then raise exception 'Only admins can manage shop products' using errcode='42501';end if;
 if op='shop_save' then perform pg_advisory_xact_lock(hashtextextended('game-shop:'||s,0));end if;
 select * into c from private.game_shop_catalog where shop=s;
 if c.shop is null then c.shop:=s;c.version:=0;c.products:='[]';end if;
 if op='shop_save' then
  select * into c from private.game_shop_catalog where shop=s for update;
  if c.shop is null then c.shop:=s;c.version:=0;c.products:='[]';end if;
  bindings:=coalesce(c.products,'[]');
  if expected is null or expected<>c.version then raise exception 'Products changed. Reload before saving.' using errcode='40001';end if;
  list:=d->'products';
  if jsonb_typeof(list) is distinct from 'array' or jsonb_array_length(list)>200 or octet_length(list::text)>524288 then raise exception 'Invalid product catalogue';end if;
  for r in select value from jsonb_array_elements(list) loop
   p:=r.value;ref:=p->>'reference';product_name:=btrim(p->>'name');
   if jsonb_typeof(p)<>'object' or coalesce(p->>'id','')!~'^[a-zA-Z0-9_-]{1,80}$' or(p->>'id')=any(seen) or product_name is null or length(product_name) not between 1 and 120 or product_name~'[[:cntrl:]]' or length(coalesce(p->>'description',''))>12000 or length(coalesce(p->>'image',''))>2048 or not private.game_shop_image(coalesce(p->>'image','')) or jsonb_typeof(p->'active') is distinct from 'boolean' then raise exception 'Invalid product details';end if;
   seen:=array_append(seen,p->>'id');
   if not(p ?& array['buyPrice','sellPrice']) or not(p->'buyPrice'='null'::jsonb or(jsonb_typeof(p->'buyPrice')='number' and(p->>'buyPrice')~'^[0-9]+$')) or not(p->'sellPrice'='null'::jsonb or(jsonb_typeof(p->'sellPrice')='number' and(p->>'sellPrice')~'^[0-9]+$')) then raise exception 'Invalid product prices';end if;
   price:=(p->>'buyPrice')::bigint;sell:=(p->>'sellPrice')::bigint;
   if price>(case when website then 1000000000 else 1000000 end) or sell>1000000 or(price is null and sell is null) then raise exception 'Product price limit';end if;
   if website then
    if p->>'kind'<>'website' or sell is not null or price is null or length(coalesce(p->>'category','General'))>80 then raise exception 'Invalid website product';end if;
    original:=coalesce((p->>'originalPrice')::bigint,price);if original<price or original>1000000000 then raise exception 'Original price must be at least the member price';end if;
    if ref='' then
     insert into public.products(name,image,category,description,member_price,original_price,active) values(product_name,p->>'image',coalesce(p->>'category','General'),coalesce(p->>'description',''),price,original,(p->>'active')::boolean) returning id into product_id;
    elsif ref~'^[1-9][0-9]{0,15}$' then
     product_id:=ref::bigint;
     if website and not exists(select 1 from jsonb_array_elements(bindings) b where b->>'reference'=ref) then raise exception 'Product does not belong to this shop' using errcode='42501';end if;
     if product_id=any(ids) or not exists(select 1 from public.products where id=product_id) then raise exception 'Website product unavailable';end if;
     update public.products set name=product_name,image=p->>'image',category=coalesce(p->>'category','General'),description=coalesce(p->>'description',''),member_price=price,original_price=original,active=(p->>'active')::boolean where id=product_id;
    else raise exception 'Invalid website product reference';end if;
    ids:=array_append(ids,product_id);
    if website and not exists(select 1 from jsonb_array_elements(bindings) b where b->>'reference'=product_id::text) then bindings:=bindings||jsonb_build_array(jsonb_build_object('reference',product_id::text));end if;
   else
    if p->>'kind'='item' then
     if ref not in('carrot','wood','petFood','chicken','chickenFeed','egg') then raise exception 'Unsupported inventory item';end if;
    elsif p->>'kind'='cat' then
     if ref not in('ginger','grey','tuxedo') or price is null or sell is not null then raise exception 'Unsupported cat';end if;
    else raise exception 'Unsupported game product';end if;
   end if;
  end loop;
  if website then
   insert into private.game_shop_catalog(shop,products,version) values(s,bindings,0) on conflict(shop) do update set products=excluded.products;
  end if;
  if not website then
   insert into private.game_shop_catalog(shop,products,version) values(s,list,c.version+1) on conflict(shop) do update set products=excluded.products,version=excluded.version;
  end if;
  update private.game_shop_catalog set version=version+1 where shop=s returning * into c;
  insert into private.game_edit_audit(actor,world,version) values(u,'shop:'||s,c.version);
 end if;
 if website then
  select coalesce(jsonb_agg(jsonb_build_object('id','website-'||p.id,'kind','website','reference',p.id::text,'name',p.name,'image',coalesce(p.image,''),'description',coalesce(p.description,''),'category',coalesce(p.category,'General'),'active',p.active,'buyPrice',coalesce(p.member_price,0),'sellPrice',null,'originalPrice',greatest(coalesce(p.original_price,p.member_price,0),coalesce(p.member_price,0)),'available',p.active and coalesce(p.member_price,0)>0) order by p.id),'[]') into list from public.products p where (admin or p.active) and (exists(select 1 from jsonb_array_elements(coalesce(c.products,'[]')) b where b->>'reference'=p.id::text));
 else
  select coalesce(jsonb_agg(value||jsonb_build_object('available',true)),'[]') into list from jsonb_array_elements(c.products) where admin or(value->>'active')::boolean;
 end if;
 return jsonb_build_object('shop',s,'version',c.version,'products',list,'website',website,'title',coalesce(shop_title,case s when 'h2h' then 'H2H Shop' when 'cats' then 'Cat Shop' when 'meadow' then 'Meadow Shop' else 'Shop' end));
end$$;
revoke all on function private.game_shop_api(text,text,jsonb,bigint) from public,anon,authenticated;

commit;
