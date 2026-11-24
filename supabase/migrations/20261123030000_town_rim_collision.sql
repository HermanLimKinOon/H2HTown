-- Accept short, verifiably clear bends around circular rims between network updates.
-- The authoritative tick charges the full route length, not its obstructed chord.
begin;
create or replace function private.mmo_town_segment_clear(ax float8,az float8,bx float8,bz float8)
returns boolean language plpgsql immutable set search_path='' as $$
declare o record;dx float8:=bx-ax;dz float8:=bz-az;t float8;q float8[];lo float8;hi float8;delta float8;p1 float8;p2 float8;swap float8;clear_box boolean;
begin
 if ax is null or az is null or bx is null or bz is null or not(abs(ax)<=23.55 and abs(az)<=23.55 and abs(bx)<=23.55 and abs(bz)<=23.55) then return false;end if;
 for o in select * from (values(0::float8,-6::float8,2.35::float8),(-14,-12,1.25),(-14,0,1.25),(-14,12,1.25),(14,-12,1.25),(14,0,1.25),(14,12,1.25)) c(x,z,r) loop
  t:=greatest(0,least(1,case when dx*dx+dz*dz=0 then 0 else ((o.x-ax)*dx+(o.z-az)*dz)/(dx*dx+dz*dz) end));
  if(ax+t*dx-o.x)^2+(az+t*dz-o.z)^2<o.r^2-1e-9 then return false;end if;
 end loop;
 for o in select * from (values(-7::float8,-4::float8),(-7,-14),(7,-4)) b(x,z) loop
  lo:=0;hi:=1;clear_box:=false;
  foreach q slice 1 in array array[array[ax,bx,o.x,2.95::float8],array[az,bz,o.z,2.45::float8]] loop
   delta:=q[2]-q[1];
   if delta=0 then
    if abs(q[1]-q[3])>=q[4] then clear_box:=true;exit;end if;
   else
    p1:=(q[3]-q[4]-q[1])/delta;p2:=(q[3]+q[4]-q[1])/delta;
    if p1>p2 then swap:=p1;p1:=p2;p2:=swap;end if;
    lo:=greatest(lo,p1);hi:=least(hi,p2);
    if lo>=hi then clear_box:=true;exit;end if;
   end if;
  end loop;
  if not clear_box then return false;end if;
 end loop;
 return true;
end $$;
create or replace function private.mmo_town_path_distance(ax float8,az float8,bx float8,bz float8)
returns float8 language plpgsql immutable set search_path='' as $$
declare o record;ar float8;br float8;ux float8;uz float8;vx float8;vz float8;mx float8;mz float8;len float8;cos_half float8;r float8;x float8;z float8;best float8:='Infinity'::float8;
begin
 if not private.mmo_town_segment_clear(ax,az,ax,az) or not private.mmo_town_segment_clear(bx,bz,bx,bz) then return best;end if;
 if private.mmo_town_segment_clear(ax,az,bx,bz) then return sqrt((bx-ax)^2+(bz-az)^2);end if;
 for o in select * from (values(0::float8,-6::float8,2.35::float8),(-14,-12,1.25),(-14,0,1.25),(-14,12,1.25),(14,-12,1.25),(14,0,1.25),(14,12,1.25)) c(x,z,r) loop
  ar:=sqrt((ax-o.x)^2+(az-o.z)^2);br:=sqrt((bx-o.x)^2+(bz-o.z)^2);
  if ar=0 or br=0 then continue;end if;
  ux:=(ax-o.x)/ar;uz:=(az-o.z)/ar;vx:=(bx-o.x)/br;vz:=(bz-o.z)/br;
  mx:=ux+vx;mz:=uz+vz;len:=sqrt(mx*mx+mz*mz);cos_half:=len/2;
  if cos_half<1e-6 then continue;end if;
  r:=(o.r+1e-6)/cos_half;x:=o.x+mx/len*r;z:=o.z+mz/len*r;
  if private.mmo_town_segment_clear(ax,az,x,z) and private.mmo_town_segment_clear(x,z,bx,bz) then best:=least(best,sqrt((x-ax)^2+(z-az)^2)+sqrt((bx-x)^2+(bz-z)^2));end if;
 end loop;
 return best;
end $$;
create or replace function private.mmo_clear(ax float8,az float8,bx float8,bz float8)
returns boolean language sql immutable set search_path='' as $$select private.mmo_town_path_distance(ax,az,bx,bz)<'Infinity'::float8$$;
revoke all on function private.mmo_town_segment_clear(float8,float8,float8,float8),private.mmo_town_path_distance(float8,float8,float8,float8),private.mmo_clear(float8,float8,float8,float8) from public,anon,authenticated;
do $$
declare src text;old_distance text:='sqrt((nx-p.x)^2+(nz-p.z)^2)';new_distance text:='(case when p.world_id=''town'' then private.mmo_town_path_distance(p.x,p.z,nx,nz) else sqrt((nx-p.x)^2+(nz-p.z)^2) end)';
begin
 select pg_get_functiondef('private.mmo_base_api(text,jsonb)'::regprocedure) into src;
 if position('private.mmo_town_path_distance(p.x,p.z,nx,nz)' in src)=0 then
  if (length(src)-length(replace(src,old_distance,'')))/length(old_distance)<>2 then raise exception 'Unexpected MMO speed-budget implementation';end if;
  execute replace(src,old_distance,new_distance);
 end if;
end $$;
commit;
