# Reuse website login for 3D game

Use the existing H2H AuthModal and shared Supabase client/session rather than the separate game account form. Preserve registered-account server verification and the signed-out world gate. Add an optional /game-3d login return destination; existing website callers keep their profile destination. Friends-mode website client uses the same-origin local Supabase proxy, with exact login and member registration API routes allowed by the gateway. Do not alter 2D game source or commit.

Validation: 288 automated tests pass, including auth/session race guards and gateway route restrictions. Frontend/server TypeScript and friends build checked. Browser verification uses a disposable local account. Google/SMS require configuration on local Supabase; this does not import production website accounts.

Browser passed: existing H2H modal password login opens the multiplayer Town, refresh restores the shared session, and sign-out returns to H2H login. Screenshot: /private/tmp/h2h-website-game-login.png. Friends process restarted to load exact website-auth gateway routes; current URL is recorded in .local/friends-session.json.
