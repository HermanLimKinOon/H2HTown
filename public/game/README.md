# Replacing game artwork

Paths are configured in `src/pages/game/assets.ts`. Replace an SVG with your own
SVG at the same path, or change the configured path to a transparent PNG. Artwork
is loaded locally; it is not generated inside the render loop.

- `items/`: hotbar icons and held hoe/axe/wood. Use a transparent 24×24 square canvas.
  Keep tool handles near the center so the hand attachment stays aligned.
- `tree.svg`: 48×64, trunk at bottom center. Trees are removed by axe slot 6.
- `cottage.svg`: 92×84.
- `h2h-shop.svg`: 120×96. This is the separate clickable H2H product shop.
- `soil.svg`, `soil-watered.svg`, `sprouts.svg`, `water-marker.svg`, `path.svg`:
  48×48 tiles. Sprouts and the water marker overlay the soil, so use transparency.
- `flower.svg`: 8×8. `pond.svg`: 364×240. Keep the pond's oval footprint when
  replacing it, since movement collision uses that shape.
- `grass-texture.jpg`: square repeating background, displayed across eight tiles.
- `walk-{north,east,south,west}.png`: character animation sheets, six 68×68 cells
  arranged horizontally. Timing is specified in `walk-timing.json` in milliseconds.
  To use new GIFs, replace the source GIFs and run
  `swift -module-cache-path /tmp/h2h-swift-cache scripts/prepare-game-sprites.swift public/game`
  from the project root.

The hotbar frame, selection outline, shadows, and action particles are UI styles
and effects in the React/canvas code, rather than image files. Art replacements do
not change item behavior, collision footprints, or save data. Reload after replacing files.

Growth artwork: `carrot-growing.svg` and `carrot-ripe.svg` use 48×48 canvases;
`tree-stump.svg` and `tree-sapling.svg` use 48×64, with the base near the bottom.
Growth defaults are in `src/pages/game/growth.ts`. The inventory timing controls
change seconds per stage for the current save and recalculate existing growth
from each entity's planting/chopping timestamp. At the default 180 seconds,
stage 2 starts at 3 minutes and stage 3 at 6 minutes. Stage 3 remains mature.
Each harvested patch yields one carrot and leaves tilled ground ready to replant.
Carrot growth waits for watering at each stage. Watering starts that stage's timer;
advancing consumes the watering and leaves the next stage dry. Offline time can
advance only one watered stage. Stage 3 is ready to harvest immediately; no additional watering is needed. Tree regrowth
still uses elapsed time without watering.
