begin;
-- H2H storefronts share the existing website catalogue; building placement remains admin-only.
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
  if r.key !~ '^building-[1-9][0-9]{0,7}$' or not coalesce(private.sf_transform(r.value),false) or abs((r.value->>'x')::numeric)>20 or abs((r.value->>'z')::numeric)>20 or coalesce(r.value->>'style','') not in('cottage','market','hall','h2h') then raise exception 'Invalid Town building';end if;
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
commit;
