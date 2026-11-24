# OpenStreetMap Kuala Lumpur town preview

Enter through **Travel → Explore Kuala Lumpur · OpenStreetMap**, or `/game-3d?world=osm-kl`. The current H2H Town, farm, saved shops and inventories remain separate. Return to H2H leaves the OSM preview and restores the existing game screen. The same website sign-in gate protects both destinations.

The new destination is explicitly a **solo exploration preview**. It does not join the H2H multiplayer room, reuse its coordinates, claim real-world buildings as merchant shops, or change its 49-unit world layout. Multiplayer, commerce, interiors, and administrative editing are not connected to OSM buildings in this first preview.

The selected district around latitude 3.15359 / longitude 101.69641 uses an actual OSM export: 1,329 bounded building footprints, 1,901 road/path sections, 24 water features and five park polygons. Named places include Dataran Merdeka, Sultan Abdul Samad Building and Jamek Mosque. The region is approximately 1.6 × 1.3 km and does not extend to KLCC. Direct OSM export was used after public Overpass queries failed.

## Controls

- City view: drag to rotate, wheel or +/− to zoom, WASD/arrows to pan.
- Walk: WASD/arrows or the virtual joystick; Shift runs, Space/Jump jumps. Camera follows the character; dragging rotates the view.
- Click a building to view its OSM name and mapped/estimated height. Go to nearby street chooses an unblocked road point, not a point inside the building. Named places are available under Explore this district.
- Clicking nearby clear ground starts a direct short walk. Building polygons block movement, with wall sliding for manual movement. A blocked direct walk stops with a message; this is not full city-scale pathfinding.
- Return to H2H uses the same-origin app route and preserves the existing account and game saves.

## Data and rendering

`public/game3d/osm/README.md` documents source, bounds, estimation, limitations, attribution and data licensing. The OSM-derived JSON is distributed separately under ODbL and is downloadable in-game. Buildings use generic extruded polygons; many heights are estimates. No third-party imagery or tile screenshots are used.

Projection, polygon collision indexing, edge clipping, safe-street selection and height conversion are in `osmTown3D.ts`. `OSMTownScene3D.tsx` batches building geometry into four colour meshes and roads/parks/water into shared meshes; the map has no per-building render loop. `OSMTownScreen3D.tsx` owns input, city/walk modes, place inspection, mobile HUD and attribution. Character rendering and touch controls reuse existing game components.

The importer and XML conversion scripts are in `scripts/import-osm-town.mts` and `scripts/convert-osm-export.py`. Changing the city dataset does not require changing the shared town database. The current gateway already serves `/game3d` assets and the `/game-3d` query URL, so this feature needs no tunnel restart.

## Verification completed

319 Node tests passed, including seven OSM projection/height/clipping/collision/export checks. Frontend TypeScript, scoped ESLint and the friends production build passed. Browser checks covered the actual exported district, held-key movement with changing geographic coordinates, landmark information and safe-street arrival at Dataran Merdeka, Travel-menu entry, and returning to the original H2H Town with its inventory/cart/multiplayer connection intact.

Touch layouts were inspected at 390×844 and 844×390. The joystick and Jump retain `touch-action: none` and round shapes. A landscape overlap between Jump and zoom controls was corrected and their DOM bounds rechecked. Temporary viewport overrides were reset afterward. This is desktop browser emulation, not a physical phone performance benchmark.

The map remains on the existing public URL with `?world=osm-kl`. No tunnel restart, shared database/world edits, or commits were made. The original 2D route was not changed. Final preview: `/private/tmp/h2h-osm-kuala-lumpur.png`.
