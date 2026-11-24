export const CAMERA_DRAG_THRESHOLD_3D = 6;
export const CAMERA_MIN_PITCH_3D = 0.08;
export const CAMERA_MAX_PITCH_3D = 1.25;

export type CameraControl3D = {
  yaw: number;
  pitch: number;
  distance: number;
  dragging: boolean;
};

export type JumpState3D = { y: number; velocity: number; grounded: boolean };
export type Position3Like = { x: number; y: number; z: number };
export type CameraBlocker3D = Position3Like & { width: number; height: number; depth: number };

export function movementVector3D(right: number, forward: number, cameraYaw = Math.PI) {
  const length = Math.hypot(right, forward);
  if (length === 0) return { x: 0, z: 0 };
  const x = (Math.sin(cameraYaw) * forward - Math.cos(cameraYaw) * right) / Math.max(1, length);
  const z = (Math.cos(cameraYaw) * forward + Math.sin(cameraYaw) * right) / Math.max(1, length);
  return { x: Math.abs(x) < 1e-10 ? 0 : x, z: Math.abs(z) < 1e-10 ? 0 : z };
}

export const movementSpeed3D = (running: boolean) => running ? 7.8 : 4.3;

export type InteractionFootprint3D = { x: number; z: number; width?: number; depth?: number };
export function isHighlightedObject3D(center: { x: number; z: number }, target: InteractionFootprint3D) {
  if(target.width && target.depth) {
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
      if(dx===0&&dz===0)continue;
      if(Math.abs(Math.round(center.x)+dx-target.x)<.5+target.width/2 && Math.abs(Math.round(center.z)+dz-target.z)<.5+target.depth/2)return true;
    }
    return false;
  }
  return isSurroundingTile3D(center, `${Math.round(target.x)},${Math.round(target.z)}`);
}

export function isSurroundingTile3D(center: { x: number; z: number }, key: string) {
  const parts = key.split(',');
  if (parts.length !== 2 || parts.some(part => part.trim() === '')) return false;
  const [x, z] = parts.map(Number);
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
  const dx = Math.abs(x - Math.round(center.x));
  const dz = Math.abs(z - Math.round(center.z));
  return dx <= 1 && dz <= 1 && (dx !== 0 || dz !== 0);
}

export const turnToward3D = (yaw: number, target: number, amount: number) =>
  yaw + Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)) * Math.min(1, amount);

export function frontFacingTile3D(position: { x: number; z: number }, yaw = Math.PI) {
  const x = Math.round(position.x);
  const z = Math.round(position.z);
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const tx = Math.abs(dx) < 1e-8 ? Infinity : (x + Math.sign(dx) * 0.5 - position.x) / dx;
  const tz = Math.abs(dz) < 1e-8 ? Infinity : (z + Math.sign(dz) * 0.5 - position.z) / dz;
  const distance = Math.max(0, Math.min(tx, tz)) + 0.00001;
  return {
    x: Math.round(position.x + dx * distance) || 0,
    z: Math.round(position.z + dz * distance) || 0,
  };
}

export const shouldStartJump3D = (spaceHeld: boolean, wasHeld: boolean, grounded: boolean) =>
  spaceHeld && !wasHeld && grounded;

export function stepJump3D(state: JumpState3D, deltaSeconds: number, jumpPressed: boolean): JumpState3D {
  let { y, velocity, grounded } = state;
  if (jumpPressed && grounded) {
    velocity = 6.5;
    grounded = false;
  }
  if (grounded) return { y: 0, velocity: 0, grounded: true };
  y += velocity * deltaSeconds;
  velocity -= 18 * deltaSeconds;
  if (y <= 0 && velocity <= 0) return { y: 0, velocity: 0, grounded: true };
  return { y, velocity, grounded: false };
}

export const isCameraDrag3D = (distance: number) => distance > CAMERA_DRAG_THRESHOLD_3D;

export const clampCameraPitch3D = (pitch: number) =>
  Math.min(CAMERA_MAX_PITCH_3D, Math.max(CAMERA_MIN_PITCH_3D, pitch));

export function applyCameraDrag3D(control: CameraControl3D, deltaX: number, deltaY: number): CameraControl3D {
  return {
    ...control,
    yaw: control.yaw - deltaX * 0.006,
    pitch: clampCameraPitch3D(control.pitch + deltaY * 0.004),
  };
}

export const applyCameraZoom3D = (distance: number, wheelDeltaY: number) =>
  Math.min(12, Math.max(4.5, distance + wheelDeltaY * 0.01));

export const shouldSuppressWorldAction3D = (lastDragAt: number, now: number) =>
  lastDragAt > 0 && now - lastDragAt < 1_000;

export const isSecondaryPointerHeld3D = (buttons: number) => (buttons & 2) === 2;

function segmentAabbEntry3D(
  origin: Position3Like,
  delta: Position3Like,
  blocker: CameraBlocker3D,
  clearance: number,
) {
  let entry = 0;
  let exit = 1;
  const axes = [
    ['x', blocker.width],
    ['y', blocker.height],
    ['z', blocker.depth],
  ] as const;

  for (const [axis, size] of axes) {
    const minimum = blocker[axis] - size / 2 - clearance;
    const maximum = blocker[axis] + size / 2 + clearance;
    const axisDelta = delta[axis];
    if (Math.abs(axisDelta) < 0.000001) {
      if (origin[axis] < minimum || origin[axis] > maximum) return null;
      continue;
    }

    let near = (minimum - origin[axis]) / axisDelta;
    let far = (maximum - origin[axis]) / axisDelta;
    if (near > far) [near, far] = [far, near];
    entry = Math.max(entry, near);
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }

  return exit >= 0 && entry <= 1 ? Math.max(0, entry) : null;
}

export function resolveCameraDistance3D(
  target: Position3Like,
  desired: Position3Like,
  blockers: readonly CameraBlocker3D[],
  clearance = 0.35,
) {
  const delta = {
    x: desired.x - target.x,
    y: desired.y - target.y,
    z: desired.z - target.z,
  };
  const desiredDistance = Math.hypot(delta.x, delta.y, delta.z);
  if (!Number.isFinite(desiredDistance) || desiredDistance <= 0) return 1.25;

  let nearestEntry = 1;
  for (const blocker of blockers) {
    const entry = segmentAabbEntry3D(target, delta, blocker, Math.max(0, clearance));
    if (entry !== null) nearestEntry = Math.min(nearestEntry, entry);
  }
  return Math.max(1.25, desiredDistance * nearestEntry);
}
