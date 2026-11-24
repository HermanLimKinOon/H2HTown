// Replace files at these paths, or change a path to use your own PNG/SVG art.
export const gameAssets = {
  hoe: 'game/items/hoe.svg',
  wateringCan: 'game/items/watering-can.svg',
  seeds: 'game/items/carrot-seeds.svg',
  carrot: 'game/items/carrot.svg',
  petFood: 'game/items/pet-food.svg',
  axe: 'game/items/axe.svg',
  wood: 'game/items/wood.svg',
  tree: 'game/tree.svg',
  stump: 'game/tree-stump.svg',
  sapling: 'game/tree-sapling.svg',
  carrotGrowing: 'game/carrot-growing.svg',
  carrotRipe: 'game/carrot-ripe.svg',
  cottage: 'game/cottage.svg',
  h2hShop: 'game/h2h-shop.svg',
  grass: 'game/grass-texture.jpg',
  soil: 'game/soil.svg',
  wateredSoil: 'game/soil-watered.svg',
  sprouts: 'game/sprouts.svg',
  waterMarker: 'game/water-marker.svg',
  path: 'game/path.svg',
  flower: 'game/flower.svg',
  pond: 'game/pond.svg',
};
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const characterAssets = {
  north: 'game/walk-north.png',
  east: 'game/walk-east.png',
  south: 'game/walk-south.png',
  west: 'game/walk-west.png',
  timing: 'game/walk-timing.json',
};
