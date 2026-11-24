# Game 3D Tank Controls Design

## Intent

Replace the current camera-relative movement and facing-follow camera with predictable character-relative tank controls and a camera angle controlled only by the player.

## Approved Control Model

- `W` and Arrow Up move forward along the character's facing direction.
- `S` and Arrow Down move backward without changing the character's facing direction.
- `A` and Arrow Left rotate the character left in place.
- `D` and Arrow Right rotate the character right in place.
- The camera follows the character's position but never changes angle because the character turns.
- Holding and dragging left-click orbits the camera.
- Releasing left-click preserves the selected camera yaw and pitch until another drag.
- Short left-clicks continue to use tools and world interactions.

## Approaches

- **Independent orbit with tank movement — selected.** Matches every requested control and keeps camera choice separate from character direction.
- **Fixed world camera with tank movement.** Rejected because it removes manual camera control.
- **Auto-behind camera with tank movement.** Rejected because character turning would change the camera angle.

## Constraints

- Keep existing collision speed, camera pitch limits, click/drag threshold, farming actions, shops, inventory, touch buttons, 2D game, and saved world state unchanged.
- Camera yaw and pitch remain transient session state rather than changing the save format.

## Verification

Pure tests cover forward/backward vectors from facing, rotation direction, and persistent camera orbit. Browser verification confirms each WASD key independently and confirms character rotation does not change the camera angle.
