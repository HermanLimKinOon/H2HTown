const TILE = 48;

export type WorldRect = { x: number; y: number; width: number; height: number };

export const MEADOW_SHOP: WorldRect = { x: 8 * TILE, y: 9 * TILE - 5, width: 92, height: 84 };
export const H2H_SHOP: WorldRect = { x: 14 * TILE, y: 9 * TILE - 12, width: 120, height: 96 };
export const BUILDINGS = [MEADOW_SHOP, H2H_SHOP] as const;

export function pointHitsBuilding(x: number, y: number, padding = 0) {
  return BUILDINGS.some(building => x >= building.x - padding
    && x <= building.x + building.width + padding
    && y >= building.y - padding
    && y <= building.y + building.height + padding);
}

export function filterTreesOutsideBuildings<T extends readonly [number, number]>(trees: T[], tile = TILE): T[] {
  return trees.filter(([column, row]) => !pointHitsBuilding((column + 0.5) * tile, (row + 0.68) * tile));
}

export function resolveBuildingSafePosition<T extends { x: number; y: number }>(position: T, fallback: T, padding = 11): T {
  return pointHitsBuilding(position.x, position.y + 8, padding) ? fallback : position;
}
