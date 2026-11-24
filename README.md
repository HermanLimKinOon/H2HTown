# H2HTown

H2H website and multiplayer 3D life-simulation project, including the private farm, H2H Town, merchant shops, chat/social systems and the OpenStreetMap Kuala Lumpur exploration preview.

## Set up locally

1. Install Node.js/npm and Git LFS. Run `git lfs install` and `git lfs pull` after cloning.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and fill in your own local Supabase URL and public anon key. Keep real credentials and payment private keys outside Git.
4. Start Docker and the local Supabase project using the setup in `docs/local-colyseus.md` and the Supabase configuration.
5. Run `npm run dev` for the website/game frontend, or follow `docs/friends-tunnel.md` for the friends test launcher.

## Documentation

- [Friends access, shops and setup](docs/friends-tunnel.md)
- [Local multiplayer](docs/local-colyseus.md)
- [Kuala Lumpur visual town](docs/kuala-lumpur-town.md)
- [OpenStreetMap district](docs/osm-kuala-lumpur-town.md)
- [Clean source snapshot](CLEAN_UPLOAD.md)

`npm test`, `npm run type-check`, and `npm run game:server:check` run the main local checks. Database permission tests are under `tests/server` and require a running local Supabase database.

The existing 2D game is under `src/pages/game`; the 3D game and previews are under `src/pages/game3d`. Blender source files and GLB models are tracked using Git LFS. Consult the asset licence notices and the OSM data attribution in `public/game3d/osm/README.md`.

This repository contains source and editable assets. Installed dependencies, generated builds, local databases, account data, tunnel credentials and real environment files are intentionally excluded.
