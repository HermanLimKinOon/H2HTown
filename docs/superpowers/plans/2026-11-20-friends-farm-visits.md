# Friends and Farm Visits Implementation Plan

**Goal:** Profiles, friend requests/list, private farm invitations with accept/decline, access-controlled travel, shared movement/chat and cooperative crop actions in3D.
**Architecture:** Extend local Supabase with private friend/request/visit/farm state tables and checked RPCs. The existing per-user inbox is notification only; polling authoritative state recovers missed events. A visitor renders a separate farm view; their own farm/save never gets replaced. Server serializes crop actions and awards harvested carrots to the farm owner through a monotonically increasing receipt counter.
**Tech stack:** Existing React, Three/R3F, Supabase Auth/Postgres/Realtime. No new dependencies.
**Constraints:** No commits/branch changes/2D changes/cloud writes. User opted out of proposal gates. Use parallel agents for independent SQL and presentational UI, root integrates client and3D.

## Decisions

Friend requests require explicit recipient acceptance. Private invitations mean addressed farm invitations, never public listings. Friend removal/block revokes pending invitations and access. Invitations expire after10minutes; accepted access lasts1hour or until revoked/left. Owner can revoke guests. Shared visits allow walking, Local/Private chat, digging grass, planting infinite seeds, watering each carrot stage, and harvesting; produce belongs to farm owner. Editing, restoring plots, chopping and interiors remain owner controls. Private shop/cat/coop economy is not shared. Owners can keep editing their own layouts; changed layouts publish to visitors. Existing local farms bootstrap once, then server crops take precedence while online. Crop growth uses server time and existing per-stage watering rule.

## RPC contract

All user IDs UUID; timestamp ISO strings; farm version integer; crop timestamps use epoch milliseconds matching Game3DSave. Public RPCs INVOKER checked private DEFINER implementation, auth required, no client table grants.

- `mmo_social_state()->SocialState3D`: friends/request/invitation/grant state, no private inventory/email.
- `mmo_profile(p_user uuid)->PlayerProfile3D`: id/name/online/bio/avatar/friendship enum/self/none/incoming/outgoing/friend/blocked. Avatar `{appearance,choice}` rendered through existing normalizers. Only in-game data.
- `mmo_profile_save(p_bio text,p_avatar jsonb)->PlayerProfile3D`: own bio max240, avatar size<=24KB.
- `mmo_friend_action(p_action text,p_target uuid)->SocialState3D`: request/accept/decline/cancel/remove; target is USER ID. Cannot request self/blocked; quotas/cooldown; cross-request never auto-accepts.
- `mmo_farm_invite(p_target uuid)->SocialState3D`: friends only, owner must first publish farm,10minute expiry, bounded invites.
- `mmo_farm_invitation(p_id uuid,p_accept boolean)->FarmSnapshot3D|null`: addressed recipient only, decline null, accept records1hour grant and returns snapshot; root then connects to farm owner world.
- `mmo_farm_leave(p_owner uuid)->boolean`: remove own guest grant. `mmo_farm_revoke(p_guest uuid)->SocialState3D`: host removes guest/pendinginvite.
- `mmo_farm_publish(p_snapshot jsonb)->FarmSnapshot3D`: owner only by auth.uid. Snapshot `{farmLayout,soil,plants,choppedTrees,growth,chickens,farmPausedAt}`. First call seeds from existing localfarm; subsequent calls update layout/choppedTrees/growth/chickens/paused but NEVER overwrite server crops/soil/harvest counter. Bound and validate JSON. During pause edits growth clocks preserved on resume; reject actions while paused.
- `mmo_farm_state(p_owner uuid,p_pose jsonb default null)->FarmSnapshot3D`: owner or current authorized visitor only. Avatar poses derive x/z/seq from validated mmo_players lease, cosmetic yaw/y/moving/running from p_pose for caller. Returns fresh authorized occupants array, excluding blocked. Revalidate grants/friendship/block on EVERY read/action/tick. Revoked guests cannot read live messages, movement or farmstate.
- `mmo_farm_action(p_owner uuid,p_action text,p_tile text,p_nonce uuid)->FarmSnapshot3D`: dig/plant/water/harvest/restore. restore owneronly. Serverchecks activelease matching `farm:<owner>` seen<15s, surrounding8tiles excludingroundedcenter, bounds, cleargrass/objects fordig, serverstage/water rules, serializedfarmrow. Idempotent nonce, rate limit. Harvest increments shared `harvested_carrots` counter; never duplicate reward. Observer sees same soil/plants. All snapshots include `owner_id,owner_name,version,server_now,harvested_carrots,snapshot,occupants`.

Patch existing mmo_connect to allow `farm:<owner>` only with accepted current grant. Own `farm` still normalizes; town unchanged. Never permit arbitrary housevisit. Patch tick and Local/World send/history to reject revoked guest scope; notifications go own inbox only. Permission invalidation also moves revoked guest serverworld to ownfarm or rejects until reconnect; root exits visit on denied refresh. Do not edit old migration; new migration independently upgrades relevant functions.

## Shared types and UI

Root owns `socialFarmTypes3D.ts`, pure `socialFarm3D.ts`, service/hook, Game3DScreen and communicationworld type integration.
SQL agent owns only new CLI-generated migration, server SQLtests and operationsdoc.
UI agent owns `SocialPanel3D.tsx`, optional logic and UItests. Props `{model:SocialFarmModel3D,selectedPlayer:MmoPlayer3D|null,onSelectPlayer(peer|null),onPrivateChat(peer),onFocusChange(boolean)}`. Compact Friends button top-right below Back2D, badge pending. Expand on explicit selection. Tabs Friends/Requests/Invitations; publicprofilecard selectedpeer; search by model.findPlayers; friend request/remove/accept/decline/cancel; bio selfedit; privatechat; invitefriendtofarm; accepttravel/decline/revoke; visitingbanner/return. Do not display giant panel permanently; accessible keyboard/mobile/literaltext. Model owns mutations/status/errors and visit travel, not UI.

## Tasks

- [x] SQL social privacy, invitation authorization, durable farm state, shared actions, movement scope integration; real tests negative access/expiry/block/unfriend/races/idempotency.
- [x] Social panel with profiles/friend lifecycle/invites and visit controls; UI tests.
- [x] Client service polling/reconnect/generation guards and own-save-safe visitor view/reward receipts; mocked tests.
- [x] Integrate clickplayer profile, farm peers, chat scope, owner snapshots, tool actions and visit travel/return.
- [x] Independent security review; full tests/typecheck/scopedlint/build, local two-player browser check; document limits. No commits.

## Verification

237 Node tests pass, including5 own-save/receipt tests,12 async service tests,9 social panel tests and5 executable account/visit boundary regressions. TypeScript, scoped ESLint and Vite production build pass (existing bundle-size warning). Independent review findings were fixed: metadata-only publish validation, discarded account/editor drafts, visitor persistence guards, paused-owner growth resumption, rejected private movement reconciliation, and continued access probes during world reconnects.

Real local two-account service smoke passes profiles, explicit friendship, invitation acceptance, validated shared occupants, cooperative digging/planting/watering/harvest, owner-only receipts/idempotency, and revocation while communication reconnects. Browser loaded the Friends launcher; the user interrupted the second browser-tab test to ask how invitations work, so the complete invitation/travel UI flow was not claimed browser-verified. No commits or2D changes.
