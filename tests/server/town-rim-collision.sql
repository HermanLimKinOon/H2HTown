\set ON_ERROR_STOP on
begin;
do $$
declare d float8;src text;
begin
 d:=private.mmo_town_path_distance(2.35001,-6,1.873011191982158,-4.435013624114493);
 if d>3 or d<=sqrt((1.873011191982158-2.35001)^2+(-4.435013624114493+6)^2) then raise exception 'Rim movement must use the full clear detour distance';end if;
 if not private.mmo_clear(2.35001,-6,1.873011191982158,-4.435013624114493) then raise exception 'Legal fountain rim slide rejected';end if;
 if private.mmo_town_path_distance(2.35001,-6,0,-6)<'Infinity'::float8 then raise exception 'Fountain interior accepted';end if;
 if private.mmo_town_path_distance(2.35001,-6,-2.35001,-6)<=3 then raise exception 'Fountain shortcut accepted';end if;
 if private.mmo_town_path_distance(-11,-4,-3,-4)<'Infinity'::float8 then raise exception 'Shop wall shortcut accepted';end if;
 if abs(private.mmo_town_path_distance(0,5,1,5)-1)>1e-8 then raise exception 'Clear walking distance changed';end if;
 if private.mmo_town_path_distance(0,5,24,5)<'Infinity'::float8 then raise exception 'World bounds bypassed';end if;
 select pg_get_functiondef('private.mmo_base_api(text,jsonb)'::regprocedure) into src;
 if position('private.mmo_town_path_distance(p.x,p.z,nx,nz)' in src)=0 then raise exception 'Tick speed budget does not charge the detour';end if;
end $$;
do $$
declare u uuid:='f0110000-0000-4000-8000-000000000001';client uuid:='f0110000-0000-4000-8000-000000000002';r jsonb;d float8;chord float8;remaining float8;
begin
 insert into auth.users(id) values(u);
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 r:=public.mmo_connect(client,'Rim fixture');
 reset role;
 d:=private.mmo_town_path_distance(2.35001,-6,1.873011191982158,-4.435013624114493);
 chord:=sqrt((1.873011191982158-2.35001)^2+(-4.435013624114493+6)^2);
 update private.mmo_players set x=2.35001,z=-6,seq=0,budget=3,moved=clock_timestamp()+interval '1 second' where id=u;
 set local role authenticated;
 r:=public.mmo_tick(client,1,1.873011191982158,-4.435013624114493);
 if r->>'accepted'<>'true' then raise exception 'Authenticated tick rejected valid rim movement';end if;
 reset role;select budget into remaining from private.mmo_players where id=u;
 if abs(remaining-(3-d))>1e-7 then raise exception 'Tick did not debit full detour length';end if;
 update private.mmo_players set x=2.35001,z=-6,seq=0,budget=(d+chord)/2,moved=clock_timestamp()+interval '1 second' where id=u;
 set local role authenticated;
 r:=public.mmo_tick(client,1,1.873011191982158,-4.435013624114493);
 if r->>'accepted'<>'false' then raise exception 'Tick accepted detour over speed budget';end if;
 reset role;
end $$;
rollback;
