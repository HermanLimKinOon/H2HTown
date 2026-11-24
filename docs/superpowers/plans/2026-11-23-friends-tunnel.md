# Free friends tunnel

User authorized a temporary public Cloudflare URL for 3D multiplayer, with no commits and no 2D changes. Stay on the current dirty branch as requested.

Use one loopback-only gateway on 3002 behind cloudflared. Serve a separate `friends` Vite production build from `out-friends`, excluding source maps and the 2D route. Proxy only required Auth, game RPC and Realtime routes to local Supabase; proxy `/multiplayer` to a separate Colyseus process on 2569. Do not publish Studio, mail inbox, database ports, arbitrary REST tables, admin endpoints or Vite source files.

Friends builds create isolated local test accounts through the same-origin gateway and start new players in Town. Existing localhost identity/save behavior stays intact. Colyseus accepts its usual local origins plus the exact generated HTTPS tunnel origin. Client remote connections require an explicit matching friends origin. No service-role keys leave the backend.

1. Write failing origin, client endpoint and gateway route tests.
2. Implement friends-only browser configuration, exact-origin server support and restricted HTTP/WebSocket gateway.
3. Add a launcher that checks local dependencies, builds the friends bundle, obtains a free temporary tunnel URL, starts its own gateway/Colyseus children and cleans them up on stop.
4. Run focused tests, type checks and a separate build. Start the tunnel, check public routing restrictions, authenticate two separate users, join Town through public WSS and verify exchanged movement.
5. Verify the browser preview, provide the URL and restart/stop instructions. Do not commit.

Completed: 267 Node tests pass, both TypeScript checks and scoped lint pass, separate friends build succeeds. Real public URL verified with two disposable accounts, explicit browser Origin headers, Town presence, WSS movement, local chat and Realtime websocket subscription. Browser confirmed online Friends Town. Normal 2D source and shared Supabase client were not modified. No commits.
