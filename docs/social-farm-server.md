# Social profiles and shared farm server

Local migration: `supabase/migrations/20261120071224_social_farm_visits.sql`.
RPC contracts and JSON types follow `docs/superpowers/plans/2026-11-20-friends-farm-visits.md` and `src/pages/game3d/socialFarmTypes3D.ts`. Public RPCs are SECURITY INVOKER wrappers around checked private SECURITY DEFINER entry points. Every new table has RLS and no browser grants; helpers and the preserved old MMO dispatcher are not executable by clients. The `private` schema must remain unexposed through PostgREST.

## Invitations and access

A player must connect once before their in-game profile can be discovered. Profiles expose only safe in-game fields: name, status, biography (240 characters, multiline allowed), avatar (24 KB maximum), and friendship status. They contain no email or inventory.

Friend requests require explicit acceptance; cross-requests never create a friendship automatically. Outstanding requests are limited to 32 per sender/recipient, accepted friendships to 200, request creation to once per five seconds, and other friend mutations to once per 200 ms.

Owners publish a farm before inviting friends. Farm invitations are addressed to one friend and expire after ten minutes. Accept grants access for one hour. There may be 16 pending invitations per owner, 32 per recipient, and eight active guests per farm. Decline removes the invitation. Return home removes only that guest's access to the specified farm; reverse-direction grants/invitations remain intact. Hosts can revoke one guest. Unfriend and block revoke both directions and pending invitations; block also removes friendship and friend requests.

Accepted visitors connect to `farm:<owner UUID>`; arbitrary house visits are rejected. Visitor spawn is `(0,8)`. Owners retain bounded initial saved-position initialization; guests must follow the ordinary server-clock movement budget from server spawn. Access is checked on every farm read/action, guest tick, and Local/World send/history/read. Recipient resolution excludes expired or unauthorized guests. Revocation moves affected server leases into their own farm with stale presence, and clients return home when denied refresh. All notifications use the existing server-only per-user inbox; no farm-wide client broadcast channel is added. Polling farm/social state is authoritative after missed notifications.

Shared advisory access locks allow reads, movement and crop actions to run concurrently. Access mutations take the exclusive lock so revocation cannot slip between authorization and data delivery. Farm rows serialize crop mutations; the MMO user lock serializes same-player ticks/actions. This favors clear local correctness; large deployment throughput requires load testing and possibly narrower access-lock partitioning.

## Farm persistence and crops

The first owner publish imports existing farm layout, soil, plants, chopped trees, growth durations, chickens and pause state. Subsequent publishes accept metadata without soil/plants and merge the existing authoritative crops before validation; client crops and harvest totals never overwrite server state. The snapshot excludes inventory, coins, shops, cats and interiors. JSON collections, transforms, tile keys, numeric bounds, array sizes and total snapshot size (512 KB) are checked. Layout defaults and clear-grass/object tests mirror the current 3D farm layout; update the migration helpers when changing world geometry.

Farm snapshots contain `owner_id`, `owner_name`, `version`, `server_now`, `harvested_carrots`, `snapshot`, and `occupants`. Crop clocks are epoch milliseconds. Occupant identity, x/z and sequence come exclusively from fresh validated leases; the caller supplies only bounded cosmetic y/yaw/moving/running. Avatars are passed through frontend normalizers.

Actions require a current lease in the specified farm, a fresh authorized grant for visitors, one of the eight tiles around the rounded character center, and an unpaused farm. Dig requires clear grass; plant requires empty tilled soil; water starts one growth stage; a completed stage needs watering again. Harvest requires stage three and increments the owner's monotonic `harvested_carrots` receipt counter. Restore is owner-only and removes both soil and any planted crop, without harvest credit. Shared actions never grant visitors private inventory or editing controls.

A sender/nonce receipt prevents duplicate harvest rewards; reusing a nonce for another action/tile/farm is rejected. Action limits are ten per second and 120 per minute. Pause/resume rebases server crop clocks, and existing tree/chicken clocks, instead of allowing growth during the pause. Owners reconcile the monotonic harvest counter into their own local inventory; visitors never receive the produce.

## Local verification

Never reset or run against a hosted database:

```sh
# supabase_admin is the local container's test administrator. It permits dblink
# trust connections for real concurrent tests; browser calls still run as authenticated.
docker exec -i supabase_db_h2haigroup psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < tests/server/social-farm.sql
docker exec -i supabase_db_h2haigroup psql -U postgres -v ON_ERROR_STOP=1 < tests/server/mmo-communication.sql
supabase db advisors --local --type security --level warn
```

The main SQL tests roll fixtures and notifications back. Separate-session tests install dblink transactionally, race two authorized harvesters, verify one reward, queue a read behind revocation, and explicitly clean their committed UUID-only fixtures. Running as ordinary local `postgres` skips only the superuser-required dblink race section. Negative tests exercise direct-write/helper denial, malformed snapshots, profile limits, cross-requests, addressed/expired invitations, unauthorized reads/connect/actions, spoofed cosmetic positions, blocked/removed/expired access, premature crops, duplicate nonces, pause/resume, metadata-only publishes and directional leave.

No production capacity/load testing is claimed. Durable crop-action receipts currently need deployment-specific retention planning. Farming movements use validated speed/bounds; farm-specific obstacle checks govern digging, while town movement retains its existing segment collisions. Existing unrelated advisor findings on `public.courses` and `public.tg_touch_updated_at` are outside this change.
