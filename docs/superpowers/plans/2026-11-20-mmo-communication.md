# MMO Communication Implementation Plan

**Goal:** Implement all six communication channels, server-authorized routing, persistent private messages, social groups, a compact responsive chat HUD and camera-projected speech bubbles in the existing 3D game.

**Constraints:** Local Supabase first. Keep the existing branch and all unrelated edits. Do not commit. Do not modify the 2D game. Never put privileged keys in frontend code. The user opted out of proposal/approval gates earlier in the conversation.

**Architecture:** Postgres RPCs authenticate callers, validate leased movement snapshots, resolve recipients, enforce blocks/memberships/roles/rate limits, persist messages and deliveries, and emit private server-only Realtime notifications. The existing movement renderer remains, but it cannot authorize chat recipients. The compact HUD expands only on intent. Character bubbles use active-camera projection and greedy overlap avoidance.

**Shared contract:** `src/pages/game3d/mmoCommunicationTypes3D.ts` is owned by the primary agent. JSON fields use snake_case. Timestamp strings are server ISO timestamps; message IDs are decimal strings. Topic `mmo:inbox:<auth.uid()>`, private channel, broadcast event `communication`, payload `{type:'message',message:MmoMessage3D}` or `{type:'social'}`. Only server/database code can send to the new topic.

## Server RPC contract

- `mmo_connect(p_client uuid,p_name text,p_world text default 'town',p_server text default 'local-1') -> MmoState3D & {presence:MmoPresence3D}`. Public town key `town`; farm/house are normalized into private owner instances. Server chooses/restores safe spawn and rejects unregistered servers. Never trust a connect-time position from the client.
- `mmo_tick(p_client uuid,p_seq bigint,p_x float8,p_z float8) -> MmoPresence3D`. Server-clock speed budget, finite bounds and town obstacle/segment checks; return correction when a proposal is rejected. Only the active lease can update. Freshness at send is checked server-side.
- `mmo_leave(p_client uuid) -> boolean`.
- `mmo_send(p_channel text,p_body text,p_nonce uuid,p_target uuid default null,p_kind text default 'text') -> MmoMessage3D`. Local default 30 units, World same world/server, Party/Guild current membership, Private addressed peer (including offline), System disallowed. Idempotency by sender+nonce. Server rates and duplicate spam checks.
- `mmo_history(p_channel text,p_target uuid default null,p_before timestamptz default null,p_before_id bigint default null,p_limit int default 30) -> MmoMessage3D[]` newest first; authorize each request and filter current membership. Local/World history is delivery-based, not all-room history.
- `mmo_state() -> MmoState3D`.
- `mmo_social(p_action text,p_kind text default 'party',p_target uuid default null,p_name text default null,p_group uuid default null,p_role text default null,p_permissions jsonb default null) -> MmoState3D`. Actions: create/invite/accept/decline/leave/kick/role/permissions/block/unblock. Invitation target/group fields are invitation ID in `p_target` for accept/decline. Other actions target user ID; `p_group` identifies a group. One party and one guild per user. Owners/officers/members with explicit permissions; owner always retains authority; last-owner leave transfers or deletes an empty group.
- `mmo_read(p_channel text,p_target uuid default null,p_through bigint default null) -> {unread_private:number}`. Only own deliveries, through the last displayed ID.
- `mmo_find_players(p_search text,p_limit int default 12) -> MmoPlayer3D[]` safe names/IDs/status only.
- `mmo_announce(p_body text,p_world text default 'town',p_server text default 'local-1') -> MmoMessage3D` trusted staff allowlist only.

Public functions are thin SECURITY INVOKER wrappers around checked private-schema SECURITY DEFINER implementations. Revoke default PUBLIC function execution. All exposed tables have RLS and no unrestricted client writes. Existing prototype inbox send policies must be removed to prevent bypass.

## Tasks and ownership

- [x] Server agent: own only the generated `20261120062113_mmo_communication.sql`, new server test SQL/scripts, and server-operation docs. Implement and apply locally without reset; test real accounts, denied writes, membership changes, blocks, offline unread, idempotency, spoofing, stale/teleporting movement and radius/server boundaries.
- [x] HUD agent: own only `MMOChatHUD3D.tsx`, optional HUD helper files and HUD-specific tests. Consume the shared model, no Supabase access. Props `{model:MmoCommunicationModel3D,onFocusChange:(focused:boolean)=>void,privateTarget:MmoPlayer3D|null,onPrivateTargetChange:(peer:MmoPlayer3D|null)=>void,nearbyPlayers:MmoPlayer3D[],enabled?:boolean}`. Compact dark bottom-left four-message preview fades after 6.5 sec; mobile floating button. Expanded tabs/history/input/emoji/emotes/social controls; Enter/Escape/Tab and controller focus/navigation. No central/permanent large panel. New read marks only while expanded/visible.
- [x] Speech agent: own only `MMOSpeechBubbles3D.tsx`, `mmoSpeechBubbleLayout3D.ts`, and speech-specific tests. Props `{messages:MmoMessage3D[],selfId:string|null,localPose:React.MutableRefObject<{x:number;y:number;z:number}>,peers:TownPeers3D,enabled?:boolean}`. LOCAL messages only; one bubble per character, newest wins; 4–6 sec lifetime, text truncation, camera projection/frustum hiding and overlap avoidance; no pointer events. Use `receivedAt` to expire, never display historical bubbles.
- [x] Primary: own shared types, frontend communication service/hook, existing multiplayer hook changes, Game3DScreen/TownPlayers integration, cross-system tests, build/lint/browser verification and final documentation.

## Verification and production boundary

Run unit tests and real local database integration tests. Check all role/privacy boundaries with negative tests. Verify desktop and mobile HUD and projected bubbles in browser when available. Production readiness requires deployment-specific load/capacity, abuse operations and credential review; report unvalidated scale honestly rather than claiming MMO-scale load testing from local checks.

## Verification results

- 206 Node tests passed, including11 communication-client races/pagination/reconnect tests,7 HUD tests and5 bubble-layout tests.
- Real local SQL suite passed recipient isolation, group permissions, spam, offline reads, changed radius, legacy-policy leakage and bounded invitation checks.
- Real concurrent lock-wait tests passed expired movement and invitations after actual16/6-second waits.
- Real PostgREST/Realtime smoke passed Local, Private unread/read, Party invitation/member routing, offline recovery and membership cache removal.
- TypeScript and scoped ESLint passed; production Vite build passed with existing large-bundle warning.
- Browser verified Local send, head-position bubble, Enter/Escape/Tab, desktop panel and390px mobile launcher/expanded layout. No physical controller was available.
- Review findings fixed: restrictive inbox SELECT isolation; bounded invitations; clock after locks; older-history browsing window; account-keyed drafts/recipient; delayed-send draft preservation.
- No commits, cloud deployment,2D changes or production load test. Retention scheduler remains a deployment operation.
