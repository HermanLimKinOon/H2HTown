# Require login for the 3D game

User cancelled domain activation work and requested player login. Preserve 2D, current branch and no commits.

1. Replace automatic guest signup with explicit Supabase email/password sign-in and account creation, using a persistent game-only client for friends builds and the website client for normal local play. Explicit local test tabs may keep isolated storage but must also log in.
2. Mount no game world, controls or multiplayer hooks until the server verifies the user. Add sign-out, and unmount the world on logout or invalid session.
3. Reject anonymous identities and legacy automatically generated town-UUID@example.test accounts in checked game SQL entry points and Colyseus verification. Preserve existing account/farm data.
4. Test credential flows, session races, login gate rendering, logout, and server rejection of old guests. Run appropriate local SQL, TypeScript and game regression checks; rebuild the friends output without restarting its current tunnel when possible.

Completed: explicit login/account creation and verified session gate; lazy world loading; sign-out and session-race protection; SQL/API denial of legacy/anonymous guests; current friends bundle updated without a tunnel restart. Verified in browser: zero canvas before login, successful account sign-in, refresh restoration, sign-out returns to login, zero canvas after logout, and logged-out refresh remains gated. Login SQL, existing MMO and room-proof SQL regressions pass; frontend/server TypeScript checks and scoped lint pass. No 2D source or shared website auth changes, no DNS changes and no commits.
