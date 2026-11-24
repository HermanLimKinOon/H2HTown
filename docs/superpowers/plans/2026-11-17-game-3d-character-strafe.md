# 3D Four-Direction Facing Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make W/S/A/D turn the character toward forward/back/left/right before walking while preserving the independent camera.

**Architecture:** A pure movement helper converts right/forward input into a normalized world-space vector and matching facing angle. `Player3D` applies that facing immediately before collision-aware translation.

**Tech Stack:** TypeScript, React, React Three Fiber, Three.js, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-17-game-3d-character-strafe-design.md`

## Global Constraints

- W/Up, S/Down, A/Left, and D/Right face and move in their fixed world directions.
- Character facing updates before translation and does not depend on camera yaw.
- Diagonal movement has the same maximum speed as straight movement.
- Camera orbit behavior remains unchanged.
- Collision movement speed remains `4.8`.

## Review Focus

- Simultaneous W+D input produces a normalized forward-right diagonal.
- Simultaneous A+D input cancels lateral movement.
- Simultaneous W+S input cancels forward movement.
- Each single movement axis returns the matching facing angle.
- No movement input returns an exact zero vector and does not animate walking.

---

### Task 1: Four-direction facing movement

**Files:**
- Modify: `src/pages/game3d/cameraControls3D.ts`
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `tests/game3d.test.mjs`
- Create: `docs/superpowers/specs/2026-11-17-game-3d-character-strafe-design.md`

**Interfaces:**
- Produces: `directionalMovement3D(right: number, forward: number): { x: number; z: number; facing: number | null }`.
- Removes: character-relative strafing; every non-zero movement vector updates facing.

- [ ] **Step 1: Write failing direction-and-facing tests**

Assert W returns negative Z with facing `Math.PI`, S returns positive Z with facing `0`, A returns negative X with facing `-Math.PI / 2`, D returns positive X with facing `Math.PI / 2`, zero axes return a zero vector with null facing, and a forward-right diagonal has magnitude `1` with facing `3 * Math.PI / 4`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`

Expected: FAIL because `directionalMovement3D` does not exist.

- [ ] **Step 3: Implement the pure movement-and-facing helper**

In `cameraControls3D.ts`, implement `directionalMovement3D(right, forward)` by clamping vector magnitude to `1`, mapping X from right and Z from negative forward, and returning `Math.atan2(x, z)` as facing. Zero input returns null facing.

- [ ] **Step 4: Integrate facing-before-walking in `Player3D`**

Compute `right` as D/Right minus A/Left and `forward` as W/Up minus S/Down. Apply the helper's facing immediately for non-zero input, then translate with speed `4.8`; retain collision handling, position saving, and movement animation.

- [ ] **Step 5: Run focused and complete automated verification**

Run separately:

- `node --test tests/game3d.test.mjs`
- `npm test`
- `npm run type-check`
- `npm run build`
- `npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`

Expected: every command exits `0`.

- [ ] **Step 6: Verify controls in the browser**

Confirm W/S/A/D each rotate the character toward the key direction before walking, W+D is not faster than W, collision still blocks obstacles, and orbiting the camera does not change world movement directions.

- [ ] **Step 7: Commit**

```bash
git add src/pages/game3d/cameraControls3D.ts src/pages/game3d/Player3D.tsx tests/game3d.test.mjs docs/superpowers/specs/2026-11-17-game-3d-character-strafe-design.md docs/superpowers/plans/2026-11-17-game-3d-character-strafe.md
git commit -m "fix: face character before directional movement"
```
