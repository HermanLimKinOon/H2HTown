# Game 3D Camera Controls Design

## Intent

Make the 3D player controls behave like a modern third-person game: movement is predictable from the current view, the character faces travel, and the camera follows behind the character while still allowing temporary mouse orbit control.

## Approved Behavior

- WASD and arrow movement is relative to the current camera heading.
- The character rotates toward the actual movement direction.
- The camera smoothly follows behind the direction the character faces.
- Holding and dragging the left mouse button over the 3D canvas temporarily changes camera yaw and pitch.
- Releasing the mouse smoothly recenters camera yaw behind the character.
- Camera pitch is clamped so the view cannot go underground or directly overhead.
- Pointer movement of 6 pixels or less remains a normal click and uses the selected tool or world interaction.
- Pointer movement greater than 6 pixels is a camera drag and must not activate a tool, tree, farm cell, or shop.

## Approaches Considered

- **Camera-relative movement with auto-follow — selected.** Matches the requested follow behavior while keeping WASD intuitive.
- **Free orbit.** Rejected because the camera would no longer reliably follow the character's facing direction.
- **Tank controls.** Rejected because A/D turning is less natural for the existing farming interactions.

## Scope

Only the 3D player, camera, and canvas pointer interactions change. The 2D game, farming rules, saves, inventory, shops, keyboard shortcuts, and touch movement controls remain unchanged.

## Verification

Pure tests cover camera-relative direction, diagonal normalization, the 6-pixel click/drag boundary, and pitch clamping. Browser verification covers WASD facing, camera follow, drag orbit, and click-versus-drag interaction.
