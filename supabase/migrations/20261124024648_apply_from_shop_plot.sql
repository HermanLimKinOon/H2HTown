begin;
-- Requested land is part of the private application; public plot metadata contains no personal information.
create or replace function private.game_merchant_api(op text,target text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
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
   lot:=d->>'plot';
   if jsonb_typeof(d->'plot') is distinct from 'string' or lot !~ '^building-[1-9][0-9]{0,7}$' or t.data->'buildings'->lot->>'style' is distinct from 'plot' or exists(select 1 from private.game_merchant_applications where shop_id=lot) then raise exception 'Choose an available empty shop plot';end if;
   details:=details||jsonb_build_object('plot',lot);
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
  select coalesce(jsonb_agg(jsonb_build_object('id',b.key,'name',coalesce(b.value->>'name','Empty shop plot'),'x',b.value->'x','z',b.value->'z') order by b.key),'[]') into plots from private.game_world_edits e cross join lateral jsonb_each(e.data->'buildings') b where e.world='town' and b.value->>'style'='plot' and not exists(select 1 from private.game_merchant_applications m where m.shop_id=b.key);
 if admin then
  select coalesce(jsonb_agg(to_jsonb(x)-'paused_products' order by x.updated_at desc),'[]') into apps from private.game_merchant_applications x;
  return jsonb_build_object('application',case when a.applicant is null then null else to_jsonb(a)-'paused_products' end,'applications',apps,'plots',plots);
 end if;
 return jsonb_build_object('application',case when a.applicant is null then null else to_jsonb(a)-'paused_products' end,'plots',plots);
end$$;
revoke all on function private.game_merchant_api(text,text,jsonb,bigint) from public,anon,authenticated;
commit;
