# 3D Four-Direction Facing Movement Design

## Intent

Change the 3D game controls so each movement key turns the character toward its direction before walking.

## Goals

- W/Up faces and moves forward.
- S/Down faces and moves backward.
- A/Left faces and moves left.
- D/Right faces and moves right.
- The character snaps to the movement direction before translating.
- Diagonal movement remains normalized to the same speed as straight movement.
- The independent, persistent orbit camera remains unchanged.

## Non-goals

- No separate turn keys or gradual turn animation.
- No camera behavior changes.
- No animation or model redesign.

## Approaches

1. **Four-direction facing movement (selected):** map each movement axis to a fixed world direction and set character facing from that vector before translation. This makes the model visibly turn toward every movement direction.
2. **Character-relative strafe (rejected):** preserve facing while moving sideways. This was superseded by the request for the character to turn before walking.
3. **Camera-relative movement (rejected):** rotate movement when the camera orbits. This would couple movement direction to the independent camera.

## Implementation

Use a directional helper that accepts right and forward axes, normalizes diagonals, maps W to negative Z, S to positive Z, A to negative X, and D to positive X, and returns `Math.atan2(x, z)` as facing. Apply facing immediately before collision-aware translation at speed `4.8`, and animate the limbs whenever input produces translation.

Tests will prove movement and facing for forward, backward, left, right, zero input, and normalized diagonals. The full test, type-check, build, lint, and browser control checks must remain green.
