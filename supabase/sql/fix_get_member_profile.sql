-- Fix: get_member_profile must be SECURITY DEFINER so authenticated users
-- are not blocked by missing table GRANT / RLS on public.members.
-- Run this in the Supabase SQL Editor if profile load shows:
--   "permission denied for table members"

create or replace function public.get_member_profile()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.members%rowtype;
  w public.member_wallets%rowtype;
  has_wallet boolean := false;
begin
  if uid is null then
    return json_build_object('error', 'not_authenticated');
  end if;

  select * into m
  from public.members
  where user_id = uid
  order by id asc
  limit 1;

  if not found then
    return json_build_object('error', 'no_member', 'member', null, 'wallet', null);
  end if;

  select * into w
  from public.member_wallets
  where member_id = m.id
  order by id asc
  limit 1;

  has_wallet := found;

  return json_build_object(
    'member', to_json(m),
    'wallet', case when has_wallet then to_json(w) else null end
  );
end;
$$;

revoke all on function public.get_member_profile() from public;
grant execute on function public.get_member_profile() to anon, authenticated;
