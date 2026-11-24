begin;
-- Preserve existing application identities while allowing an owner to hold several shops.
alter table private.game_merchant_applications add column id uuid;
update private.game_merchant_applications set id=applicant;
alter table private.game_merchant_applications alter column id set default gen_random_uuid(),alter column id set not null;
alter table private.game_merchant_applications drop constraint game_merchant_applications_pkey;
alter table private.game_merchant_applications add primary key(id);
create index game_merchant_applicant_idx on private.game_merchant_applications(applicant,updated_at desc);
alter table private.game_merchant_applications drop constraint game_merchant_applications_status_check;
alter table private.game_merchant_applications add check(status in('pending','more_info','approved','rejected','suspended','closed'));
create table private.game_merchant_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null references private.game_merchant_applications(id) on delete cascade,
 shop_name text not null,status text not null,body text not null,
 created_at timestamptz not null default clock_timestamp(),read_at timestamptz
);
create index game_merchant_notice_recipient on private.game_merchant_notifications(recipient,created_at desc);
alter table private.game_merchant_notifications enable row level security;
revoke all on private.game_merchant_notifications from public,anon,authenticated;
create function private.game_merchant_notify() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status is distinct from old.status and new.status<>'pending' then
  insert into private.game_merchant_notifications(recipient,application_id,shop_name,status,body)
  values(new.applicant,new.id,new.details->>'shopName',new.status,
   (case new.status when 'closed' then 'Your shop has been closed by an administrator.' when 'suspended' then 'Your shop has been suspended.' when 'approved' then 'Your shop application has been approved.' when 'more_info' then 'More information is needed for your shop application.' else 'Your shop application has been rejected.' end)||case when new.note<>'' then E'\n'||new.note else '' end);
 end if;return new;
end$$;
revoke all on function private.game_merchant_notify() from public,anon,authenticated;
create trigger game_merchant_status_notice after update on private.game_merchant_applications for each row execute function private.game_merchant_notify();
create or replace function private.game_merchant_api(op text,target text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.mmo_require_login();admin boolean:=private.game_is_admin(u);a private.game_merchant_applications;who uuid;app_id uuid;notices jsonb;unread bigint;next_status text;feedback text;lot text;t private.game_world_edits;b jsonb;validated_details jsonb;field text;plots jsonb;apps jsonb;active_ids bigint[];
begin
 if op not in('merchant_read','merchant_submit','merchant_review','merchant_ack','merchant_notices') then raise exception 'Invalid seller action';end if;
 if op='merchant_review' and not admin then raise exception 'Only admins may review seller applications' using errcode='42501';end if;
 if op='merchant_ack' then
  update private.game_merchant_notifications set read_at=clock_timestamp() where id=target::uuid and recipient=u and read_at is null;
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
   if jsonb_typeof(d->'plot') is distinct from 'string' or lot !~ '^building-[1-9][0-9]{0,7}$' or not coalesce(((t.data->'buildings'->lot->>'style'='plot' and not exists(select 1 from private.game_merchant_applications where shop_id=lot)) or (a.shop_id=lot and a.status in('closed','rejected','more_info'))),false) then raise exception 'Choose an available empty shop plot';end if;
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
    update private.game_merchant_applications set status=next_status,note=feedback,paused_products=active_ids,version=version+1,updated_at=clock_timestamp() where id=a.id returning * into a;
   end if;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(u,who,a.status,feedback);
  end if;
 end if;
 -- Personal information is returned only to the applicant or a protected game admin.
 if op not in('merchant_submit','merchant_review') then
  select * into a from private.game_merchant_applications where applicant=u order by updated_at desc,id limit 1;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.key,'name',coalesce(b.value->>'name','Empty shop plot'),'x',b.value->'x','z',b.value->'z') order by b.key),'[]') into plots from private.game_world_edits e cross join lateral jsonb_each(e.data->'buildings') b where e.world='town' and b.value->>'style'='plot' and not exists(select 1 from private.game_merchant_applications m where m.shop_id=b.key);
 select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id),'[]') into notices from (select id,application_id,shop_name,status,body,created_at,read_at from private.game_merchant_notifications where recipient=u order by created_at desc,id limit 50) n;
 select count(*) into unread from private.game_merchant_notifications where recipient=u and read_at is null;
 if op='merchant_notices' then return jsonb_build_object('notifications',notices,'unread',unread);end if;
 select coalesce(jsonb_agg(to_jsonb(x)-'paused_products' order by x.updated_at desc,x.id),'[]') into apps from private.game_merchant_applications x where admin or x.applicant=u;
 return jsonb_build_object('application',case when a.id is null then null else to_jsonb(a)-'paused_products' end,
  'ownApplications',(select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(apps) e where e->>'applicant'=u::text),
  'plots',plots,'notifications',notices,'unread',unread)||case when admin then jsonb_build_object('applications',apps) else '{}'::jsonb end;
end$$;
revoke all on function private.game_merchant_api(text,text,jsonb,bigint) from public,anon,authenticated;
create or replace function private.game_removed_merchant_shops() returns trigger language plpgsql security definer set search_path='' as $$
declare a record;begin
 if new.world='town' then
  for a in select * from private.game_merchant_applications where shop_id is not null and (new.data->'buildings'->shop_id->>'style' is distinct from 'market' or new.data->'buildings'->shop_id->>'shopType' is distinct from 'website') for update loop
   update public.products p set active=false where exists(select 1 from private.game_shop_catalog c cross join lateral jsonb_array_elements(c.products) e where c.shop=a.shop_id and e->>'reference'=p.id::text);
   update private.game_merchant_applications set status='closed',shop_id=null,paused_products='{}',note='Your assigned shop was removed by an administrator. You can submit a new shop application.',version=version+1,updated_at=clock_timestamp() where id=a.id;
   insert into private.game_merchant_audit(actor,applicant,status,note) values(coalesce(auth.uid(),a.applicant),a.applicant,'closed','Assigned shop removed');
  end loop;
 end if;return new;
end$$;
revoke all on function private.game_removed_merchant_shops() from public,anon,authenticated;
create or replace function private.game_world_editor(op text,w text,d jsonb,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if op in('merchant_read','merchant_submit','merchant_review','merchant_ack','merchant_notices') then return private.game_merchant_api(op,w,d,expected);end if;
 if op in('shop_read','shop_save') then return private.game_shop_api(op,w,d,expected);end if;
 return private.game_world_editor_before_shops(op,w,d,expected);
end$$;
revoke all on function private.game_world_editor(text,text,jsonb,bigint) from public,anon;
grant execute on function private.game_world_editor(text,text,jsonb,bigint) to authenticated;
commit;
