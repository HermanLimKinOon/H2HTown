-- Only the inbox owner may subscribe. Signed-in town clients can deliver messages
-- to an inbox, while nearby-range checks run at both sender and receiver.
do $chat$
begin
  if not exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='3D nearby chat inbox receive') then
    create policy "3D nearby chat inbox receive" on realtime.messages
      for select to authenticated using (
        (select auth.uid()) is not null
        and (select realtime.topic())='h2h-town-3d-chat:'||(select auth.uid())::text
        and extension='broadcast'
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='3D nearby chat inbox send') then
    create policy "3D nearby chat inbox send" on realtime.messages
      for insert to authenticated with check (
        (select auth.uid()) is not null
        and (select realtime.topic()) ~ '^h2h-town-3d-chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and extension='broadcast'
      );
  end if;
end
$chat$;
