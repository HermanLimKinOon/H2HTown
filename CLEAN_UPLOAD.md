# H2HTown clean source snapshot

This repository starts from the current project files, with no previous Git history.
Credentials, the payment private key, real .env files, local Supabase runtime state, downloaded database imports, generated builds and node_modules are excluded. A placeholder-only .env.example documents configuration. The original working project is unchanged.

Large Blender sources and GLB models use Git LFS. Clone with Git LFS installed, run `git lfs pull`, install packages with `npm ci`, and configure local secrets separately before starting services. Source code, server code, Supabase migrations/functions, tests, licensed assets and OSM-derived map data are included.

The excluded payment key must be provided through the payment function's configured environment secret, not a file in Git. See the project's Supabase/payment configuration documentation. Supabase migrations reproduce schemas; local database contents and user accounts are not uploaded.
