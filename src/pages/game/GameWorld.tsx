import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import supabase from '@/lib/supabase';
import Hotbar from './Hotbar';
import ShopDialog from './ShopDialog';
import H2HShopDialog from './H2HShopDialog';
import { defaultGrowth, growthState, carrotState, carrotRemaining, timeLabel, type CarrotPlant, type GrowthSettings } from './growth';
import { assetUrl, gameAssets, characterAssets } from './assets';
import { buyPetFood, sellCarrots, sellWood } from './economy';
import { filterTreesOutsideBuildings, H2H_SHOP, MEADOW_SHOP, pointHitsBuilding, resolveBuildingSafePosition } from './worldObjects';
import { defaultHotbar, normalizeHotbar, type GameItemId, type HotbarSlots } from './inventory';

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 600;
const TILE = 48;
const CHARACTER_SIZE = 68;
const WORLD_COLUMNS = 40;
const WORLD_ROWS = 30;
const WORLD_WIDTH = WORLD_COLUMNS * TILE;
const WORLD_HEIGHT = WORLD_ROWS * TILE;
const SAVE_KEY = 'h2h-game-world-save';
const START = { x: 12 * TILE + TILE / 2, y: 14 * TILE + TILE / 2 };
const TREES: [number, number][] = [
  [4, 5], [5, 5], [6, 5], [4, 6], [7, 7], [8, 7], [9, 7], [7, 8], [8, 9],
  [16, 4], [17, 4], [18, 4], [17, 5], [34, 5], [35, 5], [34, 6], [36, 8],
  [6, 19], [7, 19], [8, 19], [7, 20], [20, 20], [21, 20], [22, 20], [21, 21],
  [31, 17], [32, 17], [33, 17], [32, 18], [36, 23], [37, 23], [36, 24],
];
const WORLD_TREES = filterTreesOutsideBuildings(TREES);

type Position = { x: number; y: number };
type Farm = { choppedTrees: string[]; choppedAt: Record<string, number>; carrots: number; coins: number; petFood: number; wood: number; growth: GrowthSettings; seeds: number; plants: Record<string, CarrotPlant>; hotbar: HotbarSlots };
const freshFarm = (): Farm => ({ seeds: 12, plants: {}, choppedTrees: [], choppedAt: {}, carrots: 0, coins: 0, petFood: 3, wood: 0, growth: { ...defaultGrowth }, hotbar: [...defaultHotbar] });
function readFarm(value: unknown): Farm {
  const input = value as Partial<Farm> | null;
  const plants: Farm['plants'] = {};
  if (input?.plants && typeof input.plants === 'object') {
    for (const [key, plant] of Object.entries(input.plants)) {
      if (/^\d+,\d+$/.test(key) && plant && typeof plant.watered === 'boolean') plants[key] = { watered: plant.watered, plantedAt: Number.isFinite(plant.plantedAt) ? plant.plantedAt : Date.now(), stage: [1, 2, 3].includes(plant.stage) ? plant.stage : 1, wateredAt: plant.watered ? (Number.isFinite(plant.wateredAt) ? plant.wateredAt : Date.now()) : null };
    }
  }
  const choppedAt: Record<string, number> = {};
  for (const key of Array.isArray(input?.choppedTrees) ? input.choppedTrees : []) {
    choppedAt[key] = Number.isFinite(input?.choppedAt?.[key]) ? input!.choppedAt![key] : Date.now();
  }
  const validDuration = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : fallback;
  return { choppedAt, carrots: Number.isInteger(input?.carrots) && input!.carrots! >= 0 ? input!.carrots! : 0,
    coins: Number.isInteger(input?.coins) && input!.coins! >= 0 ? input!.coins! : 0,
    petFood: Number.isInteger(input?.petFood) && input!.petFood! >= 0 ? input!.petFood! : 3,
    wood: Number.isInteger(input?.wood) && input!.wood! >= 0 ? input!.wood! : 0,
    growth: { carrotSeconds: validDuration(input?.growth?.carrotSeconds, 180), treeSeconds: validDuration(input?.growth?.treeSeconds, 180) }, choppedTrees: Array.isArray(input?.choppedTrees) ? input.choppedTrees.filter(key => typeof key === 'string' && WORLD_TREES.some(([c, r]) => key === `${c},${r}`)) : [], seeds: Number.isInteger(input?.seeds) && input!.seeds! >= 0 ? input!.seeds! : 12, plants, hotbar: normalizeHotbar(input?.hotbar) };
}
type Dig = { started: number; column: number; row: number; direction: Direction; applied: boolean; tillable: boolean; action?: 'chop' | 'plant' | 'water' | 'use'; toolItem?: GameItemId };
type Direction = 'north' | 'east' | 'south' | 'west';

function isPath(column: number, row: number) {
  return row === 13 || row === 14 || (column === 12 && row > 7 && row < 13) || (column === 28 && row > 14 && row < 23);
}

function isWater(x: number, y: number) {
  const dx = (x - 26.3 * TILE) / (3.7 * TILE);
  const dy = (y - 7.6 * TILE) / (2.4 * TILE);
  return dx * dx + dy * dy < 1;
}

