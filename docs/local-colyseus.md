# Free local Colyseus development

The 3D game now uses a local Colyseus process for town/farm live movement in loopback development. No Colyseus Cloud account or paid hosting is needed. The 2D game is unchanged.

## Start

Keep the project's existing local Supabase stack running. Its API is currently http://127.0.0.1:54329. Use the project's existing.env public Supabase URL/key; the game server never needs a service-role key.

In one terminal:

```sh
npm run game:server
```

This starts Colyseus at http://127.0.0.1:2567, bound only to the local machine. Health: http://127.0.0.1:2567/health.

In another terminal:

```sh
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Open http://localhost:3000/game-3d. For isolated test players, open http://localhost:3000/game-3d?townTest=1 and http://localhost:3000/game-3d?townTest=2 in separate tabs. They use local-only disposable Auth identities and separate browser test saves; the regular farm save is preserved. Use Friends to request/accept friendship and send/accept farm invitations. Town and farm participants now render from Colyseus snapshots.

Local configuration (.env.example):

```dotenv
VITE_PUBLIC_COLYSEUS_ENABLED=true
VITE_PUBLIC_COLYSEUS_URL=ws://127.0.0.1:2567
```

The frontend enables this only in development with loopback page/Supabase hosts. An unavailable Colyseus server shows a reconnect message instead of silently switching movement transports. Explicitly setting VITE_PUBLIC_COLYSEUS_ENABLED=false restores the previous local movement path. Hosted/production builds retain that existing path until a deliberate deployment migration.

## Boundaries

For browser testing, use the **Test player 1** and **Test player 2** links in the local multiplayer status box, then bring both players to H2H Town. Two ordinary signed-in tabs use the same website account; they compete for its single active player lease and cannot represent two players. Test links open isolated tab sessions with `noopener`, preserving the website login. Do not duplicate an already signed-in test tab, which can copy its session storage.

Docker Desktop and this project's local Supabase must remain running alongside Vite and Colyseus. If authentication fails or the status remains “Preparing local session…”, check the displayed session error and restore the local backend before reconnecting. Different private farms intentionally do not share player visibility; use Town or an accepted farm visit.

- One Colyseus process supports a configured local beta cap of 10 simultaneous authenticated users across all rooms. This is a limit, not a measured production capacity claim.
- `h2h_world` rooms isolate town and each owner's farm. The ordinary player JWT is checked with Supabase Auth and mmo_room_session(), which derives identity and current world from a fresh validated database lease.
- Private farm entry requires current accepted invitation/friendship and no blocks. Verification refreshes with a maximum 5-second verification window or closes the connection; visible revocation may take up to that bounded interval. Existing SQL crop/chat authorization still checks every command.
- Colyseus validates finite bounded movement, sequence, message rates, server-clock speed and town/farm obstacles. SQL farm ticks share collision checks, so walking into an existing obstacle cannot mint a repair. If a new layout obstructs a player, a checked SQL function chooses a safe position and increments a revision; Colyseus adopts that same correction rather than independently teleporting. It derives player names and identity from server-verified profiles. Snapshots are scoped to rooms and filter mutually blocked peers.
- Chat, friend requests, farm invitations, crop commands and persisted farm snapshots remain on local Supabase. Database tick/polling paths remain during this first increment; this is not the completed scaling migration for 1000 players.
- Browser position prediction and avatar interpolation remain in the existing3D renderer. Inventory/coins still have the preexisting local-save limitations; this work does not claim a production anti-cheat economy.
- Node22+ is required by the pinned Colyseus0.18 dependencies. The workspace currently runs Node24.

## Verification

```sh
npm test
npm run type-check
npm run game:server:check
npm run game:multiplayer:test
npm run build
```

The live test creates disposable local test accounts and requires a loopback Colyseus/Supabase endpoint. It checks real room connections and security/capacity behaviors; avoid running capacity tests against a server in active gameplay. Database room-proof checks are in tests/server/colyseus-session.sql and run transactionally without resetting data.

The Colyseus packages and TypeScript runner are pinned in package.json/package-lock.json. npm audit currently reports 16 advisories in the wider app/toolchain dependency graph; no automatic unrelated major-version upgrades were applied. Production deployment still requires targeted dependency review, durable-economy migration, larger load tests, monitoring and hosting configuration.

Final checks:260 Node tests, both TypeScript projects, scoped lint and production build pass. The actual eleven-account local suite verifies the ten-player cap and rejected eleventh client, room isolation, reconnects, invitation-restricted farm entry, stable edit-induced relocations and revocation. Browser verified online Colyseus in farm/town and travel.

Town rim collision fix (2026-11-23): network snapshots can span a curved client slide around the fountain. Town validation now considers a short two-leg path outside a circular rim when the direct chord is blocked. Both legs must clear all obstacles, and the complete path length is debited from the server-clock movement budget. Local Supabase uses the same geometry and distance budget through `20261123030000_town_rim_collision.sql`. Farm movement is unchanged. Regression tests cover actual client trajectories at 100ms/250ms update intervals, authenticated SQL ticks, rejected interior/wall/speed shortcuts, and the public tunnel walk with no corrections.


Position ownership fix (2026-11-23): while a Colyseus room is active, the room writes its validated movement to local Supabase through the player's checked `mmo_tick` lease. The browser stops its parallel HTTP position loop only after a valid room snapshot confirms a successful SQL write (`positionWriter`). Pending HTTP corrections and failures from before handoff cannot reverse the active room position or replace its lease. Disconnecting releases ownership and resumes the legacy path; house interiors and non-Colyseus builds keep their existing behavior. No service-role credential is used. Writes are serialized per player; one sequence-race retry is allowed, and a real SQL rejection reconciles the movement server to the same position before broadcasting a correction. Initial private-farm positioning waits for the first validated player pose.

The reported general flicker was observed as repeated rejected HTTP positions at one location while the movement server returned a different location several tiles away. Tests cover both delayed HTTP rejection and timeout, accepted server persistence, rejection reconciliation, farm permission revocation and edit-induced relocation. The public smoke test now waits for server ownership and suspends its simulated legacy ticks too.
