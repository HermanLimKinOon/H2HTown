begin;
create table private.game_merchant_applications(
 applicant uuid primary key references auth.users(id) on delete cascade,
 status text not null check(status in('pending','more_info','approved','rejected','suspended')),
 details jsonb not null,
 note text not null default '',
 shop_id text unique,
 paused_products bigint[] not null default '{}',
 version bigint not null default 1,
 submitted_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.game_merchant_audit(
 id bigint generated always as identity primary key,
 actor uuid not null,applicant uuid not null,status text not null,note text not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table private.game_merchant_applications enable row level security;
alter table private.game_merchant_audit enable row level security;
revoke all on private.game_merchant_applications,private.game_merchant_audit from public,anon,authenticated;
create function private.game_merchant_owner(u uuid,s text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.game_merchant_applications a join private.game_world_edits e on e.world='town'
 where a.applicant=u and a.status='approved' and a.shop_id=s and e.data->'buildings'->s->>'style'='market' and e.data->'buildings'->s->>'shopType'='website')
$$;
revoke all on function private.game_merchant_owner(uuid,text) from public,anon,authenticated;
create function private.game_merchant_api(op text,target text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);a private.game_merchant_applications;who uuid;next_status text;feedback text;lot text;t private.game_world_edits;b jsonb;details jsonb;field text;plots jsonb;apps jsonb;active_ids bigint[];
begin
 if op not in('merchant_read','merchant_submit','merchant_review') then raise exception 'Invalid seller action';end if;
 if op='merchant_review' and not admin then raise exception 'Only admins may review seller applications' using errcode='42501';end if;
 if op in('merchant_submit','merchant_review') then
  -- Serialize approval and submit decisions; Town locking also coordinates with world edits.
  perform pg_advisory_xact_lock(hashtextextended('game-edit:town',0));
  select * into t from private.game_world_edits where world='town' for update;
  who:=case when op='merchant_submit' then u else target::uuid end;
  select * into a from private.game_merchant_applications where applicant=who for update;
  if coalesce(expected,-1)<>coalesce(a.version,0) then raise exception 'Application changed. Reload before saving.' using errcode='40001';end if;
  if op='merchant_submit' then
   if a.status in('approved','suspended','pending') then raise exception 'This application cannot be resubmitted in its current status';end if;
   if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>12000 then raise exception 'Invalid application';end if;
   details:='{}';
   foreach field in array array['fullName','email','phone','address','shopName','description'] loop
    if jsonb_typeof(d->field) is distinct from 'string' or length(btrim(d->>field)) not between 1 and (case field when 'description' then 1000 when 'address' then 500 when 'shopName' then 60 when 'phone' then 40 when 'email' then 254 else 120 end) or replace(replace(replace(d->>field,chr(10),''),chr(13),''),chr(9),'')~'[[:cntrl:]]' then raise exception 'Please complete valid contact information and shop details';end if;
    if field not in('description','address') and (d->>field)~'[[:cntrl:]]' then raise exception 'Use one line for names and contact fields';end if;
    details:=details||jsonb_build_object(field,btrim(d->>field));
   end loop;
   if details->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or details->>'phone' !~ '^[+0-9 ()-]{5,40}$' then raise exception 'Enter a valid contact email and phone number';end if;
   insert into private.game_merchant_applications(applicant,status,details) values(u,'pending',details)
   on conflict(applicant) do update set details=excluded.details,status='pending',note='',version=game_merchant_applications.version+1,submitted_at=clock_timestamp(),updated_at=clock_timestamp() returning * into a;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(u,u,'pending','Application submitted');
  else
   if a.applicant is null then raise exception 'Application unavailable';end if;
   next_status:=d->>'status';feedback:=btrim(coalesce(d->>'note',''));
   if next_status not in('approved','rejected','more_info','suspended') or next_status is null or length(feedback)>1000 or replace(replace(replace(feedback,chr(10),''),chr(13),''),chr(9),'')~'[[:cntrl:]]' then raise exception 'Invalid review';end if;
   if next_status<>'approved' and feedback='' then raise exception 'Please explain this decision to the applicant';end if;
   if next_status='suspended' and a.status<>'approved' then raise exception 'Only approved merchants can be suspended';end if;
   if next_status in('rejected','more_info') and a.status not in('pending','more_info') then raise exception 'Only waiting applications may be rejected or asked for information';end if;
   if next_status='approved' then
    if a.status not in('pending','suspended') then raise exception 'Only pending or suspended merchants may be approved';end if;
    if a.shop_id is not null then
     lot:=a.shop_id;b:=t.data->'buildings'->lot;
     if b->>'style' is distinct from 'market' or b->>'shopType' is distinct from 'website' then raise exception 'Assigned shop unavailable; contact an admin';end if;
    else
     lot:=d->>'plot';b:=t.data->'buildings'->lot;
     if lot is null or b->>'style' is distinct from 'plot' or exists(select 1 from private.game_merchant_applications where shop_id=lot) then raise exception 'Choose an available admin-created shop plot';end if;
     b:=b||jsonb_build_object('style','market','shopType','website','name',a.details->>'shopName');
     t.data:=private.game_validate_town(jsonb_set(t.data,array['buildings',lot],b));
     update private.game_world_edits set data=t.data,version=version+1 where world='town' returning * into t;
     -- Empty listing for the newly assigned shop; it never inherits another catalogue.
     insert into private.game_shop_catalog(shop,products) values(lot,'[]') on conflict(shop) do update set products='[]',version=game_shop_catalog.version+1;
     insert into private.game_edit_audit(actor,world,version) values(u,'town',t.version);
    end if;
    if a.status='suspended' then update public.products set active=true where id=any(a.paused_products);end if;
    update private.game_merchant_applications set status='approved',shop_id=lot,note=feedback,paused_products='{}',version=version+1,updated_at=clock_timestamp() where applicant=who returning * into a;
   else
    active_ids:='{}';
    if next_status='suspended' then
     select coalesce(array_agg(p.id),'{}') into active_ids from public.products p where p.active and exists(select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) e where c.shop=a.shop_id and e->>'reference'=p.id::text);
     update public.products set active=false where id=any(active_ids);
    end if;
    update private.game_merchant_applications set status=next_status,note=feedback,paused_products=active_ids,version=version+1,updated_at=clock_timestamp() where applicant=who returning * into a;
   end if;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(u,who,a.status,feedback);
  end if;
 end if;
 -- Personal information is returned only to the applicant or a protected game admin.
 if op='merchant_review' then who:=target::uuid;else who:=u;end if;
 select * into a from private.game_merchant_applications where applicant=who;
 if admin then
  select coalesce(jsonb_agg(to_jsonb(x)-'paused_products' order by x.updated_at desc),'[]') into apps from private.game_merchant_applications x;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.key,'name',coalesce(b.value->>'name','Empty shop plot'),'x',b.value->'x','z',b.value->'z') order by b.key),'[]') into plots from private.game_world_edits e cross join lateral jsonb_each(e.data->'buildings') b where e.world='town' and b.value->>'style'='plot' and not exists(select 1 from private.game_merchant_applications m where m.shop_id=b.key);
  return jsonb_build_object('application',case when a.applicant is null then null else to_jsonb(a)-'paused_products' end,'applications',apps,'plots',plots);
 end if;
 return jsonb_build_object('application',case when a.applicant is null then null else to_jsonb(a)-'paused_products' end);
