# Local H2H Town Multiplayer Implementation Plan

**Goal:** Two independent browser players enter H2H Town and see each other's walking, turning, running, jumping and stopping through local Supabase.

**Architecture:** Use the existing Supabase JS dependency with an isolated per-tab local test login. Authenticated private Realtime Presence maintains the roster; Broadcast carries poses at 10 Hz; remote avatars interpolate between updates. Only the 3D town joins the room. Personal farms, house interiors, items and balances remain local.

**Constraints:** Keep the current branch and all unrelated edits. Do not edit the 2D game. Do not commit. Use only the configured loopback Supabase endpoint. No cloud deployment or shared economy in this milestone.

## Tasks

- [x] Add tested pose validation, ordering, stale-player handling and interpolation helpers.
- [x] Add authenticated Realtime channel policies restricted to the town topic and verify local access, including denial without a user session.
- [x] Add a per-tab local test login and town connection lifecycle with reconnect, presence cleanup and movement broadcasts. Preserve the site's existing login.
- [x] Publish the actual player pose from Player3D and render remote characters with independent animations, names and an online indicator. Menus must not freeze remote avatars.
- [x] Verify two real Supabase clients exchange movement and leave events, then test two browser sessions in town. Run tests, type checking, lint and build. Record local testing instructions.

## Review focus

Reject malformed/out-of-bounds/out-of-order packets. Handle late joins and stale/disconnected peers without ghost avatars. Leave channels on farm/house travel and clean up timers on unmount. Two tabs must not overwrite each other's auth or private saves. Keep local test signups disabled for hosted backends.

## Decisions and evidence

- User authorized starting local Supabase for this test. Docker was previously stopped; existing stacks resumed when Docker started. No database reset is authorized or needed.
- Use Realtime for the walking prototype, without installing a dedicated game server. This milestone synchronizes presentation, not authoritative gameplay or currency.
- Local Realtime rejected per-second Presence tracking with `ClientPresenceRateLimitReached`. Presence now publishes on join only; movement and idle heartbeats use Broadcast. A regression test checks that repeated sends never retrack Presence.
- Leave unsubscribes and tears down the old channel before reuse, avoiding socket shutdown/rejoin races. The local integration test passes join, pose exchange, stop/landing, leave/rejoin, denied anonymous access and denied unrelated-room access, and exits successfully after cleanup.
- Both browser test players showed 2 online, rendered each other, and saw movement in both directions. Closing Player 2 removed its avatar and reduced Player 1's count to 1. Temporary test tabs were closed afterward.
- Verification: 170 automated tests passed; type checking, scoped lint, production build and diff whitespace checks passed. The existing local `public.courses` RLS advisor findings predate this work and were not changed.
