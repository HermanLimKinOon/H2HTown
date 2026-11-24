# MMO communication server operations

The migration `supabase/migrations/20261120062113_mmo_communication.sql` implements the RPC contract in `docs/superpowers/plans/2026-11-20-mmo-communication.md`. All public RPCs are SECURITY INVOKER wrappers; authenticated execution enters one checked SECURITY DEFINER dispatcher in the unexposed `private` schema. Tables have RLS, no client grants and no client write policies. Never expose `private` through PostgREST.

## Routing and movement

Private broadcast topic: `mmo:inbox:<auth.uid()>`, event `communication`, payload `{type:'message',message:...}` or `{type:'social'}`. Subscribe with `private:true`; clients cannot broadcast to these topics. A restrictive SELECT policy also protects MMO inbox rows when a legacy permissive receive policy matches another subscription topic. The old prototype inbox sender policy is removed. Message delivery rows are authoritative; clients must reload state/history after reconnect because Realtime is a notification transport.

Only registered server IDs in `private.mmo_servers` are accepted. The initial registry contains `local-1`. Register additional deployment IDs through trusted database administration, never a client RPC. `town` is public; `farm` and `house` normalize to `farm:<uid>` and `house:<uid>`, respectively. Clients cannot select another owner's instance.

Connect issues/replaces the player's client lease, resets sequence and movement credit, restores a prior same-instance validated position or chooses `(0,5)`. An owner-only farm/house connection may initialize its first accepted tick to a saved position inside its instance bounds; later ticks enforce the ordinary speed budget. Rejected initial proposals do not consume this initialization. Town never permits this exception. A tick requires the active client lease and a growing sequence number. The server clock is sampled after user/advisory locks and refreshed after group lock waits. Server time replenishes movement credit at 8.5 units/sec, capped at 3 units. Accepted proposals consume actual distance. Rejected proposals return the last validated position and `accepted:false`. Town/farm coordinates are bounded by ±23.55; house coordinates by ±5.5. Town segment collision samples every ≤0.2 units against the current building/tree/fountain layout, padded by the avatar's 0.45 radius. Mirror layout changes in the SQL before changing town obstacles. Client-authored movement broadcasts never authorize communication.

Local deliveries require fresh (15 sec) validated sender/recipient leases, matching world/server, and distance ≤the configured local radius (default 30). World uses the same world/server scope without distance. Group sends/reads check current membership and role permissions on each call. Group history is delivery-based and cannot recover messages before the current membership began. Party capacity is 8; guild capacity is 100. Owners retain read/write/invite authority. Owners can promote/demote officers and edit the three role permission objects. Officers can remove members; they cannot remove owners or officers or change permissions. Leaving owners transfer ownership to the earliest officer/member or delete an empty group. Accept rechecks invitation expiry, inviter authority, mutual blocks and capacity. Active pending invitations are capped at 16 per party, 200 per guild, 32 per inviter and 32 per recipient; expired invitations do not count. A target-specific advisory lock serializes concurrent invitations to the same recipient. Social notifications go only to current members and the directly impacted peer, so the pending invitation backlog cannot amplify each social operation.

Private messages persist for offline registered peers. Both parties receive delivery rows; recipient unread is cleared only through the supplied displayed message ID. Blocks prevent new bilateral messages/deliveries/invitations; preexisting history remains available. Social actions are serialized and limited to one successful action per 150 ms. Message limits are 400 characters, 8 messages per 10 seconds and 30 per minute. Repeated identical text within 5 seconds is rejected. Sender+nonce is unique and returns the original response for retries before reapplying limits. IDs serialize as decimal strings; timestamps are database timestamps.

## Trusted administration

Only UUIDs in `private.mmo_staff` may invoke `mmo_announce`. Administer that table with trusted SQL; no frontend key or app metadata grants this authority. Announcements support the public town plus registered server scope and are persisted/delivered like other messages. Staff still need a connected MMO profile and obey message limits.

Example administrative operations (replace UUIDs deliberately):

```sql
-- Changes apply to both state.config.local_radius and recipient routing.
-- Radius must be finite, greater than zero and at most 200 units.
update private.mmo_settings set local_radius=30 where singleton;
insert into private.mmo_servers(id) values ('regional-2');
insert into private.mmo_staff(user_id) values ('00000000-0000-0000-0000-000000000000');
-- Revoke immediately without waiting for JWT expiry:
delete from private.mmo_staff where user_id = '00000000-0000-0000-0000-000000000000';
```

The config advertises a 90-day retention policy. Configure a trusted scheduled cleanup in each deployment; this migration does not install pg_cron or a scheduler. Delete old messages in bounded batches during low traffic; delivery rows cascade:

```sql
delete from private.mmo_messages
where id in (select id from private.mmo_messages
             where created_at < clock_timestamp()-interval '90 days'
             order by id limit 5000);
delete from private.mmo_invites where expires_at < clock_timestamp();
```

## Local verification

Use the project's existing local stack only; never reset the database to run the tests:

```sh
docker exec -i supabase_db_h2haigroup psql -U postgres -v ON_ERROR_STOP=1 < tests/server/mmo-communication.sql
python3 tests/server/mmo-lock-waits.py
supabase db advisors --local --type security --level warn
```

The lock-wait script uses separate Docker/psql connections to prove a Local send waiting 16 seconds on the user lock expires and an invitation waiting 6 seconds on a group lock expires. It creates fresh test UUIDs, verifies database lock waits and cleans fixtures in a finally block.

The integration test creates real `auth.users` fixture rows inside a transaction, changes to `authenticated` for RPC/security checks, and rolls all data/broadcasts back. It covers movement spoofing, invalid floats, wall collision, lease freshness, exact radius boundary, trusted configuration changes from 30 to 10 and rejected invalid radii, server isolation, duplicate nonce/spam, offline private history/unread, blocking, party and guild membership loss, guild permissions, trusted announcements, direct inbox spoofing, legacy-policy SELECT isolation, active/expired invitation quotas, bounded social fanout and message limits.

Local security advisors report no MMO findings. Existing unrelated findings on `public.courses` (RLS disabled) and `public.tg_touch_updated_at` (mutable search path) were left unchanged.

The database has not been load-tested at production concurrency. Broadcast fanout is synchronous with message creation; `realtime.send` may report a warning without aborting durable delivery persistence. Clients recover missed notifications from history/state. Production operations still require monitoring, abuse escalation, scheduled retention and deployment-specific capacity testing. No distributed movement simulation or authoritative farm object collision is claimed: farm/house are isolated owner instances with bounded movement, and only town obstacles are validated.
