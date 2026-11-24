import { gameAssets } from '../game/assets';
import type { ToolId3D } from './game3d';

export const toolDetails3D: Record<ToolId3D, { name: string; image: string }> = {
  hoe: { name: 'Hoe', image: gameAssets.hoe },
  wateringCan: { name: 'Watering can', image: gameAssets.wateringCan },
  seeds: { name: 'Carrot seeds', image: gameAssets.seeds },
  carrot: { name: 'Carrot', image: gameAssets.carrot },
  petFood: { name: 'Pet food', image: gameAssets.petFood },
  axe: { name: 'Axe', image: gameAssets.axe },
  chicken: {name:'Chicken',image:'game3d/items/chicken.svg'},
  chickenFeed: {name:'Chicken feed',image:'game3d/items/chicken-feed.svg'},
  egg: {name:'Egg',image:'game3d/items/egg.svg'},
  wood: { name: 'Wood', image: gameAssets.wood },
};
