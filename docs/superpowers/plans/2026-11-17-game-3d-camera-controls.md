# Game 3D Camera Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 3D WASD movement camera-relative, keep the follow camera behind the character's facing direction, and support left-button camera drag without triggering world actions.

**Architecture:** A pure `cameraControls3D.ts` module owns direction math and gesture thresholds so the behavior is deterministic under Node tests. `Player3D` consumes the shared camera-control ref for movement, facing, follow, and recentering; `Game3DScreen` owns pointer drag state; `World3D` accepts only click gestures for tool and shop actions.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-17-game-3d-camera-controls-design.md`

## Global Constraints

- Pointer distance `<= 6` pixels is a click; distance `> 6` pixels is a camera drag.
- Camera pitch stays between `0.25` and `1.1` radians.
- Existing 2D files and gameplay state interfaces remain unchanged.
- Existing touch controls and world-action distance checks remain available.

## Review Focus

- Diagonal WASD input must remain normalized rather than moving faster.
- A camera drag must never hoe soil, chop a tree, or open a shop.
- Releasing the mouse must smoothly reduce yaw offset rather than snapping.
- Pointer cancellation and lost capture must end dragging so the camera cannot remain stuck.
- Dialogs must continue to pause player movement and world actions.

---

### Task 1: Camera-relative control math

**Files:**
- Create: `src/pages/game3d/cameraControls3D.ts`
- Modify: `tests/game3d.test.mjs`

**Interfaces:**
- Produces: `CameraControl3D`, `CAMERA_DRAG_THRESHOLD_3D`, `cameraRelativeMovement3D(right, forward, cameraYaw)`, `isCameraDrag3D(distance)`, and `clampCameraPitch3D(pitch)`.
- Consumes: no React or WebGL runtime.

- [ ] **Step 1: Write failing direction and gesture tests**

Assert W at yaw `0` produces `{x: 0, z: 1}`, W at yaw `Math.PI / 2` produces `{x: 1, z: 0}`, diagonal input has unit length, `6` pixels remains a click, values above `6` are drags, and pitch clamps to `0.25..1.1`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`
Expected: FAIL because `cameraControls3D.ts` is absent.

- [ ] **Step 3: Implement the pure control helpers**

Normalize the right/forward vector before rotating it by camera yaw. Export the exact threshold and pitch limits from the module.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/game3d.test.mjs`
Expected: all camera-control and existing 3D tests PASS.

- [ ] **Step 5: Commit the pure controls**

```bash
git add src/pages/game3d/cameraControls3D.ts tests/game3d.test.mjs
git commit -m "feat: add camera-relative 3d control math"
```

### Task 2: Player follow camera and pointer drag integration

**Files:**
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `src/pages/game3d/Game3DScreen.tsx`
- Modify: `src/pages/game3d/World3D.tsx`

**Interfaces:**
- Consumes: Task 1's `CameraControl3D`, `cameraRelativeMovement3D`, `isCameraDrag3D`, and `clampCameraPitch3D`.
- Produces: camera-relative WASD, character-facing follow camera, and click-safe left-button orbit behavior.

- [ ] **Step 1: Add the shared camera-control ref to `Game3DScreen` and `Player3D`**

Initialize yaw offset `0`, pitch `0.65`, and dragging `false`. Pass the ref into `Player3D` without adding it to saved game state.

- [ ] **Step 2: Integrate camera-relative movement and follow**

Convert key input through `cameraRelativeMovement3D`, face the character toward the returned vector, derive the camera position from facing plus yaw offset and pitch, and damp yaw offset toward zero only while not dragging.

- [ ] **Step 3: Add canvas drag handling**

On left-pointer down, capture the pointer and remember its position. After total movement exceeds 6 pixels, update yaw and clamped pitch from incremental movement. End dragging on pointer up, cancellation, or lost capture.

- [ ] **Step 4: Prevent drag gestures from activating world actions**

Replace immediate pointer-down actions in `World3D` with click handlers that reject React Three Fiber events whose `delta` exceeds 6 pixels.

- [ ] **Step 5: Run complete automated verification**

Run: `npm test && npm run type-check && npm run build && npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
Expected: every command exits `0`.

- [ ] **Step 6: Verify in the browser**

Confirm W moves toward the viewed direction, A/D change travel direction without reversed axes, the camera follows behind character facing, dragging orbits without actions, and a short click still uses the selected tool.

- [ ] **Step 7: Commit the integration**

```bash
git add src/pages/game3d/Player3D.tsx src/pages/game3d/Game3DScreen.tsx src/pages/game3d/World3D.tsx docs/superpowers/specs/2026-11-17-game-3d-camera-controls-design.md docs/superpowers/plans/2026-11-17-game-3d-camera-controls.md
git commit -m "feat: add facing-follow 3d camera controls"
```
