# Kuala Lumpur–inspired H2H Town

The 3D town now has a stylized Kuala Lumpur visual theme: a twin-tower H2H storefront, heritage shophouses with arched shutter windows and striped awnings, palms, a patterned civic plaza, a redesigned fountain, boulevards/crossings, and a skyline with twin spires, an observation tower, a civic clock tower and elevated monorail scenery.

This is a visual redesign of the existing shared town. Saved object IDs, merchant ownership, plots, positions, rotations, shop catalogues, travel, character controls and network collisions are preserved. No shared layout was overwritten. Built-in H2H gets the twin-tower façade; other active town shops and buildings get heritage façades. Closed plots remain empty and keep their application interaction. Private farms, interiors and the 2D game retain their existing assets.

## Replaceable assets

- `src/pages/game3d/KualaLumpurTown3D.tsx`: reusable geometry for shophouses, twin towers, palms, fountain, streetscape and background city.
- `src/pages/game3d/TownObjectVisual3D.tsx`: maps existing town objects to those visuals.
- `src/pages/game3d/TownWorld3D.tsx`: lighting, paving, decorative skyline and existing interaction routing.
- `public/game3d/town/heritage-*.svg`: separate editor catalogue previews; farm preview files are unchanged.

Background scenery is deliberately outside the playable boundary, decorative and non-interactive. Ground inlays do not intercept navigation clicks. Active shop/tree/fountain geometry continues using existing interaction groups and server footprints. Tall-storefront labels and editor action menus use reachable anchors. Repeated tower bands and window rows use instanced geometry, with low segment counts and no new per-frame animation loops.

Reference direction: Tourism Malaysia's [Kuala Lumpur guide](https://ebrochures.malaysia.travel/en/malaysia-travel-guide/kuala-lumpur/) and [Petronas Twin Towers](https://www.malaysia.travel/explore/petronas-twin-tower). This is an inspired miniature environment, not an exact geographic reconstruction.

## Verification

- 312 Node tests passed, including town editing/placement, independent shops and multiplayer model tests.
- Frontend TypeScript and scoped ESLint passed; friends production build completed.
- Desktop browser rendered the redesigned town, existing owner storefronts and empty plots, active NPCs, shop labels, HUD, and two players online. No browser runtime errors were reported in the inspected log.
- Town editor overview rendered the updated scene. No Town draft was saved and no real merchant application decisions were changed during verification.
- Preview: `/private/tmp/h2h-kuala-lumpur-town.png`.

Rebuilt in place on the current friends server. Refresh the game to load the theme; no tunnel restart or URL change is needed. No commits were made.
