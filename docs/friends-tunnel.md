# Free 3D friends access

Run from the project folder:

```sh
npm run game:friends
```

Requires Docker Desktop, this project's local Supabase on 54329, Node 22+, and `cloudflared` (already installed on this computer). The launcher checks Auth health, builds a separate `friends` bundle, creates a free Quick Tunnel, and prints the share URL ending in `/game-3d`.

Keep the computer awake, online and running Docker/Supabase and the friends process. Friends open that same URL on their own devices and start in H2H Town. Players sign in through the existing H2H website AuthModal; registration uses the existing H2H member registration page. The website and game share one Supabase client and session. Automatic guest signup has been removed. Friends-mode login sessions persist in this browser; sign out before another person uses the same device. These accounts belong to the local Supabase instance. Existing local-save economy limitations still apply.

Up to ten players can join the friends server simultaneously. The separate original localhost game/server can continue running. The two movement servers use different rooms/processes; everyone testing together should use the public URL.

Stop public access with Ctrl+C in the terminal running `game:friends`. All its own child processes close. Do not stop unrelated Docker containers. Restarting prints a different URL, and friends need the new link. The current URL, start time and parent process ID are recorded in ignored `.local/friends-session.json`; it is a last-session record, not an uptime guarantee.

Architecture: cloudflared -> loopback gateway 3002 -> static `out-friends` build / exact game RPC+Auth+Realtime allowlist on Supabase 54329 / isolated Colyseus 2569. Colyseus trusts only the exact generated HTTPS origin in addition to existing localhost origins. Studio, inbox, SQL ports, arbitrary REST tables, Auth administration, Vite source, source maps, 2D routes and private storage are not forwarded. Anyone who has the URL can create a test player and connect; there is no invitation-only website access gate. Existing game friendship and private-farm authorization still apply.

The normal build, shared website Supabase configuration and 2D game were not changed. Friends mode is opt-in through this launcher. Generated output and runtime records are ignored; no commits are made.

Verification:

```sh
node --test tests/friends-gateway.test.mjs tests/colyseus-client.test.mjs tests/colyseus-server.test.mjs
npm run type-check
npm run game:server:check
node scripts/test-friends.mjs
```

The live test uses only the configured public Supabase key and creates two disposable local test users through the public tunnel. It checks restricted routes, rejects a foreign origin, verifies two-player Town presence, movement over public WSS, a Supabase realtime websocket subscription and nearby local chat history delivery, then closes its sessions. The local chat verification message can be visible to other nearby players while the test runs.


## Permanent address

The prepared hostname is `https://play.h2haigroup.com/game-3d`, backed by the named Cloudflare tunnel `h2h-friends-local`. Its exact origin, tunnel ID, required nameservers and token-file path are in ignored `.local/friends-named.json`. The tunnel token is stored separately in ignored `.local/friends-tunnel-token` with mode 0600; do not share or commit that file.

`npm run game:friends` automatically uses this permanent address once the domain's nameservers match its Cloudflare configuration. Before activation it clearly reports the pending state and keeps temporary mode. `npm run game:friends:fixed` requires the permanent setup and exits with an activation message instead of generating a random URL. `npm run game:friends:temporary` explicitly requests a temporary URL.

DNS activation is outstanding as of 2026-11-23: authoritative nameservers remain `ns09.domaincontrol.com` / `ns10.domaincontrol.com`; Cloudflare requires `armfazh.ns.cloudflare.com` / `elisa.ns.cloudflare.com`. Do not switch delegation before reviewing existing website/email records. Inactive Cloudflare apex/www AAAA records currently differ from the live website's apex A record and www CNAME. The concrete comparison is in `.local/friends-dns-activation-review.json`. Only the new play CNAME was created; apex, www, MX, TXT and registrar nameservers have not been modified.

Verified: the named tunnel registered four healthy connections in a temporary connector test, then that test connector was stopped. Public use and restart persistence cannot be verified until domain activation. The running temporary friends session remains available. Both multiplayer server and browser accept the exact configured named HTTPS origin while still rejecting unrelated origins.


## Required player login

