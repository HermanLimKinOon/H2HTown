# Custom mirror sculpt, revision 3

Derivative of the MakeHuman Community CC0 body topology, skeleton,
facial targets and modular clothing. See mirror-reference.LICENSE.md and
mirror-mpfb.LICENSE.md for the underlying sources and shirt-artwork credits.

Custom work created in Blender: reshaped chin and cheek planes, almond eyelids,
softened nose, raised mouth corners, warm skin and lip vertex painting, new
curved eyeballs with brown irises and pupils, tapered solid brows, a continuous
scalp/hairline and 42 individually shaped, grooved, overlapping hair clumps.
This is a reference-inspired approximation, not an exact reconstruction or a
downloaded Meshy model. The original reference and MPFB files are retained.

All new parts are rigged to the head and contain the 20 fitted facial morphs.
Four additional fitted targets provide eye tilt and chin angle in both
directions. Eye surfaces and irises follow the eye tilt; chin deformation fades
out before the mouth. These controls default to neutral in existing saves.
The sectioned face editor adds 29 locally authored paired detail brushes for
face proportions, ears, brow, eye placement, nose, lips and jaw. These are H2H
procedural Blender edits to the licensed base, with fitted accessory targets.
The existing character also includes sixteen fitted physique morphs for body
fullness, muscle, shoulders, chest, waist, hips, arms and legs. Regenerate them
after rebuilding the sculpt with `scripts/add-character-physique.py`. Body and
garments share the same smooth deformation; the original base shape is retained.
Skin painting is in the editable SculptSkin colour attribute. Hair, eyes, brows,
clothes and the shirt artwork remain separate and replaceable.

Editable source: assets/characters/mirror-sculpted.blend.
Rebuild with Blender:

    blender --background --factory-startup --python scripts/sculpt-mirror-reference.py -- PROJECT_PATH

The builder reads assets/characters/mirror-reference.blend and writes only the
mirror-sculpted .blend and .glb. It never reads or writes the world farmer model
or the world save. The mirror uses the separate h2h-mirror-sculpted-v3 storage
key; earlier test looks remain stored under their original keys. The character
can now also be selected for the world. Applied appearance and model selection
are stored under h2h-character-selection-v1. The original farmer model and its
saved appearance remain available through the mirror's Original farmer option.
