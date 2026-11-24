# Local Colyseus Implementation Plan

**Goal:** Run a free local Colyseus server and connect the existing3D game for live town/farm movement, with a server-wide10-player limit.
**Architecture:** A single Node/TypeScript Colyseus process binds127.0.0.1:2567. Authenticated browser sessions join `h2h_world` rooms keyed by serverId/world. Supabase Auth and a new checked room-session RPC prove actual user/world/farm access. Colyseus validates proposed poses and sends batched, room-scoped, recipient-filtered snapshots; React consumes those instead of old movement broadcasts. Supabase remains authoritative for farming/chat/invites/saves during this first local increment.
**Constraints:** No commits, branch changes,2D changes, paid services or cloud deployment. Keep localhost3000 frontend. User opted out of approval proposals. Pin npm versions. Never send service-role keys to browsers or print JWTs. Local server rejects non-loopback Supabase configuration and rejects nonlocal browser origins. No claim of1000-player readiness.

## Shared contract

`RoomSession3D` returned by public `mmo_room_session()` (checked private helper, authenticated only): `{userId,name,world,serverId,x,z,seq,leaseId,allowInitialPosition,appearance,choice,blockedUserIds,farmLayout}`. Read actual mmo_players lease; require fresh15s lease and sf_scope_ok for farm access; return only own session and current farm layout when authorized. Farm ownership grants do not come from client options. `farmLayout` null for town. `allowInitialPosition` only own-farm uninitialized pose, preserving an existing local save; never for guest. Existing SQL APIs/migrations are not modified.

Browser uses `@colyseus/sdk` auth.token = current Supabase access token. Join `h2h_world` with `{world,serverId:'local-1'}`; normalize own `farm` into `farm:<userId>` before joining. Join after communication profile is online. No account creation inside Colyseus.

Messages:
- client `pose`: `{seq,x,y,z,yaw,moving,running}`. Never accept userId/name/clientId/permissions as authority. Limit size and frequency; reject malformed positions. Server clock speed budget8.5/sec capped3; finitebounds±23.55,y0..4. Use existing town/farm collision helpers where compatible. Farm edit teleport initialization is own-only.
- server `snapshot`: `{world,serverId,selfId,players:TownPeer3D[],count,limit:10}`. `selfId` is own Colyseus sessionId. Derive peer user/name from verified session; sessionId supplies clientId; appearance/choice from normalized profile. Limit avatar sizes. Scope and blocked lists filter recipients; no unrelated room data. Up to10Hz; no per-player global-town fanout.
- server `correction`: `{x,y,z,yaw,moving:false,running:false}`. Adapter invokes root authoritative correction.
- server close/reject sends useful sanitized reason (full, unauthorized, expired, inactive world); neverJWT/errorobjects.

Server rechecks session/world/farm grant at most5seconds apart and disconnects expired/revoked/changed-world peers. This bounds local visual revocation delay; existing SQL farming/chat checks remain per-command. Safe cleanup reconnects and frees capacity. Ten-player cap is shared across rooms, not bypassed by spawning another room. One active session per user. Server health endpoint exposes only health/capacity counts.

## Ownership and tasks

- [x] Root: packages/lock/scripts; new checked SQL migration20261120085848; shared types; integration into Game3DScreen and status; docs/verification.
- [x] Server agent: `server/colyseus/**`, `tsconfig.colyseus.json`, `tests/colyseus-server.test.mjs` only. Implement server, auth adapter, global capacity, validation and refresh; test malformed input/identity/scope/block/speed/full/release/revoke. No package/SQL/frontend edits.
- [x] Client agent: `src/pages/game3d/colyseusConnection3D.ts`, `useColyseusMultiplayer3D.ts`, `tests/colyseus-client.test.mjs` only. Export connection+hook described below; stable refs, auth refresh on reconnect, serialization across world changes, no leaked timers/late state, usefuloffline/errors, strict packetparse. No server/package/SQL edits.
- [x] Live integration script: two authenticated clients, snapshot isolation, rejected unauthorized joins, movement/corrections, farm grant revocation, disconnect/rejoin and11th-client rejection. Keep tests headless for PC memory.
- [x] Independent review; regression suite, client/server typechecks, scopedlint/build, browser screenshot if available; document exact start commands and unfinished production work.

## Client exports

`connectColyseus3D(options)` options `{endpoint,client:SupabaseClient,userId,world,serverId?,getPose:()=>TownLocalPose3D,onPeers,onStatus,onCorrection,onRoomInfo?}` returns `{closed:Promise<void>,stop:()=>Promise<void>}`. Status `connecting|online|reconnecting|offline|error`; errors passed optional `onError:(message:string)=>void`. `onRoomInfo({count,limit,world})` optional. Connection handles reconnect backoff, newSupabase token perjoin,100ms pose messages, stale/self exclusion, verified snapshotworld. No auth writes.

`useColyseusMultiplayer3D({enabled,endpoint,world,pose,identity,onCorrection})` -> `{peers,status,error,name,available,retry,roomCount,limit}`. enabled only localDEVgame + localSupabase + ownstorage/profile ready + town/farm. Root renders newsource for both town/farm; retain legacy source only when Colyseuslocalfeature is disabled outside localdev, never silently fallback on failure in localdev.

## Final verification

260 Node tests pass (including11 client adapter tests and12 server authority/lifecycle/cache tests); frontend and server TypeScript checks, scoped ESLint, whitespace check and Vite production build pass. Existing large frontend-bundle warning remains.

Real local eleven-account suite passed on isolated2568: invalid auth/scope, movement/spoof corrections, bilateral blocks, ten global seats across rooms, eleventh rejection, seat release/rejoin, friend farm visibility, coordinated pond relocation with stable SQL/Colyseus/client positions, and revoke/disconnect/read denial (1129ms measured). The isolated test server was stopped; the user game server2567 and Vite3000 remain running.

Room-session SQL tests passed missing/stale/unauthorized/expired/blocked access and coordinated correction plus existing-obstacle traversal denial. Independent review findings fixed: SQL and Colyseus share layout-induced corrections via roomRevision; checked farm ticks prevent repair abuse; disconnecting during asynchronous join cannot leak a capacity seat.

Browser showed Colyseus online for farm and town, existing Friends UI, and successful world travel. Screenshot: /private/tmp/h2h-local-colyseus.png. Temporary test tab closed. No commits, paid services, cloud deployment or2D changes.
