# Local H2H Town multiplayer test

This is a movement and presence prototype for the 3D game. It uses the configured local Supabase Auth and Realtime services at `http://127.0.0.1:54329`. No hosted backend or dedicated game server is required.

## Test two players

Run the local Supabase stack and Vite on port 3000, then open these in two tabs:

- `http://localhost:3000/game-3d?townTest=1`
- `http://localhost:3000/game-3d?townTest=2`

The two tabs start at separate town positions and automatically authenticate with separate local test accounts. The town indicator should show **2 players online** in both tabs. Each player has a name tag. Move using WASD or click-to-walk; the other tab shows the movement, facing, walking/running animation, jumping and stopping. Returning to the farm removes that player from the shared town.

The query parameter works only in development with a loopback Supabase endpoint and a loopback page hostname. Test saves use sessionStorage; they do not overwrite the main browser farm save. Test logins also use per-tab sessionStorage and a separate Auth storage key, preserving the website login. Local test accounts have generated `example.test` addresses and are not real email accounts. Local email confirmation must remain disabled for this test.

The normal 3D town also joins the local test room when entered. The 2D version has no multiplayer changes.

## Communication

The former highlighted-tile conversation prototype is replaced by the MMO communication system described in [server operations](mmo-communication-server.md). Click another player to open Private chat. Local chat reaches server-validated players within the configurable radius (default30 world units); World, Party, Guild and offline-capable Private channels are also available.

Press Enter or the bottom-left Chat button to expand the panel. Enter sends, Tab cycles channels, Escape closes and discards the draft. The compact desktop preview fades after6.5 seconds; mobile shows a floating launcher. Local live messages create short speech bubbles. People manages groups/invitations and guild permissions; Private supports player search, conversations, unread counts and blocking. Opening chat stops local movement and click-to-walk; other players keep moving.

Run `node scripts/test-mmo-communication.mjs` for the current real PostgREST/Realtime smoke test. `scripts/test-town-chat.mjs` and its old inbox sender policy are retired; the pure legacy tests remain as regression documentation and do not describe current routing.

## Backend setup

The uncommitted migration `supabase/migrations/20261120031424_town_3d_multiplayer.sql` creates authenticated SELECT/INSERT policies on Realtime's existing RLS-protected `realtime.messages` table. The policies are limited to the `h2h-town-3d-v1` topic and Broadcast/Presence. They do not grant access to farm saves, inventory or commerce tables. The migration was executed directly against the local database without resetting data; no remote database was modified.

## Verification

- `node --test tests/town-multiplayer.test.mjs`
- `node scripts/test-town-multiplayer.mjs` — creates two local test accounts, exercises real private-channel presence and pose broadcasts, leave/rejoin, and rejection of unauthenticated/unrelated-room access. Requires local Supabase.
- `npm test`, `npm run type-check`, scoped ESLint, `npm run build`.

## Scope

Only presentation is shared: presence, character appearance, pose and movement. Currency, inventory, crops, editing, trading and farm visits remain single-player. Realtime membership requires authentication, but client-reported movement is not an authoritative anti-cheat system. A server that validates gameplay commands is a later milestone.

Movement is sent at 10 Hz. Presence is published on join rather than repeatedly tracked, avoiding the local server's Presence rate limit. A late join receives the initial profile and the next live pose update. Avatars ease toward received positions, and stale peers expire after 8 seconds; a resumed tab can restore its avatar through the current Presence roster. Leaving town unsubscribes and stops broadcasts; the socket can be reused on return to avoid a disconnect/rejoin race in the current SDK. Closing the game disconnects it.