The 3D route verifies the Supabase account before mounting or loading the world. The game uses the existing website sign-in modal and member registration, with a game return destination; signing out unmounts the game and closes its multiplayer connections. Browser refresh restores a valid verified login session. Localhost test tabs also use the website login session; use separate browser profiles to test different players.

`20261123060000_game_requires_login.sql` enforces registered accounts in the game API, farm API and room proof. Anonymous users and legacy automatically generated `town-UUID@example.test` accounts are denied; their active game leases are cleared without deleting accounts or farm records. Colyseus also checks the account type. No service-role key is exposed. The 2D route is unchanged. Website sign-in retains its usual profile destination by default; game sign-in supplies an optional /game-3d return destination. Friends builds proxy the shared website client through same-origin /supabase. Authentication methods such as Google and SMS still require provider configuration on the local backend.

Starting `npm run game:friends` again reuses a healthy recorded local friends session and prints its existing URL instead of starting a duplicate server. It checks the recorded process and local multiplayer health first. An unrelated port conflict still fails safely without terminating processes. To actually restart, stop the original terminal with Ctrl+C first.

## Game administrators and editing

The local verified account `test@gmail.com` is assigned the game-admin role by user ID in protected `private.game_admins`. This is separate from website commerce administration. There is no client-facing role-assignment endpoint. User profile metadata cannot grant admin access.

The game displays an Admin/Player badge. Admins can open **World editor**, select H2H Town or any published player's farm/house, and save changes. Ordinary players can edit their own farm and house. House layouts are now stored through the checked editor API; Town transforms drive rendering and SQL/Colyseus collision rules. Server checks reject other-owner edits by normal players, enforce expected layout versions, validate payloads and record each successful edit in a private audit table. New administrative grants require a trusted database operation. Production roles are unchanged.

Admin tools do not transfer a player's inventory, coins or pet ownership. Farm editor writes change layout only and preserve shared crops. Property dropdown lists published farms, not accounts that have never entered the game. Role checks refresh periodically; permission is checked again on every server request.

### Shared Town building editor

Admin Town editing uses the farm-style scene workflow: click a model to open Move/Rotate/Delete, hover an object to outline it, move with a faded cursor preview, press R for quarter turns, and save/cancel/undo through the bottom panel. Camera controls use WASD/arrows, Q/E, wheel zoom and right-drag rotation. Buildings offers cottage, market and community hall with replaceable SVG thumbnails and centralized visual components. New buildings are shared world scenery and collision objects; creating one does not automatically add a new shop service or an enterable interior. Add those interactions separately when needed.

Town supports up to 64 added buildings. The server validates the catalogue, transforms, object separation and arrival clearance; only admins may save. Existing shops may be deleted. The return-home portal retains its move-only rule. Layout version checks and edit auditing remain active. Preview and draft edits stay local until Save Town.

### Manage shop products

In **World editor → select a shop → Manage products**, game admins can add/edit listings, replace images, change prices, enable/disable buying and selling, and hide/remove game listings. Market-style buildings have the same action and an independent game catalogue when first saved. Ordinary players cannot save catalogue edits.

H2H Shop is explicitly connected to the local website `public.products` catalogue: names, descriptions, image URLs, categories, member/original RM prices and active status are shared. New website products are inserted with their real product IDs. Archive hides a product without deleting its order references. Only edited H2H records are written; other website fields and unedited products are preserved. An internal product-change trigger advances the catalogue version even when another website admin edits outside the game, so stale drafts are rejected. No production Supabase deployment was performed.

Meadow/Cat Shop use private, versioned 3D catalogues with supported inventory-item/cat bindings. Player shop screens use those settings and refresh the listing before buying/selling; changed prices or item bindings require reviewing the new offer. H2H Buy continues adding real product IDs to the existing website cart. The existing local-save coin/inventory limitations remain; this feature does not introduce a server-authoritative wallet.

Catalogue writes use registered-account and protected game-admin checks, validate input/image paths/prices/bindings, and record edits in the private audit log. The existing world-editor RPC is reused, so this feature needs no friends tunnel restart or URL change. 2D game source is unchanged; its shared H2H catalogue reflects the website edits requested by the user.

