import type { Obstacle3 } from './game3d';

export const HOUSE_OBSTACLES_3D: readonly Obstacle3[] = [
  { kind: 'box', x: -6, z: 0, width: 0.3, depth: 12 },
  { kind: 'box', x: 6, z: 0, width: 0.3, depth: 12 },
  { kind: 'box', x: 0, z: -6, width: 12, depth: 0.3 },
  { kind: 'box', x: -3.55, z: 6, width: 4.9, depth: 0.3 },
  { kind: 'box', x: 3.55, z: 6, width: 4.9, depth: 0.3 },
  { kind: 'box', x: -4, z: -3.4, width: 2.2, depth: 3.8 },
  { kind: 'box', x: 3.5, z: -3.8, width: 3, depth: 1.5 },
  { kind: 'box', x: 3.5, z: 0, width: 2.1, depth: 1.5 },
];
