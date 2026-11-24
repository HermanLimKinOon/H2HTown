-- Town presentation only: no persistent inventory, currency or farm access.
-- realtime.messages already has RLS enabled and is owned by Realtime.
do $town$
begin
  if not exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='3D town authenticated receive') then
    create policy "3D town authenticated receive" on realtime.messages
      for select to authenticated
      using ((select auth.uid()) is not null and (select realtime.topic())='h2h-town-3d-v1'
        and extension in ('broadcast','presence'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='3D town authenticated send') then
    create policy "3D town authenticated send" on realtime.messages
      for insert to authenticated
      with check ((select auth.uid()) is not null and (select realtime.topic())='h2h-town-3d-v1'
        and extension in ('broadcast','presence'));
  end if;
end
$town$;