### Create independent physical shops

Admin: World editor → H2H Town → Buildings → New shop. Place it on clear land and select it to enter a shop name, then Apply name and Save Town. Select the saved shop → Manage products to add its own products, images, descriptions and RM prices. Each new shop starts empty and displays only its own listings. These products also update the local website catalogue and use the existing website cart. The original H2H shop also has its own explicit product list: it never automatically lists another shop’s or newly created website products. Old H2H copies keep independent empty catalogues until products are added and are no longer offered in the creation menu. Market buildings keep their separate game-item coin catalogues.

Shops retain their names when moved, rotated and reloaded. Server validation restricts Town editing and product writes to admins. Deleting a shop clears its listing associations without deleting website product/order records. Save Town before managing a new storefront's products.

Verified with 303 Node tests, TypeScript checks, scoped ESLint and rollback-only local SQL tests covering placement, permissions, custom products, isolation, website synchronization and deletion cleanup. Friends frontend rebuilt in place with H2H_FRIENDS_BUILD=1; current tunnel link preserved.

H2H isolation migration preserves its original website products and excludes references already assigned to other shops. All website-shop reads and writes now require explicit per-shop references. Foreign product IDs cannot be edited through another shop, even by an admin using the product API. No website products are deleted by this separation.

### Individual sellers and admin-created plots

1. Admin: World editor → Buildings → Empty shop plot. Place a plot on clear Town land, optionally rename it, and Save Town. Empty plots reserve a 5×4 footprint for construction but players can walk over them.
2. Player: click an Empty shop plot (or its Apply for shop label) to open the registration form with that location selected. My shops / Apply also lets players choose a currently available plot. Submit full name, contact email, phone, contact address, shop name and a short description. Players may apply for multiple shops; each application has its own approval and plot. The requested plot is recorded in the application and preselected for admin approval if still available. Pending requests do not reserve land; occupied or removed plots are rejected on submission. Pending applications wait for review; rejected or more-information applications can be updated and resubmitted.
3. Admin: click an empty plot in Town → View applications (or select it in World editor → View applications). The panel shows only applicants who requested that plot, automatically opens a waiting applicant’s details, and approves into that specific plot. Rejection requires feedback. The Seller applications button still opens the full review list, where admins can filter by status, view personal details, request additional information, reject, or approve with an available plot. Approval atomically creates an independently stocked website shop on the selected lot. Two sellers cannot receive the same plot, and stale decisions must reload.
4. Approved owner: My shops / Apply → Manage products, or enter their shop and use Manage products. Only their own shop products may be changed. This does not grant Town editing, other shop editing, website admin roles, or access to other applicants' details.
5. Admin: add feedback and Suspend merchant. Their storefront closes, editing is denied and previously active website products are hidden. Reinstate seller reopens the reserved shop and restores those previously active products. If an admin removes the shop, ownership is revoked and the player may submit a new application for another plot; product/order records are preserved.

Applications and review history are stored in private RLS-enabled tables with no direct player privileges. Registered players see only their own applications; protected game admins see the review list. Application contact details are never placed in shared Town data. All decisions and permissions are checked server-side through the existing `mmo_world_editor` RPC, so the running friends gateway does not need a restart. Each account can own multiple shops and manage their catalogues separately.

Local verification: 304 Node tests; frontend/server TypeScript checks; scoped ESLint; rollback SQL for the complete merchant lifecycle, PII boundaries, self-approval denial, stale decisions, duplicate plot allocation, owner-only product editing, suspension/reinstatement, shop removal, and existing isolated catalogue/website update/archiving behavior. Admin seller panel and plot selection verified in the existing browser session. No actual merchant was approved and no plot was added to the user's saved world during tests.


### Close a player shop, notify its owner, and manage multiple shops

Admin: Seller applications → choose the shop → enter a reason in Feedback → **Close this shop**. Only that shop closes; its website products are hidden and owner product edits are denied. Other approved shops belonging to the same player remain open. The building returns to an Empty shop plot at the same position and rotation, and its ownership/catalogue bindings are cleared. Any player may apply for the released plot, subject to admin approval.

