# Game 3D Tank Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace camera-relative 3D movement with character-relative tank controls and keep camera orbit independent and persistent.

**Architecture:** Pure helpers in `cameraControls3D.ts` compute forward/backward movement and left/right facing rotation. `Player3D` uses character facing for movement and a separate absolute camera yaw for camera placement; `Game3DScreen` owns that transient yaw and existing mouse-drag gesture state.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-17-game-3d-tank-controls-design.md`

## Global Constraints

- W/Up moves forward and S/Down moves backward along character facing.
- A/Left rotates left in place and D/Right rotates right in place.
- Character turning never changes camera yaw or pitch.
- Released mouse drag preserves camera yaw and pitch.
- Existing 6-pixel drag threshold, camera pitch limits, action suppression, collision speed, farming, touch controls, and 2D behavior remain unchanged.

## Review Focus

- Simultaneous W+A must move along the changing character facing without diagonal speed gain.
- S must move backward without reversing character facing.
- A/D must rotate without translating the player.
- Camera drag must remain persistent after release and must not trigger world actions.
- Opposing keys W+S or A+D must cancel cleanly.

---

### Task 1: Tank movement and independent orbit camera

**Files:**
- Modify: `src/pages/game3d/cameraControls3D.ts`
- Modify: `src/pages/game3d/Player3D.tsx`
- Modify: `src/pages/game3d/Game3DScreen.tsx`
- Modify: `tests/game3d.test.mjs`
- Create: `docs/superpowers/specs/2026-11-17-game-3d-tank-controls-design.md`

**Interfaces:**
- Produces: `characterMovement3D(facing, amount)`, `rotateCharacterFacing3D(facing, turn, deltaSeconds)`, and absolute `CameraControl3D.yaw`.
- Removes internal use of camera-relative movement and automatic yaw recentering.

- [ ] **Step 1: Write failing tank-control tests**

Assert facing `0` plus forward `1` produces `{x: 0, z: 1}`, backward `-1` produces `{x: 0, z: -1}`, facing `Math.PI / 2` plus forward produces positive X, positive left-turn input rotates a north-facing character toward negative X, zero/opposing input causes no movement or rotation, and camera drag updates persistent absolute yaw.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/game3d.test.mjs`
Expected: FAIL because the tank-control helpers do not exist and camera state is still relative.

- [ ] **Step 3: Implement pure tank-control helpers**

Use `2.5` radians per second as rotation speed. Normalize facing to `-Math.PI..Math.PI`; movement magnitude is `Math.abs(amount)` and direction changes only from facing and the sign of amount.

- [ ] **Step 4: Integrate character-relative movement**

In `Player3D`, compute turn as left minus right, update facing from turn and frame delta, compute movement from W/S only, keep collision speed `4.8`, and animate limbs only while translating.

- [ ] **Step 5: Make camera yaw absolute and persistent**

Initialize yaw to `Math.PI`, use it directly for camera position, update it only from mouse drag, and remove all facing-based yaw updates and post-release recentering.

- [ ] **Step 6: Run complete automated verification**

Run separately: `npm test`, `npm run type-check`, `npm run build`, and `npx eslint src/pages/game3d --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.
Expected: every command exits `0`.

- [ ] **Step 7: Verify in the browser**

Test W, S, A, and D independently; confirm A/D rotate in place, W/S follow character facing, camera does not rotate when character turns, left-drag changes camera angle persistently, drag does not activate a tool, and short click still does.

- [ ] **Step 8: Commit**

```bash
git add src/pages/game3d/cameraControls3D.ts src/pages/game3d/Player3D.tsx src/pages/game3d/Game3DScreen.tsx tests/game3d.test.mjs docs/superpowers/specs/2026-11-17-game-3d-tank-controls-design.md docs/superpowers/plans/2026-11-17-game-3d-tank-controls.md
git commit -m "fix: use tank movement with independent camera"
```
