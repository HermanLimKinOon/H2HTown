import { normalizeHouseLayout3D, resolveHousePlayer3D, type HouseLayout3D } from './houseCustomization3D';
import { normalizeCats3D, type OwnedCat3D } from './cats3D';
import { normalizeChickens3D, POULTRY_RULES_3D, type Chicken3D } from './poultry3D';
import { freshFarmLayout3D, normalizeFarmLayout3D, farmHouseExit3D, farmObstacles3D, rotateFarmOffset3D, getFarmHouses3D, type FarmLayout3D } from './farmCustomization3D';

export const GAME_3D_SAVE_KEY = 'h2h-game-3d-save-v1';

export type Position3 = { x: number; y: number; z: number };
export type WorldId3D = 'farm' | 'town' | 'house';

export type FarmerAppearance3D = {
  name: string; skin: string; hair: string; shirt: string; denim: string; boots: string; hatColor: string;
  hairStyle: 'short' | 'bob' | 'curly' | 'bald'; hat: boolean; height: number; build: number;
};
export const DEFAULT_FARMER_APPEARANCE_3D: FarmerAppearance3D = {
  name: 'Farmer', skin: '#cb9065', hair: '#513727', shirt: '#f4e7c6', denim: '#386a93',
  boots: '#68452f', hatColor: '#e9bd63', hairStyle: 'short', hat: true, height: 1, build: 1,
};
export function normalizeAppearance3D(value: unknown): FarmerAppearance3D {
  const input = value && typeof value === 'object' ? value as Partial<FarmerAppearance3D> : {};
  const result = { ...DEFAULT_FARMER_APPEARANCE_3D };
  for (const key of ['skin', 'hair', 'shirt', 'denim', 'boots', 'hatColor'] as const) {
    if (typeof input[key] === 'string' && /^#[0-9a-f]{6}$/i.test(input[key])) result[key] = input[key];
  }
  if (typeof input.name === 'string' && input.name.trim()) result.name = input.name.trim().slice(0, 32);
  if (['short', 'bob', 'curly', 'bald'].includes(input.hairStyle)) result.hairStyle = input.hairStyle;
  if (typeof input.hat === 'boolean') result.hat = input.hat;
  if (typeof input.height === 'number' && Number.isFinite(input.height)) result.height = Math.min(1.15, Math.max(0.85, input.height));
  if (typeof input.build === 'number' && Number.isFinite(input.build)) result.build = Math.min(1.2, Math.max(0.8, input.build));
  return result;
}

export type CircleObstacle3 = { kind: 'circle'; x: number; z: number; radius: number };
export type BoxObstacle3 = { kind: 'box'; x: number; z: number; width: number; depth: number };
export type Obstacle3 = CircleObstacle3 | BoxObstacle3;

export type ToolId3D = 'hoe' | 'wateringCan' | 'seeds' | 'carrot' | 'petFood' | 'axe' | 'wood' | 'chicken' | 'chickenFeed' | 'egg';
export type Hotbar3D = [ToolId3D | null, ToolId3D | null, ToolId3D | null, ToolId3D | null, ToolId3D | null, ToolId3D | null, ToolId3D | null, ToolId3D | null];
export type CropStage3D = 1 | 2 | 3;
export type FarmCell3D = { watered: boolean };
export type CarrotPlant3D = { stage: CropStage3D; watered: boolean; wateredAt: number | null };
export type TreeState3D = { choppedAt: number; stage: CropStage3D };

export type Game3DSave = {
  version: 1;
  player: Position3;
  worldId: WorldId3D;
  interiorHouseId: string;
  worldPositions: Record<WorldId3D, Position3>;
  appearance: FarmerAppearance3D;
  inventory: { carrot: number; wood: number; petFood: number; seeds: '∞'; chicken:number; chickenFeed:number; egg:number };
  chickens: Chicken3D[];
  cats: OwnedCat3D[];
  houseLayouts: Record<string,HouseLayout3D>;
  coins: number;
  sharedFarmHarvests: Record<string,number>;
  selectedSlot: number | 'cursor';
  hotbar: Hotbar3D;
  bag: (ToolId3D | null)[];
  growth: { carrotSeconds: number; treeSeconds: number; eggSeconds:number };
  soil: Record<string, FarmCell3D>;
  plants: Record<string, CarrotPlant3D>;
  choppedTrees: Record<string, number>;
  farmLayout: FarmLayout3D;
  farmPausedAt: number | null;
};

const START_POSITION: Position3 = { x: 0, y: 0, z: 8 };
const DEFAULT_HOTBAR: Hotbar3D = ['hoe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'axe', 'wood', null];

export function freshGame3DSave(): Game3DSave {
  return {
    version: 1,
    player: { ...START_POSITION },
    worldId: 'farm',
    interiorHouseId: 'house',
    appearance: { ...DEFAULT_FARMER_APPEARANCE_3D },
    worldPositions: { farm: { ...START_POSITION }, town: { x: 0, y: 0, z: 8 }, house: { x: 0, y: 0, z: 3.5 } },
    inventory: { carrot: 0, wood: 0, petFood: 3, seeds: '∞', chicken:0, chickenFeed:0, egg:0 },
    chickens: [],
    cats: [],
    houseLayouts: {},
    coins: 0,
    sharedFarmHarvests: {},
    selectedSlot: 0,
    hotbar: [...DEFAULT_HOTBAR],
    bag: [...DEFAULT_HOTBAR.slice(0, 7), ...Array.from({ length: 17 }, () => null)],
    growth: { carrotSeconds: 180, treeSeconds: 180, eggSeconds:POULTRY_RULES_3D.eggSeconds },
    soil: {},
    plants: {},
    choppedTrees: {},
    farmLayout: freshFarmLayout3D(),
    farmPausedAt: null,
  };
}

const isFinitePosition = (value: unknown): value is Position3 => {
  if (!value || typeof value !== 'object') return false;
  const position = value as Position3;
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
};

const count = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

const isToolId3D = (value: unknown): value is ToolId3D =>
  typeof value === 'string' && ['hoe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'axe', 'wood', 'chicken', 'chickenFeed', 'egg'].includes(value);

const normalizeHotbar3D = (value: unknown, fallback: Hotbar3D): Hotbar3D => {
  if (!Array.isArray(value) || value.length !== 8 || !value.every(item => item === null || isToolId3D(item))) return [...fallback];
  const items = value.filter(isToolId3D);
  return new Set(items).size === items.length ? [...value] as Hotbar3D : [...fallback];
};

const normalizeBag3D = (value: unknown, fallback: (ToolId3D | null)[]) =>
  Array.isArray(value) && value.length === 24 && value.every(item => item === null || isToolId3D(item)) ? [...value] : [...fallback];

const isGridKey = (key: string) => /^-?\d+,-?\d+$/.test(key);

export function normalizeGame3DSave(value: unknown, now = Date.now()): Game3DSave {
  const fresh = freshGame3DSave();
  if (!value || typeof value !== 'object') return fresh;
  const input = value as Partial<Game3DSave>;
  const soil: Game3DSave['soil'] = {};
  if (input.soil && typeof input.soil === 'object') {
    for (const [key, cell] of Object.entries(input.soil)) {
      if (isGridKey(key) && cell && typeof cell.watered === 'boolean') soil[key] = { watered: cell.watered };
    }
  }
  const plants: Game3DSave['plants'] = {};
  if (input.plants && typeof input.plants === 'object') {
    for (const [key, plant] of Object.entries(input.plants)) {
      if (!isGridKey(key) || !plant || ![1, 2, 3].includes(plant.stage) || typeof plant.watered !== 'boolean') continue;
      if (plant.wateredAt !== null && !(typeof plant.wateredAt === 'number' && Number.isFinite(plant.wateredAt))) continue;
      plants[key] = { stage: plant.stage, watered: plant.watered, wateredAt: plant.wateredAt };
    }
  }
  const choppedTrees: Game3DSave['choppedTrees'] = {};
  if (input.choppedTrees && typeof input.choppedTrees === 'object') {
    for (const [key, choppedAt] of Object.entries(input.choppedTrees)) {
      if (/^tree-\d+$/.test(key) && typeof choppedAt === 'number' && Number.isFinite(choppedAt) && choppedAt >= 0) choppedTrees[key] = choppedAt;
    }
  }
  const duration = (durationValue: unknown, fallback: number) => typeof durationValue === 'number' && Number.isFinite(durationValue) && durationValue >= 1 ? durationValue : fallback;
  const selectedSlot = input.selectedSlot === 'cursor' || (Number.isInteger(input.selectedSlot) && Number(input.selectedSlot) >= 0 && Number(input.selectedSlot) < 8) ? input.selectedSlot : fresh.selectedSlot;
  const farmLayout = normalizeFarmLayout3D(input.farmLayout);
  const normalized: Game3DSave = {
    ...fresh,
    appearance: normalizeAppearance3D(input.appearance),
    player: isFinitePosition(input.player) ? { ...input.player } : fresh.player,
    interiorHouseId: typeof input.interiorHouseId==='string' && farmLayout.buildings[input.interiorHouseId]?.style==='cottage' ? input.interiorHouseId : 'house',
    worldId: input.worldId === 'town' || input.worldId === 'house' ? input.worldId : 'farm',
    worldPositions: {
      farm: isFinitePosition(input.worldPositions?.farm) ? { ...input.worldPositions.farm } : { ...START_POSITION },
      town: isFinitePosition(input.worldPositions?.town) ? { ...input.worldPositions.town } : { x: 0, y: 0, z: 8 },
      house: isFinitePosition(input.worldPositions?.house) ? { ...input.worldPositions.house } : { x: 0, y: 0, z: 3.5 },
    },
    inventory: {
      carrot: count(input.inventory?.carrot, fresh.inventory.carrot),
      wood: count(input.inventory?.wood, fresh.inventory.wood),
      petFood: count(input.inventory?.petFood, fresh.inventory.petFood),
      chicken:count(input.inventory?.chicken,0),
      chickenFeed:count(input.inventory?.chickenFeed,0),
      egg:count(input.inventory?.egg,0),
      seeds: '∞',
    },
    houseLayouts:Object.fromEntries(getFarmHouses3D(farmLayout).flatMap(house=>input.houseLayouts?.[house.id]?[[house.id,normalizeHouseLayout3D(input.houseLayouts[house.id])]]:[])),
    cats:normalizeCats3D(input.cats,getFarmHouses3D(farmLayout).map(house=>house.id),now),
    chickens: normalizeChickens3D(input.chickens,farmLayout.buildings,now),
    coins: count(input.coins, fresh.coins),
    sharedFarmHarvests: Object.fromEntries(Object.entries(input.sharedFarmHarvests??{}).filter(([id,n])=>id.length<=100&&Number.isSafeInteger(n)&&n>=0).slice(0,100)),
    selectedSlot,
    hotbar: normalizeHotbar3D(input.hotbar, fresh.hotbar),
    bag: normalizeBag3D(input.bag, fresh.bag),
    growth: {
      carrotSeconds: duration(input.growth?.carrotSeconds, fresh.growth.carrotSeconds),
      treeSeconds: duration(input.growth?.treeSeconds, fresh.growth.treeSeconds),
      eggSeconds: duration(input.growth?.eggSeconds, fresh.growth.eggSeconds),
    },
    soil,
    plants,
    choppedTrees,
    farmLayout,
    farmPausedAt: typeof input.farmPausedAt === 'number' && Number.isFinite(input.farmPausedAt) && input.farmPausedAt >= 0 && input.farmPausedAt <= now ? input.farmPausedAt : null,
  };
  return resolveHousePlayer3D(resolveFarmPlayerPosition3D(resumeFarmTime3D(normalized, now)));
}

export const WORLD_3D_LIMIT = 24;

export function walkThroughHouseDoor3D(state: Game3DSave, player: Position3): Game3DSave {
  const moved = { ...state, player };
  if(state.worldId==='farm')for(const house of getFarmHouses3D(state.farmLayout)) {
    const local=rotateFarmOffset3D(player.x-house.x,player.z-house.z,-house.rotation);
    if(Math.abs(local.x)<.65&&local.z>2&&local.z<3) {
      const entered=travelWorld3D(moved,'house');
      return {...entered,interiorHouseId:house.id,player:{x:0,y:0,z:3.5},worldPositions:{...entered.worldPositions,farm:farmHouseExit3D(state.farmLayout,house.id)}};
    }
  }
  if(state.worldId==='house'&&Math.abs(player.x)<.8&&player.z>5.1)return {...travelWorld3D(moved,'farm'),player:farmHouseExit3D(state.farmLayout,state.interiorHouseId)};
  return moved;
}

export function travelWorld3D(state: Game3DSave, destination: WorldId3D): Game3DSave {
  if (state.worldId === destination) return state;
  return {
    ...state,
    worldId: destination,
    player: { ...state.worldPositions[destination] },
    worldPositions: { ...state.worldPositions, [state.worldId]: { ...state.player } },
  };
}
export const PLAYER_3D_RADIUS = 0.45;

export function isPositionBlocked(position: Position3, obstacles: readonly Obstacle3[]): boolean {
  if (Math.abs(position.x) > WORLD_3D_LIMIT - PLAYER_3D_RADIUS || Math.abs(position.z) > WORLD_3D_LIMIT - PLAYER_3D_RADIUS) return true;
  return obstacles.some(obstacle => {
    if (obstacle.kind === 'circle') {
      return Math.hypot(position.x - obstacle.x, position.z - obstacle.z) < obstacle.radius + PLAYER_3D_RADIUS;
    }
    return Math.abs(position.x - obstacle.x) < obstacle.width / 2 + PLAYER_3D_RADIUS
      && Math.abs(position.z - obstacle.z) < obstacle.depth / 2 + PLAYER_3D_RADIUS;
  });
}

export function movePlayer(position: Position3, delta: Position3, obstacles: readonly Obstacle3[]): Position3 {
  const maxAxis = Math.max(Math.abs(delta.x), Math.abs(delta.z));
  const length = Math.hypot(delta.x, delta.z);
  const scale = length > 0 ? maxAxis / length : 0;
  const dx = delta.x * scale;
  const dz = delta.z * scale;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  const stepX = dx / steps;
  const stepZ = dz / steps;
  const next = { ...position };

  for (let step = 0; step < steps; step += 1) {
    const xCandidate = { ...next, x: next.x + stepX };
    if (!isPositionBlocked(xCandidate, obstacles)) next.x = xCandidate.x;
    const zCandidate = { ...next, z: next.z + stepZ };
    if (!isPositionBlocked(zCandidate, obstacles)) next.z = zCandidate.z;
  }
  return next;
}

export type GameAction3D = { state: Game3DSave; changed: boolean; message: string };

export function getCropStage3D(plant: CarrotPlant3D, secondsPerStage: number, now: number): CarrotPlant3D {
  if (plant.stage >= 3 || !plant.watered || plant.wateredAt === null) return { ...plant };
  if (now - plant.wateredAt < secondsPerStage * 1000) return { ...plant };
  return { stage: (plant.stage + 1) as CropStage3D, watered: false, wateredAt: null };
}

export function waterCrop3D(plant: CarrotPlant3D, now: number): CarrotPlant3D {
  if (plant.watered || plant.stage >= 3) return { ...plant };
  return { ...plant, watered: true, wateredAt: now };
}

const unchanged = (state: Game3DSave, message: string): GameAction3D => ({ state, changed: false, message });

export function applyTool3D(state: Game3DSave, tool: ToolId3D | null, key: string, now: number): GameAction3D {
  if (tool === 'hoe') {
    if (state.soil[key] || state.plants[key]) return unchanged(state, 'This ground is already tilled');
    return { state: { ...state, soil: { ...state.soil, [key]: { watered: false } } }, changed: true, message: 'Soil tilled' };
  }
  if (tool === 'seeds') {
    if (!state.soil[key]) return unchanged(state, 'Till the grass before planting');
    if (state.plants[key]) return unchanged(state, 'This patch is already planted');
    const plant: CarrotPlant3D = { stage: 1, watered: false, wateredAt: null };
    return { state: { ...state, plants: { ...state.plants, [key]: plant } }, changed: true, message: 'Carrot seeds planted' };
  }
  if (tool === 'wateringCan') {
    const current = state.plants[key];
    if (!current) return unchanged(state, 'Plant seeds before watering');
    const plant = waterCrop3D(getCropStage3D(current, state.growth.carrotSeconds, now), now);
    if (plant.watered === current.watered && plant.wateredAt === current.wateredAt && plant.stage === current.stage) return unchanged(state, 'This patch does not need water');
    return {
      state: { ...state, soil: { ...state.soil, [key]: { watered: plant.watered } }, plants: { ...state.plants, [key]: plant } },
      changed: true,
      message: 'Crop watered',
    };
  }
  return unchanged(state, 'Select a farming tool');
}

export function harvestCrop3D(state: Game3DSave, key: string, now: number): GameAction3D {
  const stored = state.plants[key];
  if (!stored) return unchanged(state, 'No crop to harvest');
  const plant = getCropStage3D(stored, state.growth.carrotSeconds, now);
  if (plant.stage !== 3) return unchanged(state, 'Carrot is not ready');
  const plants = { ...state.plants };
  delete plants[key];
  return {
    state: { ...state, plants, inventory: { ...state.inventory, carrot: state.inventory.carrot + 1 } },
    changed: true,
    message: '+1 carrot',
  };
}

export function getTreeStage3D(choppedAt: number, secondsPerStage: number, now: number): CropStage3D {
  const elapsedStages = Math.floor(Math.max(0, now - choppedAt) / (secondsPerStage * 1000));
  return Math.min(3, elapsedStages + 1) as CropStage3D;
}

export function chopTree3D(state: Game3DSave, key: string, now: number): GameAction3D {
  const choppedAt = state.choppedTrees[key];
  if (typeof choppedAt === 'number' && getTreeStage3D(choppedAt, state.growth.treeSeconds, now) < 3) {
    return unchanged(state, 'This tree is still growing');
  }
  return {
    state: {
      ...state,
      inventory: { ...state.inventory, wood: state.inventory.wood + 1 },
      choppedTrees: { ...state.choppedTrees, [key]: now },
    },
    changed: true,
    message: '+1 wood',
  };
}

export function assignHotbar3D(hotbar: Hotbar3D, targetIndex: number, item: ToolId3D): Hotbar3D {
  if (targetIndex < 0 || targetIndex >= hotbar.length) return [...hotbar];
  const next = [...hotbar] as Hotbar3D;
  const oldIndex = next.indexOf(item);
  const displaced = next[targetIndex];
  next[targetIndex] = item;
  if (oldIndex >= 0 && oldIndex !== targetIndex) next[oldIndex] = displaced;
  return next;
}

export function sellItem3D(state: Game3DSave, item: 'carrot' | 'wood' | 'egg', quantity: number): GameAction3D {
  const amount = Math.max(0, Math.floor(quantity));
  if (amount < 1 || state.inventory[item] < amount) return unchanged(state, `Not enough ${item}`);
  if(!Number.isFinite(amount))return unchanged(state,'Choose a valid quantity');
  const price = item === 'egg' ? POULTRY_RULES_3D.eggSell : item === 'carrot' ? 5 : 1;
  return {
    state: {
      ...state,
      coins: state.coins + amount * price,
      inventory: { ...state.inventory, [item]: state.inventory[item] - amount },
    },
    changed: true,
    message: `Sold ${amount} ${item}`,
  };
}

export function buyPetFood3D(state: Game3DSave): GameAction3D {
  if (state.coins < 10) return unchanged(state, 'Not enough coins');
  return {
    state: {
      ...state,
      coins: state.coins - 10,
      inventory: { ...state.inventory, petFood: state.inventory.petFood + 1 },
    },
    changed: true,
    message: 'Bought 1 pet food',
  };
}


export function pauseFarmTime3D(state: Game3DSave, now: number): Game3DSave {
  return state.farmPausedAt !== null || (state.worldId !== 'farm'&&state.worldId !== 'house') ? state : {...state,farmPausedAt:now};
}
export function resumeFarmTime3D(state: Game3DSave, now: number): Game3DSave {
  if(state.farmPausedAt===null)return state;
  const elapsed=Math.max(0,now-state.farmPausedAt);
  return {...state,farmPausedAt:null,
    plants:Object.fromEntries(Object.entries(state.plants).map(([key,plant])=>[key,{...plant,wateredAt:plant.wateredAt===null?null:plant.wateredAt+elapsed}])),
    cats:state.cats.map(cat=>cat.rest?{...cat,rest:{...cat.rest,updatedAt:cat.rest.updatedAt+elapsed}}:cat),
    chickens:state.chickens.map(chicken=>({...chicken,fedAt:chicken.fedAt===null?null:chicken.fedAt+elapsed})),
    choppedTrees:Object.fromEntries(Object.entries(state.choppedTrees).map(([key,time])=>[key,time+elapsed])),
  };
}


// Editing can cover the hidden player's tile. Resume at the nearest clear tile.
export function resolveFarmPlayerPosition3D(state: Game3DSave): Game3DSave {
  if(state.worldId!=='farm')return state;
  const obstacles=farmObstacles3D(state.farmLayout);
  if(!isPositionBlocked(state.player,obstacles))return state;
  const candidates: Position3[]=[];
  for(let x=-23;x<=23;x++)for(let z=-23;z<=23;z++)candidates.push({x,y:0,z});
  candidates.sort((a,b)=>Math.hypot(a.x-state.player.x,a.z-state.player.z)-Math.hypot(b.x-state.player.x,b.z-state.player.z));
  const player=candidates.find(point=>!isPositionBlocked(point,obstacles));
  return player?{...state,player,worldPositions:{...state.worldPositions,farm:{...player}}}:state;
}
