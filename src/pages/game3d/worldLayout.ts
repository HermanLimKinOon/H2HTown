import type { CameraBlocker3D } from './cameraControls3D';

export type Shop3DLayout = { id: 'meadow' | 'h2h'; name: string; x: number; z: number; width: number; depth: number; color: string };
export type Tree3DLayout = { id: string; x: number; z: number };

export const SHOPS_3D: Shop3DLayout[] = [
  { id: 'h2h', name: 'My House', x: 7, z: -2, width: 5, depth: 4, color: '#f6eee0' },
];

export const CAMERA_BLOCKERS_3D: readonly CameraBlocker3D[] = SHOPS_3D.map(shop => ({
  x: shop.x,
  y: 2.5,
  z: shop.z,
  width: shop.width,
  height: 5,
  depth: shop.depth,
}));

export const POND_3D = { kind: 'circle' as const, x: 16, z: -7, radius: 4.2 };

export const PATHS_3D = [
  { id: 'main', x: 0, z: 2, width: 3, depth: 30 },
  { id: 'shops', x: 0, z: 1, width: 20, depth: 2.6 },
];

export const LAND_TILE_SIZE_3D = 1;
export const LAND_TILES_3D = Array.from({ length: 49 }, (_, row) =>
  Array.from({ length: 49 }, (_, column) => {
    const x = column - 24;
    const z = row - 24;
    const path = PATHS_3D.some(area =>
      Math.abs(x - area.x) < area.width / 2 && Math.abs(z - area.z) < area.depth / 2);
    return { key: `${x},${z}`, x, z, terrain: path ? 'path' as const : 'grass' as const };
  }),
).flat();

export const FARM_CELLS_3D = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 9 }, (_, column) => ({
    key: `${column - 4},${row + 10}`,
    x: column - 4,
    z: row + 10,
  })),
).flat();

const treeCoordinates: Array<[number, number]> = [
  [-18, -14], [-15, -15], [-12, -14], [-18, -10], [-14, -10], [-10, -11],
  [-18, 1], [-16, 4], [-19, 8], [-15, 9], [-12, 7],
  [12, -16], [16, -16], [20, -14], [12, -11], [21, -9],
  [17, 2], [20, 4], [14, 6], [18, 9], [21, 12],
  [-20, 17], [-16, 19], [-11, 18], [11, 18], [15, 20], [20, 18],
];

export const TREE_POSITIONS_3D: Tree3DLayout[] = treeCoordinates.map(([x, z], index) => ({ id: `tree-${index + 1}`, x, z }));

export const WORLD_3D_OBSTACLES = [
  ...SHOPS_3D.map(shop => ({ kind: 'box' as const, x: shop.x, z: shop.z, width: shop.width, depth: shop.depth })),
  POND_3D,
  ...TREE_POSITIONS_3D.map(tree => ({ kind: 'circle' as const, x: tree.x, z: tree.z, radius: 0.72 })),
];

export function isDiggableGrass3D(key: string) {
  const tile = LAND_TILES_3D.find(cell => cell.key === key);
  if (!tile || tile.terrain !== 'grass') return false;
  return !WORLD_3D_OBSTACLES.some(obstacle => obstacle.kind === 'box'
    ? Math.abs(tile.x - obstacle.x) <= obstacle.width / 2 && Math.abs(tile.z - obstacle.z) <= obstacle.depth / 2
    : Math.hypot(tile.x - obstacle.x, tile.z - obstacle.z) <= obstacle.radius + 0.5);
}
