# Mirror character source

The existing character uses `mirror-sculpted.blend` and
`public/game3d/mirror-sculpted.glb`. Its custom head, eye geometry, vertex-painted
skin, brows and layered hair are editable independently. Rebuild it with:

```sh
blender --background --factory-startup --python scripts/sculpt-mirror-reference.py -- /absolute/path/to/project
```

It reads `mirror-reference.blend` as a starting point and preserves that source.
The shirt artwork remains the replaceable `public/game3d/reference-mountain-shirt.png`.
Settings are separate under `h2h-mirror-sculpted-v3`; earlier reference v1/v2 and
MPFB test looks are retained. The mirror and the selectable new world character
share this model. The original farmer model and its saved appearance are kept.
The mirror offers Existing character and Original farmer; Use selected character
stores the choice under `h2h-character-selection-v1` independently of farm progress.

To rebuild the earlier reference base, add `--reference` after the three path
arguments in the MPFB build command below.

`mirror-mpfb.blend` is the editable Blender source. `public/game3d/mirror-mpfb.glb`
is its browser export. Only `MirrorHumanPreview3D.tsx` loads this model.
The original option continues to use `farmer.glb` and `FarmerModel3D.tsx`.

The source includes hidden MPFB authoring meshes and visible export meshes.
The export meshes have 20 named facial morphs, matching fitted accessory morphs,
and a shared game-engine skeleton. Hair and outfit variants are separate objects.
Use Blender's Outliner to show one hair and one outfit at a time.

To rebuild, download Blender 4.5 LTS, the official MPFB source, and extract the
CC0 system pack linked in `public/game3d/mirror-mpfb.LICENSE.md`. Then run:

```sh
blender --background --factory-startup --python scripts/create-mirror-mpfb.py -- /path/to/mpfb2/src /path/to/extracted/system-assets /absolute/path/to/project
```

The script writes only this Blender source and the mirror GLB. Runtime settings
use localStorage `h2h-mirror-mpfb-v1`; earlier Daniel test looks remain in their
original key. No world save migration is performed. Body height/build are preview
scales; the ten facial sliders use authored morphs. The new character's walk is
defined in `mirrorWalk3D.ts`, farming poses in `customCharacterActions3D.ts`, and
replaceable held-item meshes in `CustomCharacterItem3D.tsx`.

## Physique controls

Run `scripts/add-character-physique.py` in Blender after rebuilding the sculpt.
It adds sixteen fitted shape keys to body and clothing for fullness, muscle,
shoulders, chest, waist, hips, arms and legs without changing the base shape.
The mirror exposes face and physique presets as starting points, with individual
sliders. Missing physique values in old saves default to the original proportions.

The same builder adds paired `eyeTilt` and `chinAngle` shape keys. Eye tilt
rotates the eyelid region and fitted eyeball/iris surfaces together; chin angle
changes the lower-face slope. Both default to neutral for old saves. These are
facial geometry controls, independent of the mirror camera.

## Facial sections and templates

The Face tab groups 41 shape controls into Full Face, Brow, Eyes, Nose, Mouth,
and Jaw & Chin, with four template combinations per section. Section templates
reset only that section's controls; other facial edits, eye colour, physique,
hair and clothing are preserved. The five iris colours are stored with the look.
`FaceSections3D.tsx` displays schematic shape guides, templates and detail sliders.
The additional 29 local facial brushes are authored in
`scripts/add-character-physique.py` and fitted to the shared body/accessory meshes.
Old saves default every new control to its neutral value of 1.

## Independent Blender likeness study

`blender-reference.blend` and `public/game3d/blender-reference.glb` are the
mirror-only reference study. Rebuild entirely locally with:

    blender --background --factory-startup --python scripts/build-blender-reference.py -- PROJECT_PATH --render

The optional render switch writes front, three-quarter and body renders to
`/private/tmp/h2h-blender-reference-*.png`. The script reads the existing sculpt
as a licensed topology/rig starting point, then writes only new reference files.
It uses the user-supplied local reference PNG for measured shape and colour work;
no Meshy mesh, cloud generation, external API, or paid credits are involved.

Choose **Blender reference** in the mirror. It has its own draft storage key,
`h2h-blender-reference-preview-v1`, and cannot be applied to the world. Existing
character selection, model assets and farm progress remain separate. Face/body
targets, modular hair/clothes, the editable rig and a replaceable shirt print are
retained. The source is a likeness approximation, not an exact reconstruction.


## Mirror portrait revision v2

Choose **Blender portrait** in the mirror. This is a separate local Blender approximation, with a reshaped anatomical face, procedural skin/lip colours, fitted continuous hair and fitted sneakers. It retains facial/physique morphs and the walking skeleton. Applying it to the world remains disabled.

Editable master: `blender-reference-v2.blend`. Game asset: `public/game3d/blender-reference-v2.glb`. The high-resolution source hair is reduced for the game export. Builder: `scripts/sculpt-reference-portrait.py`; run with `--draft` to rebuild the source, then `--export-only` to export. The original v1 study and world assets are retained. Drafts use `h2h-blender-reference-preview-v2`.

Licensing and limitations: `public/game3d/blender-reference-v2.LICENSE.md`. The result is an approximation of the supplied illustration, not an exact reconstruction.
