# 3D Third-Person Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standard third-person walking, running, jumping, right-drag camera orbit, wheel zoom, smooth follow, and building-aware camera collision without breaking existing game interactions.

**Architecture:** Keep deterministic input, jump, zoom, and collision math as pure helpers in `cameraControls3D.ts`, then consume those helpers from the existing React Three Fiber player loop. `Game3DScreen` owns browser input and interaction arbitration; `worldLayout` owns explicit camera blocker geometry.

**Tech Stack:** TypeScript, React, React Three Fiber, Three.js, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-17-game-3d-third-person-controls-design.md`

## Global Constraints

- Character remains north-facing at `Math.PI`; camera orbit never changes movement or facing.
- Walk speed is `4.8`; Shift run speed is `8` world units per second.
- Jump velocity is `6.5`; gravity is `-18`; no held-Space auto-repeat.
- Camera pitch stays within `0.25..1.1`; zoom stays within `4.5..12`, default `8.5`.
- Right-drag orbits; short right-click plant actions and left-click tools remain intact.
- Camera collision handles buildings/walls, pulls inward immediately, and eases outward when clear.
- Do not create any git commit unless the user explicitly requests one.

## Review Focus

- Focus loss or opening a modal clears movement, Shift, and Space so input cannot remain stuck.
- Holding Space through landing cannot trigger another jump; releasing and pressing again can.
- A right-button drag suppresses the following plant action, while a short right click still opens it.
- Extreme wheel input clamps zoom without changing yaw or pitch.
- A camera ray above, beside, or starting near a blocker returns a safe deterministic distance without NaN or clipping.

---

### Task 1: Walking, running, fixed facing, and jumping

**Files:**
- Modify: `src/pages/game3d/cameraControls3D.ts`
- Modify: `src/pages/game3d/Game3DScreen.tsx`
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `tests/game3d.test.mjs`

**Interfaces:**
- Produces: `movementVector3D(right: number, forward: number): { x: number; z: number }`.
- Produces: `movementSpeed3D(running: boolean): number` returning exactly `4.8` or `8`.
- Produces: `JumpState3D = { y: number; velocity: number; grounded: boolean }`.
- Produces: `stepJump3D(state: JumpState3D, deltaSeconds: number, jumpPressed: boolean): JumpState3D` using velocity `6.5` and gravity `-18`.

- [ ] **Step 1: Write failing movement and run tests**

Replace the facing-direction tests with assertions that W maps to `{ x: 0, z: -1 }`, S to `{ x: 0, z: 1 }`, A to `{ x: -1, z: 0 }`, D to `{ x: 1, z: 0 }`, zero input stops exactly, diagonal magnitude is `1`, and walk/run speeds are `4.8`/`8`.

- [ ] **Step 2: Write failing jump lifecycle tests**

Assert a grounded press produces positive height/velocity, airborne steps apply gravity, a sufficiently long step lands at `{ y: 0, velocity: 0, grounded: true }`, and `jumpPressed: false` while grounded does not jump. Model held-Space prevention in the consumer with a rising-edge testable helper or explicit Player ref logic.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`

Expected: FAIL because movement, speed, and jump helpers do not exist.

- [ ] **Step 4: Implement pure movement and jump helpers**

Implement the exact interfaces above in `cameraControls3D.ts`. Normalize diagonals, return exact zero components, integrate jump velocity before height, apply gravity each airborne step, and clamp landing to ground.

- [ ] **Step 5: Integrate keyboard, run, and jump**

In `Game3DScreen`, recognize `Shift` and Space alongside existing movement keys and clear them with all controls on blur/pause. In `Player3D`, keep rotation at `Math.PI`, select walk/run speed from Shift, detect a Space rising edge, apply transient jump Y, permit airborne horizontal movement, and use faster limb animation while running.

- [ ] **Step 6: Add touch jump and update control hint**

Add a touch jump button beside the existing mobile D-pad and update the help overlay to mention Shift run and Space jump without changing the hotbar or dialog layout.

- [ ] **Step 7: Verify Task 1 without committing**

