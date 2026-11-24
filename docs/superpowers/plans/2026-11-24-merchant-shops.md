# Merchant shops

Implement within the existing 3D game and local Supabase, without commits or 2D changes.

- Add private applications with applicant-only/admin access, versioned review and an audit log.
- Admin creates empty shop plots in Town editor. Approval atomically assigns an unoccupied plot and turns it into an independently stocked shop.
- Player submits contact details, proposed shop name and description; sees status and admin feedback; can respond to more-information requests or reapply after rejection.
- Admin lists applications, sees private details, approves with a plot, rejects, requests information, suspends or reinstates an owner.
- Owner can manage products only in their approved shop. Suspension closes the shop, deactivates its products and revokes editing; reinstatement restores previously active products. No admin world editing granted.
- Keep all shop lists isolated and preserve website product/cart integration.
- Verify application lifecycle, privacy, unauthorized actions, duplicate plot allocation, stale review, ownership, suspension, removal and existing shop behavior with rollback SQL and frontend checks.

Personal details: full name, contact email, phone and contact address. No identity documents or bank details are collected. Applications now have independent IDs; one account can own and manage multiple approved shops. Suspended plots remain reserved until an admin removes the shop; reinstatement reuses that shop.

Completed with the existing public RPC and gateway, preserving the current tunnel. Verification: 304 Node tests passed, both TypeScript checks passed, scoped lint passed and rollback database lifecycle/regression checks passed. Browser verified the admin panel and plot catalogue without saving Town changes or creating real applications. A sibling React key collision found during browser testing was corrected with a merchant-specific key.


2026-11-24 extension: per-shop closure, durable owner notices and multiple shops.
- Preserve existing applications while migrating the primary key from owner UID to application ID.
- Admin closure requires feedback and revokes only the selected shop's editing and active website listings. Other shops owned by the player remain open.
- Persist private status notices for offline owners; show HUD unread count, closure preview and reason in Notifications. Read acknowledgement is owner-scoped.
- Owners can submit another shop application or reapply to reopen their existing closed storefront. Reopening requires a fresh admin approval and preserves product associations.
- Player panel lists each shop/application separately; review selection and updates use application IDs.
- Rollback SQL verifies two shops under one owner, closure isolation, notices/acknowledgement privacy, duplicate requests, reapplication, reopening and restoration of listings. Full Node suite: 311 passing.

Application notification extension: notify protected admins on new submissions and resubmissions; notify owners for receipts and every meaningful decision or feedback update. Use durable, recipient-scoped, deduplicated notices and unread-first history. Notification links target the application ID, selecting it for admin review or highlighting its owner card. Reuse the current gateway/RPC and rebuild in place; no tunnel restart or actual application decisions during verification.


Closed storefront behavior updated: admin closure releases the claim and converts the building back to an available empty plot, retaining position/rotation and decision history. Archive former products and clear catalogue bindings so reallocation starts empty. A formerly closed applicant can apply again for available land; prior ownership does not reserve the plot. Suspension/reinstatement continues separately. Apply the same conversion to previously closed storefronts. Town versions change so stale editor drafts cannot recreate closed shops. No tunnel restart is required.