Player: the notification bell shows an unread badge; a new closure shows a brief preview. Open Notifications to read the shop name, decision, reason and timestamp, then Mark read. Decisions are stored privately in local Supabase, including for offline players, and refresh approximately every 15 seconds while playing. The notice feed never returns another player's application information.

**My shops / Apply** lists all owned shops and applications. Use Manage products on an approved shop, **Apply for a new shop** for an available empty plot, or **Apply for a shop again** on a closed application. Submit the registration details and choose an available plot; the plot stays empty until admin approval. Approval after closure creates a fresh empty catalogue; the former seller’s archived product and order records are preserved. New shop applications always need their own approval and cannot take occupied land. The 2D game and existing tunnel URL are unchanged.

Verification: 311 Node tests, frontend type check, scoped ESLint and rollback SQL for multi-shop closure/reopening, owner notification privacy and existing merchant lifecycle. No real player application decisions are changed during verification.

### Game shopping cart and H2H checkout

The cart icon in the top-right HUD opens the same account-scoped website cart used by game storefronts. It shows product images, names, RM prices, quantities, removal, and subtotal. Empty carts and unavailable products cannot proceed. Product details are fetched when the panel opens; loading or failed catalogue requests do not display mock prices or enable checkout. Close and reopen to retry a failed catalogue request.

Proceed to H2H checkout navigates within the same origin to `/cart`, preserving the website login and cart. This is the existing H2H delivery/payment page; the HUD never creates an order or takes payment itself. Game-coin inventory purchases remain in the bag. Opening the cart pauses movement inputs and closes other HUD panels; Escape closes it.

The friends gateway now permits only public product GETs, the best-seller RPC, existing authenticated payment creation/status functions, and the required checkout/shop/member-order SPA routes. Direct product writes, arbitrary functions, admin APIs and 2D routes remain blocked. Gateway changes require restarting the friends launcher; temporary tunnel addresses change on restart.

Verified: 312 Node tests, frontend TypeScript, scoped ESLint, friends production build, live cart button/empty panel, and HTTP 200 from the restarted public game, checkout, shop, payment-return and product catalogue. No payment was submitted. The restarted origin requires signing in again before further in-game testing.

### Seller application notifications

Protected game admins receive a private notification for every new or resubmitted seller application. Existing pending applications are included when this feature is installed. The notice opens that exact application for review. Revoking an admin's role also hides their former admin-only notices and excludes them from the unread count.

Players receive submission receipts, approval/rejection, requests for more information, suspension, closure, and changed feedback even when the application status is unchanged. Notices include the shop name, decision, feedback, timestamp and unread state, and link to the corresponding application. They persist while players are offline. The HUD refreshes approximately every 15 seconds and displays a short preview of unread updates. Mark read acknowledges only the current recipient's notice. Unread notices are prioritized so older unread decisions are accessible even beyond the 50-notice preview limit.

Server-side triggers create notices in the same transaction as the application update, with a per-recipient/application/version/audience key to avoid duplicates. Personal contact details are not copied into notification text. Neither direct private table access nor another user's read acknowledgement is allowed.

Verification: rollback-only notification tests cover multiple admins, new submissions and resubmissions, unchanged-status feedback, no-op deduplication, all owner decisions, unread counts, acknowledgements, other-player isolation, direct-table denial, and admin-role revocation. The existing merchant approval, multiple-shop, closure/reopening and product permissions tests also pass.


Closed-shop plot conversion: closure clears the merchant claim before updating Town, preserves the admin reason and a single owner notice, returns the building to style `plot` without moving/rotating it, and increments Town version to reject stale editor saves. The empty plot is walkable and immediately eligible for new applications. Catalogue associations are removed and website products archived, preventing another tenant or a later approval from restoring former-owner listings. Suspensions still retain their storefront and reinstatement behavior. Existing closed shops are converted during migration. Verified with rollback tests for plot appearance/location/rotation, collisions, notification preservation, independent second-shop access, competing applications, new-tenant ownership, empty catalogue and retained website product records.
