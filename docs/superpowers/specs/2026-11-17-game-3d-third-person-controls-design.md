# 3D Third-Person Controls and Camera Design

## Intent

Replace the current directional-turn controls with familiar third-person movement and camera behavior. Movement, camera orbit, jumping, running, zoom, follow, and camera collision should work together without breaking farming clicks, shops, inventory, hotbar, or saved world state.

This design remains uncommitted until the user explicitly requests a commit.

## Selected approach

Use a standard orbit-camera pattern built into the existing React Three Fiber player loop:

- Hold right mouse and drag to orbit the camera.
- A short right click still opens the existing plant action menu; dragging past the camera threshold suppresses that action.
- Left click remains reserved for tools and world interactions.
- Mouse wheel changes camera distance.
- The camera follows the player independently of character orientation.

Alternatives considered:

1. **Right-drag orbit (selected):** familiar for third-person browser games and compatible with left-click farming.
2. **Pointer-lock free look (rejected):** moving the mouse would always steer the camera, but capturing/releasing the pointer would conflict with inventory, shops, hotbar, and world clicks.
3. **Left-drag orbit (rejected):** already overlaps the main farming/tool action and makes click-versus-drag harder to understand.

## Movement behavior

- The character faces north (`Math.PI`) while walking, strafing, running, jumping, and standing.
- W/Up moves north/forward.
- S/Down moves south/backward.
- A/Left strafes west/left.
- D/Right strafes east/right.
- Holding a movement key continuously moves the character; releasing all movement keys stops horizontal movement immediately.
- Opposing inputs cancel and diagonal input is normalized so it is not faster.
- Walk speed remains `4.8` world units per second.
- Holding either Shift key while moving raises speed to `8` world units per second and increases limb animation rate.
- Existing horizontal world-boundary, tree, pond, and shop collision remains active at walk and run speeds.

## Jump behavior

- Space starts a jump only on the rising key press while grounded; holding Space cannot repeatedly jump on landing.
- Initial upward velocity is `6.5` units per second and gravity is `-18` units per second squared.
- The player can continue horizontal movement while airborne.
- Landing clamps vertical position to ground level and restores grounded state.
- Jump height is transient gameplay state and is not written into the saved player position; saves remain compatible and load on the ground.
- Opening a modal or pausing clears movement and prevents a new jump.

## Camera behavior

- Camera yaw is unlimited and persistent until the next right drag.
- Camera pitch is clamped between `0.25` and `1.1` radians.
- Wheel zoom is clamped between `4.5` and `12` world units, defaulting to `8.5`.
- The camera target follows the player's X/Z position and vertical jump height, aiming at roughly chest height.
- Camera position follows smoothly using the existing exponential interpolation.
- Orbiting or zooming never changes movement direction or character facing.
- Wheel events over the game prevent page scrolling.

## Camera collision

- Shops/buildings are explicit camera blockers represented by axis-aligned 3D boxes using their existing world footprints and a height covering walls and roofs.
- Each frame, test the segment from the player camera target to the desired orbit position against those boxes, expanded by a small camera clearance radius.
- When blocked, move the camera in front of the nearest intersection immediately so it never enters a building.
- When the view clears, ease the camera back toward the requested zoom distance to avoid a sudden outward pop.
- Camera collision does not alter the user's stored zoom preference.
- Trees are not camera blockers in this phase; the request specifically prioritizes buildings and walls, and treating broad tree canopies as solid would cause excessive camera pumping.

## Input and interaction handling

- Keyboard state recognizes W/A/S/D, arrow keys, Shift, and Space and clears on window blur or when a modal pauses the game.
- Right-button camera drag uses pointer capture and the existing drag threshold.
- A short right click remains available to plant actions; a completed camera drag is suppressed from triggering a world action.
- Touch D-pad behavior remains intact. A touch jump button may be added beside it; touch camera gestures and a touch run control are outside this desktop-focused redesign.
- The on-screen help text will describe walk, run, jump, camera orbit, and zoom.

## Code structure

- `cameraControls3D.ts`: pure camera orbit, zoom, jump integration, movement normalization, and camera-blocker intersection helpers.
- `worldLayout.ts`: explicit 3D camera blocker boxes derived from the two shop buildings.
- `Game3DScreen.tsx`: keyboard, right-pointer drag, wheel zoom, and touch jump input wiring.
- `Player3D.tsx`: walk/run speed, north-facing orientation, airborne motion, follow target, zoom, and collision-resolved camera placement.
- `tests/game3d.test.mjs`: behavioral tests for movement normalization, run speed selection, jump lifecycle, zoom clamps, pointer-button state, and nearest camera blocker resolution.

## Verification

- Automated: focused 3D tests, full test suite, TypeScript, production build, and 3D lint.
- Live browser: hold/release movement, diagonal speed, Shift run, Space jump/no auto-repeat, right-drag yaw and pitch, short right-click actions, wheel zoom limits, follow while walking/jumping, and camera pull-in/restore at both shops.

## Non-goals

- No first-person pointer lock.
- No character turning or animation asset replacement.
- No slope, stair, swimming, fall damage, or variable ground height.
- No persistence of camera orbit, zoom, or mid-jump state across reloads.
- No commit until explicitly requested by the user.