function growingTrees(farm: Farm) {
  return farm.choppedTrees.filter(key => growthState(farm.choppedAt[key] ?? Date.now(), farm.growth.treeSeconds).stage < 3);
}

function isTreeAt(x: number, y: number, choppedTrees: string[] = []) {
  return WORLD_TREES.some(([column, row]) => {
    if (choppedTrees.includes(`${column},${row}`)) return false;
    const dx = x - (column + 0.5) * TILE;
    const dy = y - (row + 0.68) * TILE;
    return dx * dx + dy * dy < (TILE * 0.38) ** 2;
  });
}

function canStand(x: number, y: number, choppedTrees: string[]) {
  const padding = 11;
  if (x < padding || y < padding || x > WORLD_WIDTH - padding || y > WORLD_HEIGHT - padding) return false;
  return !isWater(x, y + 8) && !isTreeAt(x, y + 8, choppedTrees) && !pointHitsBuilding(x, y + 8, 11);
}

type Animation = { image: HTMLImageElement; durations: number[] };

function drawHeldTool(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, direction: Direction, frame: number, swing: number) {
  if (!image.complete || !image.naturalWidth) return;
  const side = direction === 'west' ? -1 : 1;
  const handX = x + side * (direction === 'north' || direction === 'south' ? 10 : 5);
  const handY = y + 2 + [0, 1, 0, -1, 0, 1][frame % 6];
  ctx.save();
  ctx.translate(Math.round(handX), Math.round(handY));
  ctx.rotate(side * (-0.18 + Math.sin(swing * Math.PI) * 1.9));
  ctx.drawImage(image, -18, -28, 36, 36);
  ctx.restore();
}

