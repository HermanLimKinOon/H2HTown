\set ON_ERROR_STOP on
begin;
do $$
declare a uuid:='f0960000-0000-4000-8000-000000000001';b uuid:='f0960000-0000-4000-8000-000000000002';p uuid:='f0960000-0000-4000-8000-000000000003';q uuid:='f0960000-0000-4000-8000-000000000004';app uuid;v jsonb;notice text;n bigint;s text;
begin
 insert into auth.users(id,email,is_anonymous,email_confirmed_at) values(a,'notice-admin@example.test',false,now()),(b,'notice-admin2@example.test',false,now()),(p,'notice-owner@example.test',false,now()),(q,'notice-other@example.test',false,now());
 insert into private.game_admins values(a),(b);
 insert into private.game_merchant_applications(applicant,status,details) values(p,'pending','{"shopName":"Notice test shop"}') returning id into app;
 if (select count(*) from private.game_merchant_notifications where application_id=app and audience='admin' and recipient in(a,b))<>2 then raise exception 'Both admins must receive submission notices';end if;
 if not exists(select 1 from private.game_merchant_notifications where application_id=app and recipient=p and audience='player' and status='pending') then raise exception 'Submission receipt missing';end if;
 select count(*) into n from private.game_merchant_notifications where application_id=app;
 update private.game_merchant_applications set updated_at=clock_timestamp() where id=app;
 if (select count(*) from private.game_merchant_notifications where application_id=app)<>n then raise exception 'No-op created duplicate notices';end if;
 update private.game_merchant_applications set status='more_info',note='Supply an address',version=version+1 where id=app;
 update private.game_merchant_applications set status='more_info',note='Also supply contact details',version=version+1 where id=app;
 if (select count(*) from private.game_merchant_notifications where application_id=app and recipient=p and status='more_info')<>2 then raise exception 'Same-status feedback updates must notify owner';end if;
 update private.game_merchant_applications set status='pending',note='',version=version+1 where id=app;
 if (select count(*) from private.game_merchant_notifications where application_id=app and audience='admin' and recipient=a)<>2 then raise exception 'Resubmission notice missing';end if;
 foreach s in array array['approved','suspended','closed','rejected'] loop
  update private.game_merchant_applications set status=s,note='Decision feedback',version=version+1 where id=app;
  if not exists(select 1 from private.game_merchant_notifications where application_id=app and recipient=p and status=s and body like '%Decision feedback') then raise exception 'Owner update missing for %',s;end if;
 end loop;
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('merchant_notices');
 if (v->>'unread')::int<>8 or jsonb_array_length(v->'notifications')<>8 then raise exception 'Owner unread count is wrong';end if;
 if exists(select 1 from jsonb_array_elements(v->'notifications') e where e->>'audience'<>'player') then raise exception 'Owner received admin notice';end if;
 notice:=v->'notifications'->0->>'id';
 reset role;perform set_config('request.jwt.claim.sub',q::text,true);set local role authenticated;
 v:=public.mmo_world_editor('merchant_notices');if v->>'unread'<>'0' then raise exception 'Other player sees notices';end if;
 perform public.mmo_world_editor('merchant_ack',notice);
 begin perform 1 from private.game_merchant_notifications;raise exception 'Direct notice table access allowed';exception when insufficient_privilege then null;end;
 reset role;
 if exists(select 1 from private.game_merchant_notifications where id=notice::uuid and read_at is not null) then raise exception 'Other player acknowledged notice';end if;
 perform set_config('request.jwt.claim.sub',p::text,true);set local role authenticated;
 v:=public.mmo_world_editor('merchant_ack',notice);if v->>'unread'<>'7' then raise exception 'Owner acknowledgement failed';end if;
 reset role;perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 v:=public.mmo_world_editor('merchant_notices');if v->>'unread'<>'2' then raise exception 'Admin feed missing applications';end if;
 reset role;delete from private.game_admins where user_id=a;
 set local role authenticated;
 v:=public.mmo_world_editor('merchant_notices');if v->>'unread'<>'0' or jsonb_array_length(v->'notifications')<>0 then raise exception 'Revoked admin still reads admin notices';end if;
 reset role;
end$$;
rollback;
