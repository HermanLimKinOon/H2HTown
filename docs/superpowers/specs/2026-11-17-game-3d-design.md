# Separate 3D Game Design

## Intent

Add a playable 3D version of the farming world as a separate website tab while preserving the existing 2D game, its route, assets, behavior, and saved progress.

## Goals

- Add a `Game 3D` navigation item and `/game-3d` route.
- Build a genuine WebGL 3D world with React Three Fiber.
- Provide third-person keyboard movement, a following camera, terrain, trees, buildings, lighting, shadows, and collision boundaries.
- Reuse the visual language of the current world and provide a translucent hotbar with selectable tools.
- Keep 3D files, runtime state, and browser save data separate from the 2D game.
- Use replaceable components so procedural objects can later be exchanged for `.glb` models.

## First Version Scope

The first version is a playable low-poly translation of the current 2D game. It includes:

- A grass meadow, paths, pond, trees, Meadow Shop, and H2H Shop.
- A simple low-poly player character with walking animation.
- WASD and arrow-key movement.
- A smooth third-person camera.
- Collision against the pond, trees, shops, and world boundaries.
- A nine-box overlay: empty hands plus eight assignable-style hotbar slots matching the 2D controls.
- Hoeing grass, planting unlimited carrot seeds, watering each growth stage, harvesting mature carrots, and restoring soil through the nearby action menu.
- Chopping trees with the axe, collecting wood, and staged tree regrowth.
- The 24-slot bag inventory and configurable hotbar assignment flow.
- Meadow Shop buying/selling for coins and the separate H2H product browser/cart interface.
- A clear link back to the 2D game.
- A dedicated local save key for the complete 3D player, farm, inventory, and selected-slot state.

Supabase persistence remains a follow-up integration because the current `game_saves` row is owned by the 2D world and must not be overwritten. The 3D architecture keeps persistence behind a separate adapter so a future schema can store both safely.

## Non-goals

- Converting or deleting the existing `/game` page.
- Sharing save data with the 2D world.
- Automatically turning the existing PNG/SVG art into 3D models.
- Delivering production-quality character models or multiplayer in this first version.

## Isolation and Safety

- Existing `src/pages/game/**`, `/game`, and `h2h-game-world-save` remain unchanged.
- New code lives under `src/pages/game3d/**`.
- The new route is `/game-3d`.
- The initial save key is `h2h-game-3d-save-v1`.
- No Supabase migration is needed for the prototype.

## Technical Approach

### Selected: React Three Fiber

Install `three`, `@react-three/fiber`, and `@react-three/drei`. React Three Fiber fits the existing React application, allows game UI to remain ordinary accessible HTML, and makes later `.glb` replacement straightforward.

### Considered: Raw Three.js

Raw Three.js would reduce framework abstraction but require more lifecycle, resize, input, and cleanup code inside the React application.

### Considered: CSS or 2D faux-3D

This would avoid WebGL dependencies but would not create the navigable 3D world requested.

## Component Structure

- `page.tsx`: route-level page and loading boundary.
- `Game3D.tsx`: screen layout, HUD, saved state, inventory, shops, and canvas.
- `World.tsx`: terrain, props, lights, and collision definitions.
- `Player.tsx`: input, movement, animation, collision, and camera following.
- `Hotbar3D.tsx`: empty-hands cursor plus eight tool slots.
- `game3d.ts`: pure movement, collision, farming, growth, inventory, economy, and save-normalization helpers that can be unit tested without WebGL.

## Controls and User Experience

- WASD or arrow keys move the character.
- Number keys `0–8` select empty hands or a hotbar slot.
- The camera follows behind and above the character while looking toward the direction of travel.
- The HUD explains that this is the 3D prototype and provides a `Back to 2D` link.
- Left-click uses the selected tool on the nearest valid ground cell or world object under the pointer.
- Right-click opens nearby soil or crop actions, matching the 2D interaction model.
- `I` opens the 24-slot bag and hotbar assignment panel.
- On small screens, basic directional touch controls remain available.

## Testing and Verification

- Unit tests cover save isolation, movement clamping, obstacle collision, farming stages, inventory updates, and shop economy.
- TypeScript, the complete existing test suite, and the production build must pass.
- Browser verification confirms both `/game` and `/game-3d` are reachable, the new tab is visible, the player moves, and the existing 2D page still loads.

## Future Expansion

The procedural character, tools, trees, crops, and buildings will be replaceable by `.glb` assets. A later phase can add a separate Supabase 3D save payload without restructuring the renderer or overwriting the 2D save.