function drawCharacter(ctx: CanvasRenderingContext2D, animation: Animation, x: number, y: number, time: number, direction: Direction, heldTool: HTMLImageElement | null, swing: number) {
  const { image, durations } = animation;
  if (!image.complete || !image.naturalWidth) return;
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let elapsed = time % total;
  let frame = 0;
  while (frame < durations.length - 1 && elapsed >= durations[frame]) {
    elapsed -= durations[frame];
    frame += 1;
  }
  ctx.fillStyle = 'rgba(40, 58, 43, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  if (heldTool && direction === 'north') drawHeldTool(ctx, heldTool, x, y, direction, frame, swing);
  ctx.drawImage(image, frame * CHARACTER_SIZE, 0, CHARACTER_SIZE, CHARACTER_SIZE,
    x - CHARACTER_SIZE / 2, y - CHARACTER_SIZE / 2, CHARACTER_SIZE, CHARACTER_SIZE);
  if (heldTool && direction !== 'north') drawHeldTool(ctx, heldTool, x, y, direction, frame, swing);
  ctx.imageSmoothingEnabled = true;
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  player: Position,
  time: number,
  animation: Animation,
  animationTime: number,
  direction: Direction,
  heldTool: HTMLImageElement | null,
  soil: Set<string>,
  swing: number,
  grassPattern: CanvasPattern | null,
  dig: Dig | null,
  farm: Farm,
  art: Record<keyof typeof gameAssets, HTMLImageElement>,
) {
  const VIEW_WIDTH = ctx.canvas.width;
  const VIEW_HEIGHT = ctx.canvas.height;
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH / 2));
  const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, player.y - VIEW_HEIGHT / 2));
  const firstColumn = Math.floor(cameraX / TILE);
  const lastColumn = Math.ceil((cameraX + VIEW_WIDTH) / TILE);
  const firstRow = Math.floor(cameraY / TILE);
  const lastRow = Math.ceil((cameraY + VIEW_HEIGHT) / TILE);

  // Paint a continuous texture in world coordinates, beneath paths and soil.
  ctx.fillStyle = '#93bc00';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (grassPattern) {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ctx.fillStyle = grassPattern;
    ctx.fillRect(cameraX, cameraY, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
  }

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = column * TILE - cameraX;
      const y = row * TILE - cameraY;
      if (soil.has(`${column},${row}`)) {
        const savedPlant = farm.plants[`${column},${row}`];
        const plant = savedPlant ? carrotState(savedPlant, farm.growth.carrotSeconds) : undefined;
        const tile = plant?.watered ? art.wateredSoil : art.soil;
        if (tile.complete && tile.naturalWidth) ctx.drawImage(tile, x, y, TILE, TILE);
        if (plant) {
          const growth = { stage: plant.stage };
          const image = growth.stage === 1 ? art.sprouts : growth.stage === 2 ? art.carrotGrowing : art.carrotRipe;
          if (image.complete && image.naturalWidth) ctx.drawImage(image, x, y, TILE, TILE);

        }
        if (plant?.watered && art.waterMarker.complete && art.waterMarker.naturalWidth) ctx.drawImage(art.waterMarker, x, y, TILE, TILE);
      }
      if (isPath(column, row)) {
        if (art.path.complete && art.path.naturalWidth) ctx.drawImage(art.path, x, y, TILE + 1, TILE + 1);
      }
    }
  }

  const lakeX = 26.3 * TILE - cameraX;
  const lakeY = 7.6 * TILE - cameraY;
  if (art.pond.complete && art.pond.naturalWidth) {
    ctx.save();
    ctx.translate(lakeX, lakeY);
    ctx.rotate(-0.14);
    ctx.drawImage(art.pond, -3.8 * TILE, -2.5 * TILE, 7.6 * TILE, 5 * TILE);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(210, 246, 210, 0.58)';
  for (let i = 0; i < 5; i += 1) {
    const rippleX = lakeX - 95 + i * 38 + Math.sin(time / 900 + i) * 3;
    const rippleY = lakeY - 12 + (i % 2) * 31;
    ctx.fillRect(rippleX, rippleY, 17, 2);
  }

  const houseX = MEADOW_SHOP.x - cameraX;
  const houseY = MEADOW_SHOP.y - cameraY;
  if (art.cottage.complete && art.cottage.naturalWidth) ctx.drawImage(art.cottage, houseX, houseY, MEADOW_SHOP.width, MEADOW_SHOP.height);
  ctx.fillStyle = '#4b2f1d';
  ctx.fillRect(houseX + 22, houseY - 8, 48, 16);
  ctx.strokeStyle = '#e9c46a';
  ctx.lineWidth = 2;
  ctx.strokeRect(houseX + 22, houseY - 8, 48, 16);
  ctx.fillStyle = '#fff0c8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SHOP', houseX + 46, houseY + 3);
  const h2hShopX = H2H_SHOP.x - cameraX;
  const h2hShopY = H2H_SHOP.y - cameraY;
  if (art.h2hShop.complete && art.h2hShop.naturalWidth) ctx.drawImage(art.h2hShop, h2hShopX, h2hShopY, H2H_SHOP.width, H2H_SHOP.height);
  for (const [column, row] of WORLD_TREES) {
    const key = `${column},${row}`;
    const growth = farm.choppedTrees.includes(key) ? growthState(farm.choppedAt[key] ?? Date.now(), farm.growth.treeSeconds) : { stage: 3, remaining: 0 };
    const x = (column + 0.5) * TILE - cameraX;
    const y = (row + 0.48) * TILE - cameraY;
    const image = growth.stage === 1 ? art.stump : growth.stage === 2 ? art.sapling : art.tree;
    if (image.complete && image.naturalWidth) ctx.drawImage(image, x - 24, y - 44, 48, 64);
    if (growth.stage < 3) {
      ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#24342a';
      ctx.fillText(`${growth.stage}/3 ${timeLabel(growth.remaining)}`, x, y + 30);
    }
  }

  // Scattered flowers make the grass feel alive without obstructing movement.
  for (let i = 0; i < 24; i += 1) {
    const column = (i * 11 + 3) % WORLD_COLUMNS;
    const row = (i * 7 + 2) % WORLD_ROWS;
    if (isPath(column, row) || (column > 22 && column < 31 && row > 4 && row < 11)) continue;
    const fx = (column + 0.5) * TILE - cameraX;
    const fy = (row + 0.5) * TILE - cameraY;
    if (fx < -8 || fy < -8 || fx > VIEW_WIDTH + 8 || fy > VIEW_HEIGHT + 8) continue;
    if (art.flower.complete && art.flower.naturalWidth) ctx.drawImage(art.flower, fx - 4, fy - 4, 8, 8);
  }

  if (dig) {
    const x = dig.column * TILE - cameraX;
    const y = dig.row * TILE - cameraY;
    ctx.strokeStyle = dig.tillable ? '#ffe5a0' : '#e79a83';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    if (swing >= 0.5) {
      const spread = (swing - 0.5) * 36;
      ctx.fillStyle = '#b88a57';
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3;
        ctx.fillRect(x + TILE / 2 + Math.cos(angle) * spread,
          y + TILE / 2 + Math.sin(angle) * spread - spread / 2, 4, 4);
      }
    }
  }
  drawCharacter(ctx, animation, player.x - cameraX, player.y - cameraY, animationTime, direction, heldTool, swing);

}

function readLocalSave(): Position | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) return { x: saved.x, y: saved.y };
  } catch {
    // Ignore invalid local saves and start at the cottage path.
  }
  return null;
}

function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const position = value as Position;
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 0 && position.x <= WORLD_WIDTH
    && position.y >= 0 && position.y <= WORLD_HEIGHT;
}

