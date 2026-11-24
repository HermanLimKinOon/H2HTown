begin;
-- Preserve existing Town transforms; add an extensible catalogue-backed building collection.
update private.game_world_edits set data=data||jsonb_build_object('buildings',coalesce(data->'buildings','{}')) where world='town';
create function private.game_town_shapes(d jsonb) returns table(id text,kind text,x float8,z float8,rotation int,width float8,depth float8) language sql immutable set search_path='' as $$
 select key,case when key in('meadow','cats','h2h') then 'shop' when key='fountain' then 'fountain' when key='portal' then 'portal' when key like 'tree-%' then 'tree' else 'npc' end,
 (value->>'x')::float8,(value->>'z')::float8,(value->>'rotation')::int,
 case when key in('meadow','cats','h2h') then 5 when key='fountain' then 4 when key='portal' or key like 'tree-%' then 3 else 1 end,
 case when key in('meadow','cats','h2h','fountain') then 4 when key='portal' then 2 when key like 'tree-%' then 3 else 1 end
 from jsonb_each(d->'objects') where value<>'null'::jsonb
 union all
 select key,'building',(value->>'x')::float8,(value->>'z')::float8,(value->>'rotation')::int,5,4 from jsonb_each(coalesce(d->'buildings','{}'))
$$;
revoke all on function private.game_town_shapes(jsonb) from public,anon,authenticated;
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
  if r.key !~ '^building-[1-9][0-9]{0,7}$' or not coalesce(private.sf_transform(r.value),false) or abs((r.value->>'x')::numeric)>20 or abs((r.value->>'z')::numeric)>20 or coalesce(r.value->>'style','') not in('cottage','market','hall') then raise exception 'Invalid Town building';end if;
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
-- The same catalogue dimensions are used by the SQL tick and Colyseus/browser model.
create or replace function private.game_town_collisions() returns table(kind text,x float8,z float8,r float8,w float8,d float8) language sql stable set search_path='' as $$
 select case when s.kind in('shop','building') then 'box' else 'circle' end,s.x,s.z,
 case when s.kind='fountain' then 2.35 else 1.25 end,
 case when s.rotation%2=0 then 2.95 else 2.45 end,case when s.rotation%2=0 then 2.45 else 2.95 end
 from private.game_world_edits e cross join lateral private.game_town_shapes(e.data) s where e.world='town' and s.kind in('shop','building','fountain','tree')
$$;
revoke all on function private.game_validate_town(jsonb),private.game_town_collisions() from public,anon,authenticated;
commit;
