begin;
-- Called only by the checked merchant workflow; never exposed as a player RPC.
create function private.game_empty_shop_plot(lot text,actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare t private.game_world_edits;b jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('game-edit:town',0));
 select * into t from private.game_world_edits where world='town' for update;
 if exists(select 1 from private.game_merchant_applications where shop_id=lot) then raise exception 'Release shop ownership before returning its plot';end if;
 -- Archive the shop's products, keeping website/order records intact.
 update public.products p set active=false where exists(select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) e where c.shop=lot and e->>'reference'=p.id::text);
 delete from private.game_shop_catalog where shop=lot;
 b:=t.data->'buildings'->lot;
 if b->>'style'='market' and b->>'shopType'='website' then
  b:=(b-'shopType')||jsonb_build_object('style','plot','name','Empty shop plot');
  t.data:=private.game_validate_town(jsonb_set(t.data,array['buildings',lot],b));
  update private.game_world_edits set data=t.data,version=version+1 where world='town' returning * into t;
  insert into private.game_edit_audit(actor,world,version) values(actor,'town',t.version);
 end if;
end$$;
revoke all on function private.game_empty_shop_plot(text,uuid) from public,anon,authenticated;
create or replace function private.game_merchant_api(op text,target text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);a private.game_merchant_applications;who uuid;app_id uuid;notices jsonb;unread bigint;next_status text;feedback text;lot text;t private.game_world_edits;b jsonb;validated_details jsonb;field text;plots jsonb;apps jsonb;active_ids bigint[];
begin
 if op not in('merchant_read','merchant_submit','merchant_review','merchant_ack','merchant_notices') then raise exception 'Invalid seller action';end if;
 if op='merchant_review' and not admin then raise exception 'Only admins may review seller applications' using errcode='42501';end if;
 if op='merchant_ack' then
  update private.game_merchant_notifications set read_at=clock_timestamp() where id=target::uuid and recipient=u and read_at is null and (audience='player' or admin);
 end if;
 if op in('merchant_submit','merchant_review') then
  -- Serialize approval and submit decisions; Town locking also coordinates with world edits.
  perform pg_advisory_xact_lock(hashtextextended('game-edit:town',0));
  select * into t from private.game_world_edits where world='town' for update;
  if op='merchant_review' or (op='merchant_submit' and target<>'town') then
   app_id:=target::uuid;
   select * into a from private.game_merchant_applications where id=app_id for update;
   if a.id is null or (op='merchant_submit' and a.applicant<>u) then raise exception 'Application unavailable' using errcode='42501';end if;
  elsif coalesce(expected,0)>0 then
   -- Compatibility for the original one-application client: never guess between multiple applications.
   if (select count(*) from private.game_merchant_applications where applicant=u)<>1 then raise exception 'Choose the application to update';end if;
   select * into a from private.game_merchant_applications where applicant=u for update;
  end if;
  who:=coalesce(a.applicant,u);
  if coalesce(expected,-1)<>coalesce(a.version,0) then raise exception 'Application changed. Reload before saving.' using errcode='40001';end if;
  if op='merchant_submit' then
   if a.status in('approved','suspended','pending') then raise exception 'This application cannot be resubmitted in its current status';end if;
   if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>12000 then raise exception 'Invalid application';end if;
   validated_details:='{}';
   foreach field in array array['fullName','email','phone','address','shopName','description'] loop
    if jsonb_typeof(d->field) is distinct from 'string' or length(btrim(d->>field)) not between 1 and (case field when 'description' then 1000 when 'address' then 500 when 'shopName' then 60 when 'phone' then 40 when 'email' then 254 else 120 end) or replace(replace(replace(d->>field,chr(10),''),chr(13),''),chr(9),'')~'[[:cntrl:]]' then raise exception 'Please complete valid contact information and shop details';end if;
    if field not in('description','address') and (d->>field)~'[[:cntrl:]]' then raise exception 'Use one line for names and contact fields';end if;
    validated_details:=validated_details||jsonb_build_object(field,btrim(d->>field));
   end loop;
   lot:=d->>'plot';
   if jsonb_typeof(d->'plot') is distinct from 'string' or lot !~ '^building-[1-9][0-9]{0,7}$' or not coalesce(((t.data->'buildings'->lot->>'style'='plot' and not exists(select 1 from private.game_merchant_applications where shop_id=lot)) or (a.shop_id=lot and a.status in('rejected','more_info'))),false) then raise exception 'Choose an available empty shop plot';end if;
   validated_details:=validated_details||jsonb_build_object('plot',lot);
   if validated_details->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or validated_details->>'phone' !~ '^[+0-9 ()-]{5,40}$' then raise exception 'Enter a valid contact email and phone number';end if;
   if a.id is null then
    if exists(select 1 from private.game_merchant_applications where applicant=u and status='pending' and details->>'plot'=lot) then raise exception 'You already have a pending application for this plot';end if;
    insert into private.game_merchant_applications(applicant,status,details) values(u,'pending',validated_details) returning * into a;
   else
    if a.shop_id is not null and lot<>a.shop_id then raise exception 'Reopening must use the existing shop plot. Submit a new application for a different plot.';end if;
    update private.game_merchant_applications m set details=validated_details,status='pending',note='',version=m.version+1,submitted_at=clock_timestamp(),updated_at=clock_timestamp() where id=a.id returning * into a;
   end if;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(u,u,'pending','Application submitted');
  else
   if a.applicant is null then raise exception 'Application unavailable';end if;
   next_status:=d->>'status';feedback:=btrim(coalesce(d->>'note',''));
   if next_status not in('approved','rejected','more_info','suspended','closed') or next_status is null or length(feedback)>1000 or replace(replace(replace(feedback,chr(10),''),chr(13),''),chr(9),'')~'[[:cntrl:]]' then raise exception 'Invalid review';end if;
   if next_status<>'approved' and feedback='' then raise exception 'Please explain this decision to the applicant';end if;
   if next_status='closed' and a.status not in('approved','suspended') then raise exception 'Only open or suspended shops can be closed';end if;
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
    if cardinality(a.paused_products)>0 then update public.products set active=true where id=any(a.paused_products);end if;
    update private.game_merchant_applications set status='approved',shop_id=lot,note=feedback,paused_products='{}',version=version+1,updated_at=clock_timestamp() where id=a.id returning * into a;
   else
    active_ids:=a.paused_products;
    if next_status in('suspended','closed') and a.status='approved' then
     select coalesce(array_agg(p.id),'{}') into active_ids from public.products p where p.active and exists(select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) e where c.shop=a.shop_id and e->>'reference'=p.id::text);
     update public.products set active=false where id=any(active_ids);
    end if;
    if next_status='closed' then
     -- Clear the claim first: the Town removal trigger must not overwrite the admin's reason.
     lot:=a.shop_id;
     update private.game_merchant_applications set status='closed',shop_id=null,note=feedback,paused_products='{}',version=version+1,updated_at=clock_timestamp() where id=a.id returning * into a;
     if lot is not null then perform private.game_empty_shop_plot(lot,u);end if;
    else
     update private.game_merchant_applications set status=next_status,note=feedback,paused_products=active_ids,version=version+1,updated_at=clock_timestamp() where id=a.id returning * into a;
    end if;
   end if;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(u,who,a.status,feedback);
  end if;
 end if;
 -- Personal information is returned only to the applicant or a protected game admin.
 if op not in('merchant_submit','merchant_review') then
  select * into a from private.game_merchant_applications where applicant=u order by updated_at desc,id limit 1;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.key,'name',coalesce(b.value->>'name','Empty shop plot'),'x',b.value->'x','z',b.value->'z') order by b.key),'[]') into plots from private.game_world_edits e cross join lateral jsonb_each(e.data->'buildings') b where e.world='town' and b.value->>'style'='plot' and not exists(select 1 from private.game_merchant_applications m where m.shop_id=b.key);
 select coalesce(jsonb_agg(to_jsonb(n) order by (n.read_at is null) desc,n.created_at desc,n.id),'[]') into notices from (select id,application_id,shop_name,status,body,created_at,read_at,audience from private.game_merchant_notifications where recipient=u and (audience='player' or admin) order by (read_at is null) desc,created_at desc,id limit 50) n;
 select count(*) into unread from private.game_merchant_notifications where recipient=u and read_at is null and (audience='player' or admin);
 if op='merchant_notices' then return jsonb_build_object('notifications',notices,'unread',unread);end if;
 select coalesce(jsonb_agg(to_jsonb(x)-'paused_products' order by x.updated_at desc,x.id),'[]') into apps from private.game_merchant_applications x where admin or x.applicant=u;
 return jsonb_build_object('application',case when a.id is null then null else to_jsonb(a)-'paused_products' end,
  'ownApplications',(select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(apps) e where e->>'applicant'=u::text),
  'plots',plots,'notifications',notices,'unread',unread)||case when admin then jsonb_build_object('applications',apps) else '{}'::jsonb end;
end$$;
revoke all on function private.game_merchant_api(text,text,jsonb,bigint) from public,anon,authenticated;

-- Convert shops already closed under the previous behavior to reusable plots too.
do $$declare r record;begin
 perform pg_advisory_xact_lock(hashtextextended('game-edit:town',0));
 perform 1 from private.game_world_edits where world='town' for update;
 for r in select * from private.game_merchant_applications where status='closed' and shop_id is not null for update loop
  update private.game_merchant_applications set shop_id=null,paused_products='{}',version=version+1,updated_at=clock_timestamp() where id=r.id;
  perform private.game_empty_shop_plot(r.shop_id,coalesce((select user_id from private.game_admins order by user_id limit 1),r.applicant));
 end loop;
end$$;
commit;