export default function GameWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Position>({ ...START });
  const pressedRef = useRef(new Set<string>());
  const inventoryOpenRef = useRef(false);
  const shopOpenRef = useRef(false);
  const h2hShopOpenRef = useRef(false);
  const handleInventoryChange = useCallback((open: boolean) => {
    inventoryOpenRef.current = open;
    pressedRef.current.clear();
  }, []);
  const selectedItemRef = useRef<GameItemId | null>('hoe');
  const digRef = useRef<Dig | null>(null);
  const soilRef = useRef(new Set<string>());
  const farmRef = useRef<Farm>(freshFarm());
  const [farm, setFarm] = useState<Farm>(freshFarm);
  const updateFarm = (next: Farm) => { farmRef.current = next; setFarm(next); };
  const [soil, setSoil] = useState<string[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [h2hShopOpen, setH2HShopOpen] = useState(false);
  const [shopMessage, setShopMessage] = useState('Choose an item to buy or sell.');
  useEffect(() => {
    shopOpenRef.current = shopOpen;
    if (shopOpen) pressedRef.current.clear();
  }, [shopOpen]);
  useEffect(() => {
    h2hShopOpenRef.current = h2hShopOpen;
    if (h2hShopOpen) pressedRef.current.clear();
  }, [h2hShopOpen]);
  const handleSellCarrots = (quantity: number) => {
    const current = farmRef.current;
    const result = sellCarrots(current, quantity);
    if (result.ok === false) { setShopMessage(result.reason); return; }
    updateFarm({ ...current, ...result.state });
    setShopMessage(`Sold ${quantity} carrot${quantity === 1 ? '' : 's'} for ${result.state.coins - current.coins} coins.`);
  };
  const handleBuyPetFood = () => {
    const current = farmRef.current;
    const result = buyPetFood(current);
    if (result.ok === false) { setShopMessage(result.reason); return; }
    updateFarm({ ...current, ...result.state });
    setShopMessage('Bought 1 pet food.');
  };
  const handleSellWood = (quantity: number) => {
    const current = farmRef.current;
    const result = sellWood(current, quantity);
    if (result.ok === false) { setShopMessage(result.reason); return; }
    updateFarm({ ...current, ...result.state });
    setShopMessage(`Sold ${quantity} wood for ${result.state.coins - current.coins} coin${quantity === 1 ? '' : 's'}.`);
  };
  const [plantMenu, setPlantMenu] = useState<{ key: string; left: number; top: number } | null>(null);
  const [menuNow, setMenuNow] = useState(Date.now());
  const plantMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!plantMenu) return;
    pressedRef.current.clear();
    plantMenuRef.current?.focus();
    const timer = window.setInterval(() => setMenuNow(Date.now()), 250);
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'i' || ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) setPlantMenu(null);
    };
    const resize = () => setPlantMenu(null);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('resize', resize);
    return () => { window.clearInterval(timer); window.removeEventListener('keydown', dismiss); window.removeEventListener('resize', resize); };
  }, [plantMenu]);
  const menuStoredPlant = plantMenu ? farm.plants[plantMenu.key] : undefined;
  const menuPlant = menuStoredPlant ? carrotState(menuStoredPlant, farm.growth.carrotSeconds, menuNow) : undefined;
  const openPlantMenu = (column: number, row: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const player = playerRef.current;
    const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width / 2));
    const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height / 2));
    const x = ((column + 1) * TILE - cameraX) * bounds.width / canvas.width;
    const y = (row * TILE - cameraY) * bounds.height / canvas.height;
    setMenuNow(Date.now());
    setPlantMenu({ key: `${column},${row}`, left: Math.max(4, Math.min(x + 8, bounds.width - 240)), top: Math.max(4, Math.min(y, bounds.height - 250)) });
  };
  const plantMenuAction = (action: 'destroy' | 'harvest') => {
    if (!plantMenu) return;
    const [column, row] = plantMenu.key.split(',').map(Number);
    const player = playerRef.current;
    if (Math.hypot((column + 0.5) * TILE - player.x, (row + 0.5) * TILE - player.y) > TILE * 1.8) {
      setDigHint('Walk closer to this patch first'); setPlantMenu(null); return;
    }
    const current = farmRef.current;
    const stored = current.plants[plantMenu.key];
    const plant = stored ? carrotState(stored, current.growth.carrotSeconds) : undefined;
    if (action === 'harvest' && (!plant || plant.stage !== 3)) return;
    const plants = { ...current.plants };
    delete plants[plantMenu.key];
    if (action === 'destroy') {
      soilRef.current.delete(plantMenu.key);
      setSoil([...soilRef.current]);
    }
    updateFarm({ ...current, plants, carrots: current.carrots + (action === 'harvest' ? 1 : 0) });
    setDigHint(action === 'harvest' ? '+1 carrot added to your bag!' : 'Plant removed and ground restored to grass');
    setPlantMenu(null);
    canvasRef.current?.focus({ preventScroll: true });
  };
  const [digHint, setDigHint] = useState('Select the hoe (1), then left-click nearby grass');
  const handleSelectItem = useCallback((item: GameItemId | null) => { selectedItemRef.current = item; }, []);
  const lastSentRef = useRef<Position>({ ...START });
  const [position, setPosition] = useState<Position>({ ...START });
  const [saveReady, setSaveReady] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Loading save…');
  const { user, isAuthReady } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    setSaveReady(false);
    setSaveLabel(userId ? 'Loading cloud save…' : 'Loading local save…');

    const load = async () => {
      let loadedPosition = readLocalSave() || { ...START };
      let loadedSoil: string[] = [];
      let loadedFarm = freshFarm();
      try { const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); loadedSoil = saved.soil || []; loadedFarm = readFarm(saved.farm); } catch { /* New save. */ }
      if (userId) {
        const { data, error } = await supabase
          .from('game_saves')
          .select('save_data')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) {
          setSaveLabel('Local save · Supabase unavailable');
        } else if (isPosition(data?.save_data?.player)) {
          loadedPosition = data.save_data.player;
          loadedSoil = data.save_data.soil || [];
          loadedFarm = readFarm(data.save_data.farm);
          setSaveLabel('Saved to local Supabase');
        } else {
          setSaveLabel('New world · Supabase save ready');
        }
      } else {
        setSaveLabel('Saved in this browser · sign in for Supabase saves');
      }
      if (cancelled) return;
      loadedSoil = Array.isArray(loadedSoil) ? loadedSoil.filter(key => typeof key === 'string' && /^\d+,\d+$/.test(key)) : [];
      loadedPosition = resolveBuildingSafePosition(loadedPosition, { ...START });
      soilRef.current = new Set(loadedSoil);
      setSoil(loadedSoil);
      updateFarm({ ...loadedFarm, plants: Object.fromEntries(Object.entries(loadedFarm.plants).filter(([key]) => loadedSoil.includes(key))) });
      digRef.current = null;
      playerRef.current = loadedPosition;
      lastSentRef.current = loadedPosition;
      setPosition(loadedPosition);
      setSaveReady(true);
    };

    if (isAuthReady) void load();
    return () => { cancelled = true; };
  }, [userId, isAuthReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const resize = () => {
      const bounds = canvas.parentElement!.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(bounds.width));
      canvas.height = Math.max(1, Math.round(bounds.height));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    resize();

    let grassPattern: CanvasPattern | null = null;
    const grassImage = new Image();
    grassImage.onload = () => {
      grassPattern = ctx.createPattern(grassImage, 'repeat');
      // Repeat the full source every eight game tiles for natural detail.
      grassPattern?.setTransform(new DOMMatrix().scale(
        (TILE * 8) / grassImage.naturalWidth,
        (TILE * 8) / grassImage.naturalHeight,
      ));
    };
    grassImage.src = assetUrl(gameAssets.grass);

    const art = {} as Record<keyof typeof gameAssets, HTMLImageElement>;
    for (const key of Object.keys(gameAssets) as (keyof typeof gameAssets)[]) {
      const image = new Image();
      image.src = assetUrl(gameAssets[key]);
      art[key] = image;
    }
    const animations = {} as Record<Direction, Animation>;
    for (const direction of ['north', 'east', 'south', 'west'] as const) {
      const image = new Image();
      image.src = assetUrl(characterAssets[direction]);
      animations[direction] = { image, durations: [200, 200, 200, 200, 200, 200] };
    }
    let disposed = false;
    void fetch(assetUrl(characterAssets.timing))
      .then(response => { if (!response.ok) throw new Error('Sprite timing unavailable'); return response.json(); })
      .then((timing: Record<Direction, number[]>) => {
        if (disposed) return;
        for (const direction of ['north', 'east', 'south', 'west'] as const) {
          if (timing[direction]?.length && timing[direction].every(value => value > 0)) {
            animations[direction].durations = timing[direction];
          }
        }
      }).catch(() => { /* All supplied GIFs also use the fallback 200 ms timing. */ });

    let frameId = 0;
    let previousTime = 0;
    let lastUiUpdate = 0;
    let direction: Direction = 'south';
    let animationStartedAt = 0;
    let wasMoving = false;

    const frame = (time: number) => {
      const dt = Math.min((time - (previousTime || time)) / 1000, 0.04);
      previousTime = time;
      const keys = pressedRef.current;
      let dx = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
      let dy = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
      const dig = digRef.current;
      const digProgress = dig ? Math.min((time - dig.started) / 450, 1) : 0;
      if (dig && !dig.applied && digProgress >= 0.5) {
        if (dig.action === 'chop' && dig.tillable) {
          const next = { ...farmRef.current, wood: farmRef.current.wood + 1, choppedAt: { ...farmRef.current.choppedAt, [`${dig.column},${dig.row}`]: Date.now() }, choppedTrees: [...new Set([...farmRef.current.choppedTrees, `${dig.column},${dig.row}`])] };
          farmRef.current = next;
          setFarm(next);
          setDigHint('Tree chopped! +1 wood added to your bag');
        } else if (!dig.action && dig.tillable) {
          soilRef.current.add(`${dig.column},${dig.row}`);
          setSoil([...soilRef.current]);
          setDigHint('Soil tilled! Click another patch of grass');
        }
        dig.applied = true;
      }
      if (dig && digProgress >= 1) digRef.current = null;
      if (digRef.current) { dx = 0; dy = 0; direction = dig!.direction; }
      const moving = dx !== 0 || dy !== 0;
      const previousDirection = direction;
      if (moving) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
        direction = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'east' : 'west')
          : (dy > 0 ? 'south' : 'north');
        const current = playerRef.current;
        const distance = 190 * dt;
        const nextX = current.x + dx * distance;
        const nextY = current.y + dy * distance;
        if (canStand(nextX, current.y, growingTrees(farmRef.current))) current.x = nextX;
        if (canStand(current.x, nextY, growingTrees(farmRef.current))) current.y = nextY;
      }
      if (moving && (!wasMoving || direction !== previousDirection)) animationStartedAt = time;
      const animationTime = moving ? time - animationStartedAt : 0;
      wasMoving = moving;
      const player = playerRef.current;
      const heldItem = digRef.current?.toolItem ?? selectedItemRef.current;
      drawWorld(ctx, player, time, animations[direction], animationTime, direction, heldItem ? art[heldItem] : null, soilRef.current, digProgress, grassPattern, digRef.current, farmRef.current, art);
      if (time - lastUiUpdate > 180) {
        lastUiUpdate = time;
        const current = playerRef.current;
        const last = lastSentRef.current;
        if (current.x !== last.x || current.y !== last.y) {
          lastSentRef.current = { ...current };
          setPosition({ ...current });
        }
      }
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frameId); };
  }, []);

  useEffect(() => {
    const keyMap: Record<string, string> = {
      ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
      w: 'w', W: 'w', a: 'a', A: 'a', s: 's', S: 's', d: 'd', D: 'd',
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (inventoryOpenRef.current || shopOpenRef.current || h2hShopOpenRef.current) return;
      const key = keyMap[event.key];
      if (!key) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      event.preventDefault();
      pressedRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = keyMap[event.key];
      if (key) pressedRef.current.delete(key);
    };
    const clearKeys = () => pressedRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    const timeout = window.setTimeout(async () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ ...position, soil, farm }));
      } catch {
        // The Supabase copy can still be saved if local storage is unavailable.
      }
      if (!userId) return;
      setSaveLabel('Saving to local Supabase…');
      const { error } = await supabase.from('game_saves').upsert(
        { user_id: userId, save_data: { player: position, soil, farm }, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      setSaveLabel(error ? 'Browser save · Supabase save failed' : 'Saved to local Supabase');
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [position, soil, farm, saveReady, userId]);

  useEffect(() => {
    if (!saveReady) return;
    const advanceStages = () => {
      const current = farmRef.current;
      let changed = false;
      const plants = Object.fromEntries(Object.entries(current.plants).map(([key, plant]) => {
        const next = carrotState(plant, current.growth.carrotSeconds);
        if (next !== plant) changed = true;
        return [key, next];
      }));
      if (changed) updateFarm({ ...current, plants });
    };
    advanceStages();
    const interval = window.setInterval(advanceStages, 1000);
    return () => window.clearInterval(interval);
  }, [saveReady]);

  const hold = useCallback((direction: string, isPressed: boolean) => {
    if (isPressed) pressedRef.current.add(direction);
    else pressedRef.current.delete(direction);
  }, []);

  const controlButton = (direction: string, label: string, icon: string) => (
    <button
      key={direction}
      type="button"
      aria-label={label}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); hold(direction, true); }}
      onPointerUp={() => hold(direction, false)}
      onPointerCancel={() => hold(direction, false)}
      onLostPointerCapture={() => hold(direction, false)}
      className="flex h-12 w-12 touch-none items-center justify-center rounded-xl border border-white/20 bg-white/90 text-xl text-foreground-800 shadow-md active:scale-95 active:bg-accent-100 md:hidden"
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );

  return (
    <section className="fixed inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden bg-[#91ce7d] md:top-[72px]">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          aria-label="A green top-down meadow with a cottage, pond, paths, and a character you can move around."
          className="absolute inset-0 z-[1] block h-full w-full touch-none outline-none"
          onPointerDown={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            // Right-click is handled on contextmenu so the same gesture cannot
            // open this menu and immediately dismiss it through the overlay.
            if (event.button !== 0 || digRef.current) return;
            event.preventDefault();
            if (!saveReady) { setDigHint('Loading your world… try again in a moment'); return; }
            const item = selectedItemRef.current;
            const canvas = event.currentTarget;
            const bounds = canvas.getBoundingClientRect();
            const player = playerRef.current;
            const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width / 2));
            const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height / 2));
            const clickX = (event.clientX - bounds.left) * canvas.width / bounds.width + cameraX;
            const clickY = (event.clientY - bounds.top) * canvas.height / bounds.height + cameraY;
            if (clickX >= H2H_SHOP.x && clickX <= H2H_SHOP.x + H2H_SHOP.width && clickY >= H2H_SHOP.y && clickY <= H2H_SHOP.y + H2H_SHOP.height) {
              pressedRef.current.clear();
              setPlantMenu(null);
              setH2HShopOpen(true);
              setDigHint('Welcome to the H2H Shop!');
              return;
            }
            if (clickX >= MEADOW_SHOP.x && clickX <= MEADOW_SHOP.x + MEADOW_SHOP.width && clickY >= MEADOW_SHOP.y - 13 && clickY <= MEADOW_SHOP.y + MEADOW_SHOP.height) {
              pressedRef.current.clear();
              setPlantMenu(null);
              setShopMessage('Choose an item to buy or sell.');
              setShopOpen(true);
              setDigHint('Welcome to the Meadow Shop!');
              return;
            }
            if (!item) { setDigHint('Empty hands selected — choose a hotbar item to use it'); return; }
            setPlantMenu(null);
            const dx = clickX - player.x, dy = clickY - player.y;
            const direction: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
            if (item === 'axe') {
              const candidates = WORLD_TREES.filter(([c, r]) => !growingTrees(farmRef.current).includes(`${c},${r}`));
              const reachable = candidates.filter(([c, r]) =>
                Math.hypot((c + 0.5) * TILE - player.x, (r + 0.68) * TILE - player.y) <= TILE * 2.2);
              const clicked = reachable.filter(([c, r]) => Math.abs(clickX - (c + 0.5) * TILE) <= 32
                && clickY >= (r + 0.48) * TILE - 48 && clickY <= (r + 0.48) * TILE + 24)
                .sort((a, b) => b[1] - a[1])[0];
              // A nearby tree in the aimed direction can be hit even if the
              // click falls just outside its canopy or trunk.
              const aimed = reachable.filter(([c, r]) => {
                const tx = (c + 0.5) * TILE - player.x;
                const ty = (r + 0.68) * TILE - player.y;
                return direction === 'east' ? tx > 0 && Math.abs(ty) < TILE
                  : direction === 'west' ? tx < 0 && Math.abs(ty) < TILE
                  : direction === 'north' ? ty < 0 && Math.abs(tx) < TILE
                  : ty > 0 && Math.abs(tx) < TILE;
              }).sort((a, b) => Math.hypot((a[0] + 0.5) * TILE - player.x, (a[1] + 0.68) * TILE - player.y)
                - Math.hypot((b[0] + 0.5) * TILE - player.x, (b[1] + 0.68) * TILE - player.y))[0];
              const tree = clicked ?? aimed;
              const column = tree?.[0] ?? Math.floor(player.x / TILE);
              const row = tree?.[1] ?? Math.floor(player.y / TILE);
              const tx = (column + 0.5) * TILE, ty = (row + 0.68) * TILE;
              const facing: Direction = tree ? (Math.abs(tx - player.x) > Math.abs(ty - player.y)
                ? (tx > player.x ? 'east' : 'west') : (ty > player.y ? 'south' : 'north')) : direction;
              digRef.current = { started: performance.now(), column, row, direction: facing, applied: false, tillable: !!tree, action: 'chop', toolItem: 'axe' };
              setDigHint(tree ? 'Chopping…' : 'Axe swung — move closer and aim at a tree');
              return;
            }
            let column = Math.floor(clickX / TILE), row = Math.floor(clickY / TILE);
            if (Math.hypot((column + 0.5) * TILE - player.x, (row + 0.5) * TILE - player.y) > TILE * 1.8) {
              const offsetX = direction === 'east' ? TILE : direction === 'west' ? -TILE : 0;
              const offsetY = direction === 'south' ? TILE : direction === 'north' ? -TILE : 0;
              column = Math.floor((player.x + offsetX) / TILE);
              row = Math.floor((player.y + offsetY) / TILE);
            }
            const x = (column + 0.5) * TILE, y = (row + 0.5) * TILE;
            const blocked = column < 0 || row < 0 || column >= WORLD_COLUMNS || row >= WORLD_ROWS || isPath(column, row)
              || isWater(x, y) || WORLD_TREES.some(([c, r]) => c === column && r === row) || pointHitsBuilding(x, y);
            const key = `${column},${row}`;
            const alreadyTilled = soilRef.current.has(key);
            const animateUse = (action: 'plant' | 'water' | 'use') => {
              digRef.current = { started: performance.now(), column, row, direction, applied: true, tillable: false, action, toolItem: item };
            };
            const storedCrop = farmRef.current.plants[key];
            const crop = storedCrop ? carrotState(storedCrop, farmRef.current.growth.carrotSeconds) : undefined;
            if (crop && (item === 'carrot' || crop.stage === 3)) {
              openPlantMenu(column, row);
              return;
            }
            if (item === 'carrot' || item === 'petFood' || item === 'wood') {
              animateUse('use');
              setDigHint(item === 'carrot' ? 'Carrot selected' : item === 'petFood' ? 'Pet food selected' : 'Wood selected');
              return;
            }
            if (item === 'seeds') {
              animateUse('plant');
              if (blocked || !alreadyTilled) { setDigHint('Till the grass with the hoe before planting'); return; }
              if (farmRef.current.plants[key]) { setDigHint('This patch is already planted'); return; }
              updateFarm({ ...farmRef.current, plants: { ...farmRef.current.plants, [key]: { watered: false, plantedAt: Date.now(), stage: 1, wateredAt: null } } });
              setDigHint('Carrot seeds planted! Select the watering can (2)');
              return;
            }
            if (item === 'wateringCan') {
              animateUse('water');
              const plant = crop;
              if (!plant) { setDigHint('Plant carrot seeds on tilled soil before watering'); return; }
              if (plant.watered) { setDigHint('This patch is already watered'); return; }
              updateFarm({ ...farmRef.current, plants: { ...farmRef.current.plants, [key]: { ...plant, watered: true, wateredAt: Date.now() } } });
              setDigHint(plant.stage === 3 ? 'Final stage watered! Right-click for Harvest' : 'Stage watered! Growth timer started');
              return;
            }
            const tillable = !blocked && !alreadyTilled;
            if (blocked) setDigHint('This ground cannot be tilled. Move onto clear grass');
            else if (alreadyTilled) setDigHint('This soil is already tilled');
            else setDigHint('Digging…');
            if (item !== 'hoe') { setDigHint('Select the hoe to till grass'); return; }
            digRef.current = { started: performance.now(), column, row, direction, applied: false, tillable, toolItem: 'hoe' };
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!saveReady) { setDigHint('Loading your world… try again in a moment'); return; }
            const canvas = event.currentTarget;
            const bounds = canvas.getBoundingClientRect();
            const player = playerRef.current;
            const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width / 2));
            const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height / 2));
            const column = Math.floor(((event.clientX - bounds.left) * canvas.width / bounds.width + cameraX) / TILE);
            const row = Math.floor(((event.clientY - bounds.top) * canvas.height / bounds.height + cameraY) / TILE);
            if (!soilRef.current.has(`${column},${row}`)) {
              setPlantMenu(null);
              setDigHint('Right-click a plant or tilled patch to see its actions');
              return;
            }
            openPlantMenu(column, row);
          }}
          tabIndex={0}
        />
        {plantMenu && (
          <>
            <div className="absolute inset-0 z-20" onPointerDown={event => { if (event.button === 0) setPlantMenu(null); }} onContextMenu={event => event.preventDefault()} />
            <div ref={plantMenuRef} role="dialog" aria-label="Plant actions" tabIndex={-1}
              style={{ left: plantMenu.left, top: plantMenu.top }}
              className="absolute z-30 max-h-full w-[232px] max-w-full overflow-y-auto border-[3px] border-[#b49a6a] bg-[#554332] p-3 text-[#fff0c8] shadow-xl outline-none"
              onContextMenu={event => event.preventDefault()}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{menuPlant ? 'Carrot plant' : 'Tilled soil'}</h2>
                <button type="button" onClick={() => setPlantMenu(null)} aria-label="Close plant actions" className="px-2 py-1 hover:bg-white/10">×</button>
              </div>
              {menuPlant ? <div className="my-2 space-y-1 text-xs text-[#dbc9a5]">
                <p>Stage {menuPlant.stage} of 3</p>
                <p>{menuPlant.stage === 3 ? 'Fully grown' : menuPlant.watered ? 'Watered' : 'Needs watering'}</p>
                <p>{menuPlant.stage === 3 ? 'Ready to harvest' : !menuPlant.watered ? 'Water to continue' : `Next stage in ${timeLabel(carrotRemaining(menuPlant, farm.growth.carrotSeconds, menuNow))}`}</p>
              </div> : <p className="my-2 text-xs text-[#dbc9a5]">No crop planted</p>}
              <div className="flex gap-2">
                <button type="button" disabled={!menuPlant || menuPlant.stage !== 3}
                  onClick={() => plantMenuAction('harvest')}
                  className="flex-1 border-2 border-[#9c805a] bg-[#45633c] px-2 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40">Harvest</button>
                <button type="button" onClick={() => plantMenuAction('destroy')}
                  className="flex-1 border-2 border-[#9c805a] bg-[#813f33] px-2 py-2 text-xs font-semibold">Destroy</button>
              </div>
            </div>
          </>
        )}
        <div className="pointer-events-none absolute z-[2] left-3 top-3 rounded-xl border border-white/70 bg-white/85 px-3 py-2 text-xs font-medium text-foreground-700 shadow-sm backdrop-blur-sm">
          <span className="hidden sm:inline">Move: </span>WASD / arrow keys <span className="ml-2 font-bold text-[#8a5a13]">🪙 {farm.coins}</span>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-[2] max-w-[45%] rounded-xl bg-white/85 px-3 py-2 text-[10px] text-foreground-600" role="status" aria-live="polite">{saveLabel}</div>
        <div className="pointer-events-none absolute bottom-28 right-3 z-[2] rounded-xl bg-foreground-900/45 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-sm sm:bottom-32">
          {digHint}
        </div>
        <div className="absolute bottom-28 left-4 z-[2] grid grid-cols-3 gap-1.5 sm:bottom-32 md:hidden" aria-label="Movement controls">
          <span />{controlButton('ArrowUp', 'Move up', 'ri-arrow-up-line')}<span />
          {controlButton('ArrowLeft', 'Move left', 'ri-arrow-left-line')}
          {controlButton('ArrowDown', 'Move down', 'ri-arrow-down-line')}
          {controlButton('ArrowRight', 'Move right', 'ri-arrow-right-line')}
        </div>
        </div>
        <ShopDialog open={shopOpen} coins={farm.coins} carrots={farm.carrots} petFood={farm.petFood} wood={farm.wood} message={shopMessage}
          onClose={() => setShopOpen(false)} onSellCarrots={handleSellCarrots} onSellWood={handleSellWood} onBuyPetFood={handleBuyPetFood} />
        <H2HShopDialog open={h2hShopOpen} onClose={() => setH2HShopOpen(false)} />
        <Hotbar onSelect={handleSelectItem} onInventoryChange={handleInventoryChange} hotbar={farm.hotbar}
          onHotbarChange={(hotbar) => updateFarm({ ...farmRef.current, hotbar })} carrotCount={farm.carrots} growth={farm.growth}
          petFoodCount={farm.petFood} woodCount={farm.wood} coins={farm.coins}
          onGrowthChange={(growth) => updateFarm({ ...farmRef.current, growth })} />
      </div>

    </section>
  );
}