Run separately: `node --test tests/game3d.test.mjs`, `npm run type-check`, and `npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.

Expected: every command exits `0`. Record the checkpoint in the execution ledger; do not run `git commit`.

---

### Task 2: Right-drag orbit and wheel zoom

**Files:**
- Modify: `src/pages/game3d/cameraControls3D.ts`
- Modify: `src/pages/game3d/Game3DScreen.tsx`
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `tests/game3d.test.mjs`

**Interfaces:**
- Consumes: Task 1 movement/jump helpers and input set.
- Extends: `CameraControl3D` with requested `distance: number`, initialized to `8.5`.
- Produces: `applyCameraZoom3D(distance: number, wheelDeltaY: number): number` clamped to `4.5..12`.
- Produces: `isSecondaryPointerHeld3D(buttons: number): boolean` checking the right-button bit.

- [ ] **Step 1: Write failing zoom and secondary-button tests**

Assert zoom-in/out changes distance in the expected direction, extreme deltas clamp to `4.5` and `12`, zero delta preserves distance, and secondary-button detection accepts button masks `2` and `3` but rejects `0` and `1`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`

Expected: FAIL because zoom and right-button helpers do not exist.

- [ ] **Step 3: Implement zoom and pointer helpers**

Use `wheelDeltaY * 0.01` for zoom distance change, preserving existing yaw/pitch drag sensitivity and pitch clamp.

- [ ] **Step 4: Move orbit input to right drag**

In `Game3DScreen`, begin camera drag only for mouse button `2`, continue only while the secondary button is held, preserve pointer capture and drag-threshold suppression, and leave short right-click `onContextMenu` actions operational. Add a non-passive wheel handler over the game surface that prevents page scroll and updates requested distance.

- [ ] **Step 5: Use requested camera distance**

In `Player3D`, replace hard-coded `8.5` with `cameraControl.current.distance`; keep independent persistent yaw/pitch and smooth target following during walking and jumping.

- [ ] **Step 6: Verify Task 2 without committing**

Run separately: `node --test tests/game3d.test.mjs`, `npm run type-check`, and `npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.

Expected: every command exits `0`. Record the checkpoint in the execution ledger; do not run `git commit`.

---

### Task 3: Building-aware camera collision

**Files:**
- Modify: `src/pages/game3d/cameraControls3D.ts`
- Modify: `src/pages/game3d/worldLayout.ts`
- Modify: `src/pages/game3d/Game3DScreen.tsx`
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `tests/game3d.test.mjs`

**Interfaces:**
- Consumes: `CameraControl3D.distance` from Task 2.
- Produces: `CameraBlocker3D = { x: number; y: number; z: number; width: number; height: number; depth: number }`.
- Produces: `Position3Like = { x: number; y: number; z: number }`.
- Produces: `CAMERA_BLOCKERS_3D: readonly CameraBlocker3D[]` for both shop buildings, using height `5` and center Y `2.5`.
- Produces: `resolveCameraDistance3D(target: Position3Like, desired: Position3Like, blockers: readonly CameraBlocker3D[], clearance?: number): number` returning the nearest safe target-to-camera distance.

- [ ] **Step 1: Write failing segment/blocker tests**

Assert no blocker returns the full desired distance, a centered building returns a shorter distance before the box, the nearest of two blockers wins, a segment above or beside a blocker stays unchanged, clearance defaults to `0.35`, and near/edge inputs remain finite and at least `1.25`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`

Expected: FAIL because camera blocker data and resolver do not exist.

- [ ] **Step 3: Implement slab-based segment/AABB collision**

In `cameraControls3D.ts`, calculate the entry fraction for the target-to-desired segment against each blocker expanded by clearance, select the smallest valid entry, and return `max(1.25, desiredDistance * entry)`. Invalid or zero-length segments return a finite safe distance.

- [ ] **Step 4: Define building blockers**

In `worldLayout.ts`, export one blocker for each shop using its X/Z footprint, center Y `2.5`, and height `5`; do not include trees. Add `Game3DScreen.tsx` to this task's modified files, pass blockers into `Player3D`, and type the new prop as a readonly blocker list.

- [ ] **Step 5: Integrate immediate pull-in and smooth restore**

Pass blockers to `Player3D`. Compute desired orbit position from the requested zoom, resolve collision distance, snap the effective distance inward when blocked, ease it outward toward the requested distance when clear, and continue existing camera position interpolation and look-at behavior.

- [ ] **Step 6: Run complete automated verification**

Run separately: `npm test`, `npm run type-check`, `npm run build`, and `npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.

Expected: every command exits `0`.

- [ ] **Step 7: Verify complete behavior in the browser**

Check hold/release W/A/S/D, normalized diagonal, Shift walk/run comparison, Space jump and no held-Space repeat, right-drag yaw/pitch, short right-click plant actions, left-click tools, wheel zoom limits, camera follow while walking/jumping, and camera pull-in/restore around both shops.

- [ ] **Step 8: Finish without committing**

Review only the scoped diff and leave every change uncommitted. Report automated and browser evidence plus any remaining limitations; do not stage or commit files.
