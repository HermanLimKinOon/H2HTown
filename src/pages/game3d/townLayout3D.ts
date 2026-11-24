import type { Obstacle3 } from './game3d';

export const TOWN_BUILDINGS_3D = [
  { id: 'meadow' as const, name: 'Meadow Shop', x: -7, z: -4, color: '#f4d7a0' },
  { id: 'cats' as const, name: 'Cat Shop', x: -7, z: -14, color: '#e6c1b9' },
  { id: 'h2h' as const, name: 'H2H Shop', x: 7, z: -4, color: '#e9dfcf' },
];
export type TownShopId3D = typeof TOWN_BUILDINGS_3D[number]['id'] | `building-${number}`;
export const TOWN_OBSTACLES_3D: readonly Obstacle3[] = [
  ...TOWN_BUILDINGS_3D.map(b => ({ kind: 'box' as const, x: b.x, z: b.z, width: 5, depth: 4 })),
  { kind: 'circle', x: 0, z: -6, radius: 1.9 },
  ...[-14, 14].flatMap(x => [-12, 0, 12].map(z => ({ kind: 'circle' as const, x, z, radius: 0.8 }))),
];
export const TOWN_NPCS_3D = [
  { id: 'guide', name: 'Maya · Town Guide', x: -3, z: 5, color: '#da795d', text: 'Welcome to H2H Town! Visit Meadow Shop to sell your carrots, wood and eggs, or buy chickens and feed. Your private farm is safe while you explore.' },
  { id: 'merchant', name: 'Ben · Merchant', x: -7, z: 0, color: '#6d9c73', text: 'Meadow Shop buys your harvest and sells farming supplies. Open the shop to see current products and prices. Bring your harvest from home!' },
  { id: 'host', name: 'Aina · H2H Host', x: 7, z: 0, color: '#7d8fcb', text: 'The H2H shop displays our product catalogue. Select a product to preview it and add it to your cart.' },
];