end$$;
revoke all on function private.game_merchant_api(text,text,jsonb,bigint) from public,anon,authenticated;
create or replace function private.game_validate_town(d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare r record;q record;baseline jsonb;b jsonb:=coalesce(d->'buildings','{}');w float8;dep float8;ow float8;od float8;
begin
 select data->'objects' into baseline from private.game_world_edits where world='town';
 if jsonb_typeof(d) is distinct from 'object' or not(d?'buildings') or jsonb_typeof(d->'objects') is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' or octet_length(d::text)>49152 or(select count(*) from jsonb_object_keys(d->'objects'))<>14 then raise exception 'Invalid town layout';end if;
 if(select count(*) from jsonb_object_keys(b))>64 then raise exception 'Town building limit';end if;
 for r in select * from jsonb_each(d->'objects') loop
  if not(baseline?r.key) then raise exception 'Unknown town object';end if;
  if r.value='null'::jsonb then
   if r.key='portal' then raise exception 'Return-home portal cannot be deleted';end if;
  elsif not coalesce(private.sf_transform(r.value),false) or abs((r.value->>'x')::numeric)>20 or abs((r.value->>'z')::numeric)>20 then raise exception 'Invalid town transform';end if;
 end loop;
 for r in select * from jsonb_each(b) loop
  if r.key !~ '^building-[1-9][0-9]{0,7}$' or not coalesce(private.sf_transform(r.value),false) or abs((r.value->>'x')::numeric)>20 or abs((r.value->>'z')::numeric)>20 or coalesce(r.value->>'style','') not in('cottage','market','hall','h2h','shop','plot') then raise exception 'Invalid Town building';end if;
  if r.value?'shopType' and (r.value->>'style'<>'market' or r.value->>'shopType'<>'website') then raise exception 'Invalid shop type';end if;
  if r.value?'name' and (jsonb_typeof(r.value->'name') is distinct from 'string' or length(btrim(r.value->>'name')) not between 1 and 60 or r.value->>'name'~'[[:cntrl:]]') then raise exception 'Invalid shop name';end if;
 end loop;
 d:=jsonb_build_object('objects',d->'objects','buildings',b);
 for r in select * from private.game_town_shapes(d) loop
  w:=case when r.rotation%2=0 then r.width else r.depth end;dep:=case when r.rotation%2=0 then r.depth else r.width end;
  if abs(r.x)+w/2>23 or abs(r.z)+dep/2>23 then raise exception 'Keep objects inside Town';end if;
  if abs(r.x)<w/2+1.5 and abs(r.z-8)<dep/2+1.5 then raise exception 'Keep Town arrival clear';end if;
  for q in select * from private.game_town_shapes(d) where id>r.id loop
   ow:=case when q.rotation%2=0 then q.width else q.depth end;od:=case when q.rotation%2=0 then q.depth else q.width end;
   if abs(r.x-q.x)<(w+ow)/2+.35 and abs(r.z-q.z)<(dep+od)/2+.35 then raise exception 'Town objects overlap. Choose clear land.';end if;
  end loop;
 end loop;
 return d;
end$$;
revoke all on function private.game_validate_town(jsonb) from public,anon,authenticated;
create or replace function private.game_town_collisions() returns table(kind text,x float8,z float8,r float8,w float8,d float8) language sql stable set search_path='' as $$
 select case when s.kind in('shop','building') then 'box' else 'circle' end,s.x,s.z,
 case when s.kind='fountain' then 2.35 else 1.25 end,
 case when s.rotation%2=0 then 2.95 else 2.45 end,case when s.rotation%2=0 then 2.45 else 2.95 end
 from private.game_world_edits e cross join lateral private.game_town_shapes(e.data) s where e.world='town' and s.kind in('shop','building','fountain','tree') and coalesce(e.data->'buildings'->s.id->>'style','')<>'plot'
$$;
revoke all on function private.game_town_collisions() from public,anon,authenticated;
create or replace function private.game_shop_api(op text,s text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);c private.game_shop_catalog;r record;p jsonb;list jsonb;seen text[]:='{}';ids bigint[]:='{}';product_id bigint;ref text;product_name text;price bigint;sell bigint;original bigint;website boolean:=s='h2h';custom_website boolean:=false;shop_title text;bindings jsonb;

begin
 if op='shop_save' then perform pg_advisory_xact_lock(hashtextextended('game-edit:town',0));end if;
 admin:=private.game_is_admin(u) or private.game_merchant_owner(u,s);
 if exists(select 1 from private.game_merchant_applications where shop_id=s and status<>'approved') and not private.game_is_admin(u) then
  if op='shop_save' then raise exception 'Merchant account is not approved' using errcode='42501';end if;
  raise exception 'This merchant shop is temporarily closed';
 end if;
 select (data->'buildings'->s->>'style' in('shop','h2h') or data->'buildings'->s->>'shopType'='website'),data->'buildings'->s->>'name' into custom_website,shop_title from private.game_world_edits where world='town';
 custom_website:=coalesce(custom_website,false);website:=website or custom_website;
 if s not in('h2h','meadow','cats') and not(s~'^building-[1-9][0-9]{0,7}$' and exists(select 1 from private.game_world_edits where world='town' and data->'buildings'->s->>'style' in('market','shop','h2h'))) then raise exception 'Shop unavailable';end if;
 if op not in('shop_read','shop_save') then raise exception 'Invalid shop action';end if;
 if op='shop_save' and not admin then raise exception 'Only admins or the approved shop owner can manage these products' using errcode='42501';end if;
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
 return jsonb_build_object('shop',s,'version',c.version,'products',list,'website',website,'canManage',admin,'title',coalesce(shop_title,case s when 'h2h' then 'H2H Shop' when 'cats' then 'Cat Shop' when 'meadow' then 'Meadow Shop' else 'Shop' end));
end$$;
revoke all on function private.game_shop_api(text,text,jsonb,bigint) from public,anon,authenticated;


-- Extend the existing checked RPC; the friends gateway already permits this route.
create or replace function private.game_world_editor(op text,w text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if op in('merchant_read','merchant_submit','merchant_review') then return private.game_merchant_api(op,w,d,expected);end if;
 if op in('shop_read','shop_save') then return private.game_shop_api(op,w,d,expected);end if;
 return private.game_world_editor_before_shops(op,w,d,expected);
end$$;
revoke all on function private.game_world_editor(text,text,jsonb,bigint) from public,anon;
grant execute on function private.game_world_editor(text,text,jsonb,bigint) to authenticated;
-- Revocation follows admin removal of a shop. Unrelated town saves cannot assign owners.
create function private.game_removed_merchant_shops() returns trigger language plpgsql security definer set search_path='' as $$
declare a record;begin
 if new.world='town' then
  for a in select * from private.game_merchant_applications where shop_id is not null and (new.data->'buildings'->shop_id->>'style' is distinct from 'market' or new.data->'buildings'->shop_id->>'shopType' is distinct from 'website') for update loop
   update public.products p set active=false where exists(select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) e where c.shop=a.shop_id and e->>'reference'=p.id::text);
   update private.game_merchant_applications set status='suspended',shop_id=null,paused_products='{}',note='Your assigned shop was removed by an administrator. Contact an admin for a new plot.',version=version+1,updated_at=clock_timestamp() where applicant=a.applicant;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(coalesce(auth.uid(),a.applicant),a.applicant,'suspended','Assigned shop removed');
  end loop;
 end if;return new;
end$$;
revoke all on function private.game_removed_merchant_shops() from public,anon,authenticated;
-- Run before the generic removed-catalogue cleanup so product references remain available.
create trigger game_merchant_shop_removed after update on private.game_world_edits for each row execute function private.game_removed_merchant_shops();
commit;
