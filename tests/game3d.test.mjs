import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const moduleUrls = new Map();
async function moduleUrl(url) {
  if (moduleUrls.has(url.href)) return moduleUrls.get(url.href);
  const source = await readFile(url, 'utf8');
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)]) {
    js = js.replaceAll(match[0], 'from ' + JSON.stringify(await moduleUrl(new URL(match[1] + '.ts', url))));
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  moduleUrls.set(url.href, result);
  return result;
}
async function loadTypeScriptModule(relativePath) {
  return import(await moduleUrl(new URL(relativePath, import.meta.url)));
}

const game = await loadTypeScriptModule('../src/pages/game3d/game3d.ts');
const world = await loadTypeScriptModule('../src/pages/game3d/worldLayout.ts');
const webgl = await loadTypeScriptModule('../src/pages/game3d/webgl3d.ts');
const cameraControls = await loadTypeScriptModule('../src/pages/game3d/cameraControls3D.ts');
const objectWalk = await loadTypeScriptModule('../src/pages/game3d/objectWalk3D.ts');

test('ground click navigation reaches the exact spot by going around an obstacle',()=>{
  const start={x:0,z:0},goal={x:5.23,z:0.17};
  const obstacles=[{kind:'box',x:2,z:0,width:1,depth:3}];
  const path=objectWalk.findGroundWalkPath3D(start,goal,obstacles,23.5);
  assert.deepEqual(path.at(-1),goal);
  assert.ok(path.some(p=>Math.abs(p.z)>1.9));
  for(const p of path)assert.equal(game.isPositionBlocked({...p,y:0},obstacles),false);
});
test('ground click navigation rejects blocked and out-of-world destinations',()=>{
  assert.deepEqual(objectWalk.findGroundWalkPath3D({x:0,z:0},{x:4,z:0},[{kind:'box',x:4,z:0,width:1,depth:1}],23.5),[]);
  assert.deepEqual(objectWalk.findGroundWalkPath3D({x:0,z:0},{x:25,z:0},[],23.5),[]);
});

test('large furniture is reachable when its edge occupies a highlighted tile',()=>{
  const target={x:0,z:0,width:2.2,depth:3.8};
  assert.equal(cameraControls.isHighlightedObject3D({x:2,z:0},target),true);
  assert.ok(objectWalk.findObjectWalkPath3D({x:4,z:4},target,[{kind:'box',...target}]).length>0);
});

test('click-to-interact routes around furniture and stops within highlighted tiles', () => {
  const start={x:0,y:0,z:4}, target={x:-5.8,z:1.5};
  const obstacles=[{kind:'box',x:-2,z:3,width:1,depth:2}];
  const path=objectWalk.findObjectWalkPath3D(start,target,obstacles);
  assert.ok(path.length>0);
  assert.equal(cameraControls.isHighlightedObject3D(path.at(-1),target),true);
  for(const point of path)assert.equal(game.isPositionBlocked({...point,y:0},obstacles),false);
});

test('click-to-interact rejects enclosed targets instead of walking through walls', () => {
  assert.deepEqual(objectWalk.findObjectWalkPath3D({x:0,y:0,z:4},{x:0,z:0},[
    {kind:'box',x:0,z:0,width:4,depth:4},
  ]),[]);
});

test('object dialogs use the highlighted tiles, including fractional object positions', () => {
  const player = { x: -4.9, z: 1.2 };
  assert.equal(cameraControls.isHighlightedObject3D(player, { x: -5.8, z: 1.5 }), true);
  assert.equal(cameraControls.isHighlightedObject3D(player, { x: -3.6, z: 2.4 }), true);
  assert.equal(cameraControls.isHighlightedObject3D(player, { x: -4.8, z: 1.1 }), false);
  assert.equal(cameraControls.isHighlightedObject3D(player, { x: -2.9, z: 1 }), false);
});

test('old saves receive the default appearance and malformed customization stays safe', () => {
  assert.deepEqual(game.normalizeGame3DSave({ coins: 12 }).appearance, game.DEFAULT_FARMER_APPEARANCE_3D);
  const normalized = game.normalizeAppearance3D({ skin: 'bad', shirt: '#123abc', height: 99, build: -1, hairStyle: 'invalid', hat: 'no', name: '  Alex  ' });
  assert.equal(normalized.skin, game.DEFAULT_FARMER_APPEARANCE_3D.skin);
  assert.equal(normalized.shirt, '#123abc');
  assert.equal(normalized.height, 1.15);
  assert.equal(normalized.build, 0.8);
  assert.equal(normalized.hairStyle, 'short');
  assert.equal(normalized.hat, true);
  assert.equal(normalized.name, 'Alex');
});

test('custom appearance survives reload and travel without altering farm progress', () => {
  const fresh = game.freshGame3DSave();
  const customized = { ...fresh, appearance: { ...fresh.appearance, name: 'Alex', hairStyle: 'curly', hair: '#c0a060', shirt: '#007788', hat: false, height: 1.1, build: 0.9 }, soil: { '2,3': { watered: false } } };
  const town = game.travelWorld3D(game.normalizeGame3DSave(JSON.parse(JSON.stringify(customized))), 'town');
  assert.deepEqual(town.appearance, customized.appearance);
  assert.deepEqual(town.soil, customized.soil);
  assert.deepEqual(town.inventory, fresh.inventory);
});

test('older farm saves default to the private world without losing crops', () => {
  const saved = game.normalizeGame3DSave({ player: { x: 3, y: 0, z: 9 }, plants: { '3,10': { stage: 2, watered: true, wateredAt: 100 } } });
  assert.equal(saved.worldId, 'farm');
  assert.equal(saved.plants['3,10'].stage, 2);
  assert.deepEqual(saved.player, { x: 3, y: 0, z: 9 });
});

test('walking through the house door enters an interior and exits safely onto the farm', () => {
  const farm = game.freshGame3DSave();
  const inside = game.walkThroughHouseDoor3D(farm, { x: 7, y: 0, z: 0.7 });
  assert.equal(inside.worldId, 'house');
  assert.deepEqual(inside.player, { x: 0, y: 0, z: 3.5 });
  const reloaded = game.normalizeGame3DSave(JSON.parse(JSON.stringify(inside)));
  assert.equal(reloaded.worldId, 'house');
  const outside = game.walkThroughHouseDoor3D(reloaded, { x: 0, y: 0, z: 5.3 });
  assert.equal(outside.worldId, 'farm');
  assert.deepEqual(outside.player, { x: 7, y: 0, z: 1.8 });
  assert.equal(game.walkThroughHouseDoor3D(outside, outside.player).worldId, 'farm');
  assert.deepEqual(outside.inventory, farm.inventory);
});

test('passing a house wall or another world does not trigger the doorway', () => {
  const farm = game.freshGame3DSave();
  assert.equal(game.walkThroughHouseDoor3D(farm, { x: 5, y: 0, z: 0.7 }).worldId, 'farm');
  const town = game.travelWorld3D(farm, 'town');
  assert.equal(game.walkThroughHouseDoor3D(town, { x: 7, y: 0, z: 0.7 }).worldId, 'town');
});

test('travel restores each world position and preserves farm progress and shared inventory', () => {
  const farm = { ...game.freshGame3DSave(), player: { x: 3, y: 0, z: 9 }, coins: 15, soil: { '3,10': { watered: false } }, plants: { '3,10': { stage: 1, watered: false, wateredAt: null } }, choppedTrees: { 'tree-1': 100 } };
  const town = game.travelWorld3D(farm, 'town');
  assert.equal(town.worldId, 'town');
  assert.deepEqual(town.player, { x: 0, y: 0, z: 8 });
  const reloaded = game.normalizeGame3DSave(JSON.parse(JSON.stringify({ ...town, player: { x: 5, y: 0, z: 2 }, coins: 20 })));
  const home = game.travelWorld3D(reloaded, 'farm');
  assert.deepEqual(home.player, farm.player);
  assert.deepEqual(home.plants, farm.plants);
  assert.deepEqual(home.soil, farm.soil);
  assert.deepEqual(home.choppedTrees, farm.choppedTrees);
  assert.deepEqual(home.inventory, farm.inventory);
  assert.equal(home.coins, 20);
  assert.deepEqual(game.travelWorld3D(home, 'town').player, { x: 5, y: 0, z: 2 });
});

test('actions allow all eight surrounding tiles but reject the center and distant tiles', () => {
  const center = { x: 2.2, z: -3.1 };
  for (const key of ['1,-4', '2,-4', '3,-4', '1,-3', '3,-3', '1,-2', '2,-2', '3,-2']) {
    assert.equal(cameraControls.isSurroundingTile3D(center, key), true, key);
  }
  for (const key of ['2,-3', '4,-3', '2,-5', '0,0', '', 'bad,key']) {
    assert.equal(cameraControls.isSurroundingTile3D(center, key), false, key);
  }
});

test('digging is allowed only on clear grass terrain', () => {
  assert.equal(world.isDiggableGrass3D('-5,10'), true);
  assert.equal(world.isDiggableGrass3D('0,2'), false);
  assert.equal(world.isDiggableGrass3D('-7,-2'), true); // Meadow Shop moved to town.
  assert.equal(world.isDiggableGrass3D('16,-7'), false);
  assert.equal(world.isDiggableGrass3D('-18,-14'), false);
  assert.equal(world.isDiggableGrass3D('100,100'), false);
});

test('W and S move forward and backward while A and D strafe', () => {
  assert.deepEqual(cameraControls.movementVector3D?.(0, 1), { x: 0, z: -1 });
  assert.deepEqual(cameraControls.movementVector3D?.(0, -1), { x: 0, z: 1 });
  assert.deepEqual(cameraControls.movementVector3D?.(-1, 0), { x: -1, z: 0 });
  assert.deepEqual(cameraControls.movementVector3D?.(1, 0), { x: 1, z: 0 });
});

test('movement stops at zero input and diagonal speed stays normalized', () => {
  assert.deepEqual(cameraControls.movementVector3D?.(0, 0), { x: 0, z: 0 });
  const diagonal = cameraControls.movementVector3D?.(1, 1);
  assert.equal(Math.abs(Math.hypot(diagonal?.x ?? 0, diagonal?.z ?? 0) - 1) < 0.000001, true);
});

test('Shift selects run speed without changing walk speed', () => {
  assert.equal(cameraControls.movementSpeed3D?.(false), 4.3);
  assert.equal(cameraControls.movementSpeed3D?.(true), 7.8);
});

test('W and D follow the camera after orbiting east', () => {
  assert.deepEqual(cameraControls.movementVector3D(0, 1, Math.PI / 2), { x: 1, z: 0 });
  assert.deepEqual(cameraControls.movementVector3D(1, 0, Math.PI / 2), { x: 0, z: 1 });
});

test('character turning takes the shortest path across the angle boundary', () => {
  const turned = cameraControls.turnToward3D(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(turned - Math.PI) < 1e-8);
});

test('the facing highlight follows an east-facing character', () => {
  const tile = cameraControls.frontFacingTile3D({ x: 2, z: 5 }, Math.PI / 2);
  assert.deepEqual(tile, { x: 3, z: 5 });
});

test('the facing marker selects the first grid tile beyond the player tile', () => {
  assert.deepEqual(cameraControls.frontFacingTile3D({ x: 2, z: 5 }), { x: 2, z: 4 });
  assert.deepEqual(cameraControls.frontFacingTile3D({ x: -1.4, z: -3 }), { x: -1, z: -4 });
  assert.deepEqual(cameraControls.frontFacingTile3D({ x: 0.4, z: 0 }, Math.PI / 4), { x: 1, z: 0 });
  assert.deepEqual(cameraControls.frontFacingTile3D({ x: 0, z: 0 }, Math.PI / 4), { x: 1, z: 1 });
});

test('jump rises, applies gravity, and lands on the ground', () => {
  const started = cameraControls.stepJump3D?.({ y: 0, velocity: 0, grounded: true }, 0.1, true);
  assert.equal((started?.y ?? 0) > 0, true);
  assert.equal((started?.velocity ?? 0) > 0, true);
  assert.equal(started?.grounded, false);

  const falling = cameraControls.stepJump3D?.({ y: 1, velocity: 2, grounded: false }, 0.1, false);
  assert.equal(Math.abs((falling?.y ?? 0) - 1.2) < 0.000001, true);
  assert.equal(Math.abs((falling?.velocity ?? 0) - 0.2) < 0.000001, true);
  assert.equal(falling?.grounded, false);

  assert.deepEqual(
    cameraControls.stepJump3D?.({ y: 0.2, velocity: -3, grounded: false }, 0.1, false),
    { y: 0, velocity: 0, grounded: true },
  );
  assert.deepEqual(
    cameraControls.stepJump3D?.({ y: 0, velocity: 0, grounded: true }, 0.1, false),
    { y: 0, velocity: 0, grounded: true },
  );
});

test('held Space starts only one grounded jump', () => {
  assert.equal(cameraControls.shouldStartJump3D?.(true, false, true), true);
  assert.equal(cameraControls.shouldStartJump3D?.(true, true, true), false);
  assert.equal(cameraControls.shouldStartJump3D?.(false, false, true), false);
  assert.equal(cameraControls.shouldStartJump3D?.(true, false, false), false);
});

test('camera drag classification preserves short world clicks', () => {
  assert.equal(cameraControls.isCameraDrag3D?.(6), false);
  assert.equal(cameraControls.isCameraDrag3D?.(6.01), true);
});

test('camera pitch cannot move underground or directly overhead', () => {
  assert.equal(cameraControls.clampCameraPitch3D?.(-4), 0.08);
  assert.equal(cameraControls.clampCameraPitch3D?.(4), 1.25);
  assert.equal(cameraControls.clampCameraPitch3D?.(0.65), 0.65);
});

test('camera drag changes absolute yaw and clamps vertical orbit', () => {
  const changed = cameraControls.applyCameraDrag3D?.(
    { yaw: 0, pitch: 0.65, dragging: true },
    100,
    1000,
  );
  assert.deepEqual(changed, { yaw: -0.6, pitch: 1.25, dragging: true });
});

test('world actions are suppressed only immediately after a camera drag', () => {
  assert.equal(cameraControls.shouldSuppressWorldAction3D?.(1_000, 1_999), true);
  assert.equal(cameraControls.shouldSuppressWorldAction3D?.(1_000, 2_000), false);
  assert.equal(cameraControls.shouldSuppressWorldAction3D?.(0, 100), false);
});

test('camera zoom follows the wheel and clamps its distance', () => {
  assert.equal(cameraControls.applyCameraZoom3D?.(8, -100), 7);
  assert.equal(cameraControls.applyCameraZoom3D?.(8, 100), 9);
  assert.equal(cameraControls.applyCameraZoom3D?.(8, 0), 8);
  assert.equal(cameraControls.applyCameraZoom3D?.(8, -10_000), 4.5);
  assert.equal(cameraControls.applyCameraZoom3D?.(8, 10_000), 12);
});

test('camera orbit continues only while the secondary pointer button is held', () => {
  assert.equal(cameraControls.isSecondaryPointerHeld3D?.(2), true);
  assert.equal(cameraControls.isSecondaryPointerHeld3D?.(3), true);
  assert.equal(cameraControls.isSecondaryPointerHeld3D?.(0), false);
  assert.equal(cameraControls.isSecondaryPointerHeld3D?.(1), false);
});

test('camera collision keeps the requested distance when no building blocks the view', () => {
  assert.equal(
    cameraControls.resolveCameraDistance3D?.(
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 10 },
      [],
    ),
    10,
  );
});

test('camera collision stops before the nearest expanded building', () => {
  const target = { x: 0, y: 1, z: 0 };
  const desired = { x: 0, y: 1, z: 10 };
  const near = { x: 0, y: 2.5, z: 5, width: 2, height: 5, depth: 2 };
  const far = { x: 0, y: 2.5, z: 8, width: 2, height: 5, depth: 2 };
  const nearDistance = cameraControls.resolveCameraDistance3D?.(target, desired, [near]);
  const nearestDistance = cameraControls.resolveCameraDistance3D?.(target, desired, [far, near]);
  assert.equal((nearDistance ?? 10) > 3 && (nearDistance ?? 10) < 4, true);
  assert.equal(nearestDistance, nearDistance);
});

test('camera collision ignores buildings above or beside the camera segment', () => {
  const target = { x: 0, y: 1, z: 0 };
  const desired = { x: 0, y: 1, z: 10 };
  const beside = { x: 5, y: 2.5, z: 5, width: 2, height: 5, depth: 2 };
  const above = { x: 0, y: 10, z: 5, width: 2, height: 2, depth: 2 };
  assert.equal(cameraControls.resolveCameraDistance3D?.(target, desired, [beside, above]), 10);
});

test('camera collision handles zero length and edge inputs with a finite safe distance', () => {
  const blocker = { x: 0, y: 2.5, z: 0, width: 2, height: 5, depth: 2 };
  const zeroLength = cameraControls.resolveCameraDistance3D?.(
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 0 },
    [blocker],
  );
  const edge = cameraControls.resolveCameraDistance3D?.(
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 10 },
    [blocker],
  );
  assert.equal(Number.isFinite(zeroLength), true);
  assert.equal((zeroLength ?? 0) >= 1.25, true);
  assert.equal(Number.isFinite(edge), true);
  assert.equal((edge ?? 0) >= 1.25, true);
});

test('the WebGL support probe creates and releases only one context across rerenders', () => {
  let canvasCount = 0;
  let contextCount = 0;
  let releaseCount = 0;
  const detector = webgl.createWebGLSupportProbe?.(() => {
    canvasCount += 1;
    return {
      getContext() {
        contextCount += 1;
        return { getExtension: () => ({ loseContext: () => { releaseCount += 1; } }) };
      },
    };
  });

  assert.equal(typeof detector, 'function');
  assert.equal(detector?.(), true);
  assert.equal(detector?.(), true);
  assert.equal(canvasCount, 1);
  assert.equal(contextCount, 1);
  assert.equal(releaseCount, 1);
});

test('the 3D world uses a save key isolated from the 2D game', () => {
  assert.equal(game.GAME_3D_SAVE_KEY, 'h2h-game-3d-save-v1');
  assert.equal(JSON.stringify(game.freshGame3DSave?.()).includes('h2h-game-world-save'), false);
});

test('a fresh 3D save starts at the safe meadow entrance', () => {
  assert.deepEqual(game.freshGame3DSave?.().player, { x: 0, y: 0, z: 8 });
});

test('invalid saved positions and inventory counts normalize safely', () => {
  const normalized = game.normalizeGame3DSave?.({
    player: { x: Number.NaN, y: 0, z: 4 },
    inventory: { carrot: -4, wood: 2.8, petFood: 6 },
  });
  assert.deepEqual(normalized?.player, { x: 0, y: 0, z: 8 });
  assert.deepEqual(normalized?.inventory, { carrot: 0, wood: 2, petFood: 6, seeds: '∞', chicken:0, chickenFeed:0, egg:0 });
});

test('movement stays inside the world boundary', () => {
  const moved = game.movePlayer?.({ x: 23, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, []);
  assert.equal(moved.x <= 23.55, true);
  assert.equal(moved.z, 0);
});

test('movement cannot tunnel through a circular tree obstacle', () => {
  const obstacles = [{ kind: 'circle', x: 3, z: 0, radius: 1 }];
  const moved = game.movePlayer?.({ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, obstacles);
  assert.equal(moved.x < 1.6, true);
});

test('movement cannot pass through a rectangular shop and can slide along it', () => {
  const obstacles = [{ kind: 'box', x: 0, z: 3, width: 4, depth: 2 }];
  const moved = game.movePlayer?.({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 5 }, obstacles);
  assert.equal(moved.z < 1.6, true);
  assert.equal(moved.x > 0, true);
});

test('diagonal input travels at the same speed as straight input', () => {
  const moved = game.movePlayer?.({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, []);
  assert.equal(Math.abs(Math.hypot(moved.x, moved.z) - 1) < 0.001, true);
});

test('hoe and unlimited seeds create a planted soil cell', () => {
  const fresh = game.freshGame3DSave();
  const untilled = game.applyTool3D?.(fresh, 'seeds', '2,3', 0);
  assert.equal(untilled.changed, false);
  const tilled = game.applyTool3D?.(fresh, 'hoe', '2,3', 0);
  const planted = game.applyTool3D?.(tilled.state, 'seeds', '2,3', 0);
  assert.deepEqual(planted.state.plants['2,3'], { stage: 1, watered: false, wateredAt: null });
  assert.equal(planted.state.inventory.seeds, '∞');
});

test('a carrot advances one stage per watering and requires water again', () => {
  let state = game.applyTool3D?.(game.freshGame3DSave(), 'hoe', '1,1', 0).state;
  state = game.applyTool3D?.(state, 'seeds', '1,1', 0).state;
  state = game.applyTool3D?.(state, 'wateringCan', '1,1', 0).state;
  const stage2 = game.getCropStage3D?.(state.plants['1,1'], 180, 180_000);
  assert.deepEqual(stage2, { stage: 2, watered: false, wateredAt: null });
  const stillStage2 = game.getCropStage3D?.(stage2, 180, 900_000);
  assert.equal(stillStage2.stage, 2);
  const wateredAgain = game.waterCrop3D?.(stage2, 900_000);
  const stage3 = game.getCropStage3D?.(wateredAgain, 180, 1_080_000);
  assert.deepEqual(stage3, { stage: 3, watered: false, wateredAt: null });
});

test('carrots can only be harvested at stage three', () => {
  const fresh = game.freshGame3DSave();
  const immature = { ...fresh, plants: { '1,1': { stage: 2, watered: false, wateredAt: null } }, soil: { '1,1': { watered: false } } };
  assert.equal(game.harvestCrop3D?.(immature, '1,1', 0).changed, false);
  const mature = { ...immature, plants: { '1,1': { stage: 3, watered: false, wateredAt: null } } };
  const harvested = game.harvestCrop3D?.(mature, '1,1', 0);
  assert.equal(harvested.changed, true);
  assert.equal(harvested.state.inventory.carrot, 1);
  assert.equal(harvested.state.plants['1,1'], undefined);
});

test('chopping a tree adds wood and the tree returns at growth stage three', () => {
  const chopped = game.chopTree3D?.(game.freshGame3DSave(), 'tree-1', 0);
  assert.equal(chopped.state.inventory.wood, 1);
  assert.equal(game.getTreeStage3D?.(chopped.state.choppedTrees['tree-1'], 180, 0), 1);
  assert.equal(game.getTreeStage3D?.(chopped.state.choppedTrees['tree-1'], 180, 180_000), 2);
  assert.equal(game.getTreeStage3D?.(chopped.state.choppedTrees['tree-1'], 180, 360_000), 3);
});

test('the bag has 24 slots and hotbar assignment swaps existing items', () => {
  const fresh = game.freshGame3DSave();
  assert.equal(fresh.bag.length, 24);
  const assigned = game.assignHotbar3D?.(fresh.hotbar, 0, 'axe');
  assert.deepEqual(assigned.slice(0, 6), ['axe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'hoe']);
  assert.equal(new Set(assigned.filter(Boolean)).size, assigned.filter(Boolean).length);
});

test('shop economy matches the 2D carrot, wood, and pet-food prices', () => {
  const stock = {
    ...game.freshGame3DSave(),
    coins: 0,
    inventory: { carrot: 3, wood: 4, petFood: 0, seeds: '∞' },
  };
  const carrots = game.sellItem3D?.(stock, 'carrot', 2);
  assert.deepEqual({ coins: carrots.state.coins, count: carrots.state.inventory.carrot }, { coins: 10, count: 1 });
  const wood = game.sellItem3D?.(carrots.state, 'wood', 3);
  assert.deepEqual({ coins: wood.state.coins, count: wood.state.inventory.wood }, { coins: 13, count: 1 });
  const food = game.buyPetFood3D?.({ ...wood.state, coins: 10 });
  assert.deepEqual({ coins: food.state.coins, count: food.state.inventory.petFood }, { coins: 0, count: 1 });
});

test('the private 3D layout keeps the house, pond, paths, trees, and farm cells', () => {
  assert.equal(world.SHOPS_3D?.length, 1);
  assert.equal(world.SHOPS_3D[0].name, 'My House');
  assert.equal(world.POND_3D?.kind, 'circle');
  assert.equal(world.PATHS_3D?.length > 1, true);
  assert.equal(world.FARM_CELLS_3D?.length >= 36, true);
  assert.equal(world.TREE_POSITIONS_3D?.length >= 20, true);
  assert.equal(world.CAMERA_BLOCKERS_3D?.length, world.SHOPS_3D?.length);
  assert.deepEqual(
    world.CAMERA_BLOCKERS_3D?.map(blocker => ({ y: blocker.y, height: blocker.height })),
    [{ y: 2.5, height: 5 }],
  );
});

test('3D trees never overlap either shop footprint', () => {
  const overlaps = world.TREE_POSITIONS_3D?.filter(tree => world.SHOPS_3D.some(shop =>
    Math.abs(tree.x - shop.x) < shop.width / 2 + 0.8 && Math.abs(tree.z - shop.z) < shop.depth / 2 + 0.8));
  assert.deepEqual(overlaps, []);
});

test('a populated 3D save survives normalization without losing gameplay state', () => {
  const populated = {
    ...game.freshGame3DSave(),
    player: { x: 4, y: 0, z: -6 },
    inventory: { ...game.freshGame3DSave().inventory, carrot: 7, wood: 4, petFood: 2, seeds: '∞' },
    coins: 31,
    selectedSlot: 'cursor',
    hotbar: ['axe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'hoe', 'wood', null],
    growth: { carrotSeconds: 3, treeSeconds: 5, eggSeconds:180 },
    soil: { '1,10': { watered: true } },
    plants: { '1,10': { stage: 2, watered: true, wateredAt: 900 } },
    choppedTrees: { 'tree-2': 1200 },
  };
  const normalized = game.normalizeGame3DSave?.(populated);
  assert.deepEqual(normalized, populated);
});

test('corrupt 3D hotbar, growth, farm, and selection values fall back safely', () => {
  const normalized = game.normalizeGame3DSave?.({
    selectedSlot: 99,
    hotbar: ['axe', 'axe'],
    bag: 'not-an-array',
    growth: { carrotSeconds: 0, treeSeconds: Number.NaN },
    soil: { bad: { watered: 'yes' } },
    plants: { bad: { stage: 9 } },
    choppedTrees: { bad: 'yesterday' },
  });
  const fresh = game.freshGame3DSave();
  assert.equal(normalized.selectedSlot, fresh.selectedSlot);
  assert.deepEqual(normalized.hotbar, fresh.hotbar);
  assert.deepEqual(normalized.bag, fresh.bag);
  assert.deepEqual(normalized.growth, fresh.growth);
  assert.deepEqual(normalized.soil, {});
  assert.deepEqual(normalized.plants, {});
  assert.deepEqual(normalized.choppedTrees, {});
});


const farmEditor = await loadTypeScriptModule('../src/pages/game3d/farmCustomization3D.ts');
const town = await loadTypeScriptModule('../src/pages/game3d/townLayout3D.ts');

test('Meadow Shop exists only in town and freed farm ground can be tilled', () => {
  assert.ok(!world.SHOPS_3D.some(b => b.id === 'meadow'));
  assert.equal(town.TOWN_BUILDINGS_3D.filter(b => b.id === 'meadow').length, 1);
  assert.equal(world.isDiggableGrass3D('-7,-2'), true);
});

test('old saves receive an empty editable layout while crops, money and bag survive', () => {
  const old = game.normalizeGame3DSave({ coins: 21, plants: { '5,10': { stage: 3, watered: false, wateredAt: null } } });
  assert.deepEqual(old.farmLayout, farmEditor.freshFarmLayout3D());
  assert.equal(old.coins, 21);
  assert.equal(old.plants['5,10'].stage, 3);
});

test('path edits change diggable terrain and survive reload and world travel', () => {
  const fresh = game.freshGame3DSave();
  const result = farmEditor.applyFarmEdit3D(fresh, 'path', '-6,5', 0);
  assert.equal(result.changed, true);
  assert.equal(farmEditor.isFarmGrass3D(result.state.farmLayout, '-6,5'), false);
  const home = game.travelWorld3D(game.normalizeGame3DSave(JSON.parse(JSON.stringify(game.travelWorld3D(result.state, 'town')))), 'farm');
  assert.deepEqual(home.farmLayout, result.state.farmLayout);
  assert.equal(farmEditor.applyFarmEdit3D(home, 'grass', '-6,5', 0).state.farmLayout.terrain['-6,5'], 'grass');
  assert.deepEqual(fresh.farmLayout, farmEditor.freshFarmLayout3D(), 'edits do not mutate previous saves');
});

test('decorations have collision, rotation, and can be removed without erasing crops', () => {
  const fresh = game.freshGame3DSave();
  const placed = farmEditor.applyFarmEdit3D(fresh, 'bench', '-6,5', 1);
  assert.equal(placed.changed, true);
  assert.deepEqual(placed.state.farmLayout.decorations['-6,5'], { kind: 'bench', rotation: 1 });
  assert.equal(game.isPositionBlocked({ x: -6, y: 0, z: 5 }, farmEditor.farmObstacles3D(placed.state.farmLayout)), true);
  assert.equal(farmEditor.canDigFarm3D(placed.state.farmLayout, '-6,5'), false);
  const removed = farmEditor.applyFarmEdit3D(placed.state, 'remove', '-6,5', 0);
  assert.equal(removed.changed, true);
  assert.equal(removed.state.farmLayout.decorations['-6,5'], undefined);
  assert.equal(farmEditor.canDigFarm3D(removed.state.farmLayout, '-6,5'), true);
});

test('editing protects crops, trees, pond, travel gate, player and house entrance', () => {
  const state = { ...game.freshGame3DSave(), soil: { '-6,5': { watered: false } }, plants: { '-6,5': { stage: 1, watered: false, wateredAt: null } } };
  for (const key of ['-6,5', '-18,-14', '16,-7', '0,12', '0,8', '7,1', '7,-2', '24,24', 'bad']) {
    assert.equal(farmEditor.applyFarmEdit3D(state, 'fence', key, 0).changed, false, key);
  }
  assert.equal(farmEditor.applyFarmEdit3D({ ...state, worldId: 'town' }, 'path', '-6,6', 0).changed, false);
});

test('house relocation updates collision and both entry and exit positions', () => {
  const moved = farmEditor.moveFarmObject3D(game.freshGame3DSave(), 'house', '-7,-5', 0);
  assert.equal(moved.changed, true);
  assert.deepEqual(moved.state.farmLayout.house, { x: -7, z: -5, rotation: 0 });
  assert.equal(game.isPositionBlocked({ x: -7, y: 0, z: -5 }, farmEditor.farmObstacles3D(moved.state.farmLayout)), true);
  assert.equal(game.isPositionBlocked({ x: 7, y: 0, z: -2 }, farmEditor.farmObstacles3D(moved.state.farmLayout)), false);
  const inside = game.walkThroughHouseDoor3D(moved.state, { x: -7, y: 0, z: -2.3 });
  assert.equal(inside.worldId, 'house');
  const outside = game.walkThroughHouseDoor3D(inside, { x: 0, y: 0, z: 5.3 });
  assert.deepEqual(outside.player, { x: -7, y: 0, z: -1.2 });
});

test('invalid and overlapping layout data normalizes safely with bounded item counts', () => {
  const normalized = game.normalizeGame3DSave({ farmLayout: { house: { x: 1000, z: NaN }, terrain: { bad: 'path', '200,0': 'grass', '-5,5': 'lava', '-6,5': 'path' }, decorations: { '7,-2': { kind: 'bench', rotation: 0 }, '-6,6': { kind: 'fence', rotation: 99 }, '-6,7': { kind: 'bad', rotation: 0 } } } });
  assert.deepEqual(normalized.farmLayout.house, { x: 7, z: -2, rotation: 0 });
  assert.deepEqual(normalized.farmLayout.terrain, { '-6,5': 'path' });
  assert.deepEqual(normalized.farmLayout.decorations, { '-6,6': { kind: 'fence', rotation: 0 } });
});


test('house placement cannot cover planted crops or placed decorations', () => {
  const state = { ...game.freshGame3DSave(), soil: { '-7,-5': { watered: false } }, plants: { '-7,-5': { stage: 3, watered: false, wateredAt: null } } };
  assert.equal(farmEditor.applyFarmEdit3D(state, 'house', '-7,-5', 0).changed, false);
  const decorated = farmEditor.applyFarmEdit3D(game.freshGame3DSave(), 'bench', '-7,-5', 0).state;
  assert.equal(farmEditor.applyFarmEdit3D(decorated, 'house', '-7,-5', 0).changed, false);
  assert.equal(state.plants['-7,-5'].stage, 3);
});

test('decoration limit rejects further placements without changing inventory or coins', () => {
  let state=game.freshGame3DSave();
  for (const tile of world.LAND_TILES_3D) {
    const result=farmEditor.applyFarmEdit3D(state,'flowers',tile.key,0);
    if(result.changed) state=result.state;
    if(Object.keys(state.farmLayout.decorations).length===100)break;
  }
  assert.equal(Object.keys(state.farmLayout.decorations).length,100);
  const result=farmEditor.applyFarmEdit3D(state,'bench','-6,5',0);
  assert.equal(result.changed,false);
  assert.match(result.message,/100 decoration limit/);
  assert.equal(result.state.coins,0);
  assert.deepEqual(result.state.inventory,game.freshGame3DSave().inventory);
});

test('moving a selected decoration preserves its type, rotation and quantity', () => {
  const initial = farmEditor.applyFarmEdit3D(game.freshGame3DSave(),'bench','-6,5',1).state;
  const moved = farmEditor.moveFarmDecoration3D(initial,'-6,5','-8,5');
  assert.equal(moved.changed,true);
  assert.equal(moved.state.farmLayout.decorations['-6,5'],undefined);
  assert.deepEqual(moved.state.farmLayout.decorations['-8,5'],{kind:'bench',rotation:1});
  assert.equal(Object.keys(moved.state.farmLayout.decorations).length,1);
  assert.ok(initial.farmLayout.decorations['-6,5'],'old draft remains usable by Undo');
});

test('an invalid move keeps the original object at its old position', () => {
  const initial = farmEditor.applyFarmEdit3D(game.freshGame3DSave(),'fence','-6,5',0).state;
  for(const destination of ['16,-7','7,-2','0,12','bad','-6,5']) {
    const result=farmEditor.moveFarmDecoration3D(initial,'-6,5',destination);
    assert.equal(result.changed,false,destination);
    assert.deepEqual(result.state.farmLayout,initial.farmLayout);
  }
});

const editCamera = await loadTypeScriptModule('../src/pages/game3d/farmCamera3D.ts');
test('edit camera wheel zooms both ways and stays within safe limits', () => {
  const view=editCamera.freshFarmCamera3D();
  assert.ok(editCamera.zoomFarmCamera3D(view,-120).zoom>view.zoom);
  assert.ok(editCamera.zoomFarmCamera3D(view,120).zoom<view.zoom);
  assert.equal(editCamera.zoomFarmCamera3D(view,-100000).zoom<=4,true);
  let far=view;for(let i=0;i<20;i++)far=editCamera.zoomFarmCamera3D(far,500);
  assert.equal(far.zoom,.65);
  assert.equal(view.zoom,1);
});
test('editor rotation is reversible and pan follows the rotated view', () => {
  const view=editCamera.freshFarmCamera3D();
  const turned=editCamera.adjustFarmCamera3D(view,'left');
  assert.notEqual(turned.yaw,view.yaw);
  assert.ok(Math.abs(editCamera.adjustFarmCamera3D(turned,'right').yaw-view.yaw)<1e-10);
  const up=editCamera.adjustFarmCamera3D({...view,yaw:0},'up');
  assert.deepEqual({x:up.x,z:up.z},{x:0,z:3});
  const east=editCamera.adjustFarmCamera3D({...view,yaw:Math.PI/2},'up');
  assert.ok(Math.abs(east.x-3)<1e-10);
  assert.ok(Math.abs(east.z)<1e-10);
  assert.deepEqual(editCamera.adjustFarmCamera3D(east,'reset'),view);
});

test('WASD pans the editor camera smoothly relative to its angle without changing the player', () => {
  const view={...editCamera.freshFarmCamera3D(),yaw:0};
  const forward=editCamera.panFarmCamera3D(view,0,1,.1);
  assert.ok(forward.z>0);assert.equal(forward.x,0);
  const sideways=editCamera.panFarmCamera3D(view,1,0,.1);
  assert.ok(sideways.x<0);assert.equal(sideways.z,0);
  const diagonal=editCamera.panFarmCamera3D(view,1,1,.1);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-Math.hypot(forward.x,forward.z))<1e-10);
  assert.deepEqual(editCamera.panFarmCamera3D(view,0,0,.1),view);
});

test('edit time is excluded from crop and tree growth on both Save and Cancel', () => {
  const state={...game.freshGame3DSave(),plants:{'4,10':{stage:1,watered:true,wateredAt:0}},soil:{'4,10':{watered:true}},choppedTrees:{'tree-1':0}};
  const paused=game.pauseFarmTime3D(state,100000);
  assert.equal(paused.farmPausedAt,100000);
  const resumed=game.resumeFarmTime3D(paused,500000);
  assert.equal(resumed.farmPausedAt,null);
  assert.equal(resumed.plants['4,10'].wateredAt,400000);
  assert.equal(resumed.choppedTrees['tree-1'],400000);
  assert.equal(game.getCropStage3D(resumed.plants['4,10'],180,500000).stage,1);
  assert.equal(game.getTreeStage3D(resumed.choppedTrees['tree-1'],180,500000),1);
  assert.equal(game.getCropStage3D(resumed.plants['4,10'],180,580000).stage,2);
  assert.equal(game.getTreeStage3D(resumed.choppedTrees['tree-1'],180,580000),2);
  assert.deepEqual(game.resumeFarmTime3D(resumed,700000),resumed,'resuming twice does not double-shift timers');
  assert.equal(state.plants['4,10'].wateredAt,0);
});

test('reloading an edit session resumes without catching up the frozen growth time', () => {
  const state={...game.freshGame3DSave(),plants:{'4,10':{stage:2,watered:true,wateredAt:50000},'5,10':{stage:1,watered:false,wateredAt:null}},choppedTrees:{'tree-2':0}};
  const paused=game.pauseFarmTime3D(state,100000);
  const restored=game.normalizeGame3DSave(JSON.parse(JSON.stringify(paused)),500000);
  assert.equal(restored.farmPausedAt,null);
  assert.equal(restored.plants['4,10'].wateredAt,450000);
  assert.equal(restored.plants['5,10'].wateredAt,null);
  assert.equal(restored.choppedTrees['tree-2'],400000);
  assert.deepEqual(restored.inventory,state.inventory);
  assert.deepEqual(restored.farmLayout,state.farmLayout);
});

test('trees can move and rotate without resetting their growth, or be erased permanently', () => {
  const fresh={...game.freshGame3DSave(),choppedTrees:{'tree-1':1000}};
  const moved=farmEditor.moveFarmObject3D(fresh,'tree-1','-6,5',1);
  assert.equal(moved.changed,true);
  assert.deepEqual(farmEditor.getFarmTrees3D(moved.state.farmLayout).find(t=>t.id==='tree-1'),{id:'tree-1',x:-6,z:5,rotation:1});
  assert.equal(moved.state.choppedTrees['tree-1'],1000);
  assert.equal(farmEditor.canDigFarm3D(moved.state.farmLayout,'-18,-14'),true);
  assert.equal(farmEditor.canDigFarm3D(moved.state.farmLayout,'-6,5'),false);
  const removed=farmEditor.deleteFarmObject3D(moved.state,'tree-1');
  assert.equal(removed.changed,true);
  const restored=game.normalizeGame3DSave(JSON.parse(JSON.stringify(removed.state)));
  assert.ok(!farmEditor.getFarmTrees3D(restored.farmLayout).some(t=>t.id==='tree-1'));
  assert.equal(farmEditor.canDigFarm3D(restored.farmLayout,'-6,5'),true);
});

test('farm portal moves and rotates but cannot be erased', () => {
  const moved=farmEditor.moveFarmObject3D(game.freshGame3DSave(),'portal','-6,5',1);
  assert.equal(moved.changed,true);
  assert.deepEqual(moved.state.farmLayout.portal,{x:-6,z:5,rotation:1});
  assert.equal(farmEditor.deleteFarmObject3D(moved.state,'portal').changed,false);
  assert.deepEqual(game.normalizeGame3DSave(JSON.parse(JSON.stringify(moved.state))).farmLayout.portal,moved.state.farmLayout.portal);
});

test('all editable objects rotate in quarter turns and house entry follows the rotated doorway', () => {
  let state=game.freshGame3DSave();
  for(const id of ['house','portal','tree-1']) {
    const start=farmEditor.getFarmObject3D(state.farmLayout,id).rotation;
    for(let i=0;i<4;i++) {
      const rotated=farmEditor.rotateFarmObject3D(state,id);
      assert.equal(rotated.changed,true,id);
      state=rotated.state;
    }
    assert.equal(farmEditor.getFarmObject3D(state.farmLayout,id).rotation,start);
  }
  state=farmEditor.rotateFarmObject3D(game.freshGame3DSave(),'house').state;
  assert.deepEqual(farmEditor.farmHouseExit3D(state.farmLayout),{x:10.8,y:0,z:-2});
  const inside=game.walkThroughHouseDoor3D(state,{x:9.7,y:0,z:-2});
  assert.equal(inside.worldId,'house');
  assert.deepEqual(game.walkThroughHouseDoor3D(inside,{x:0,y:0,z:5.3}).player,{x:10.8,y:0,z:-2});
  const bench=farmEditor.applyFarmEdit3D(state,'bench','-6,5',0).state;
  assert.equal(farmEditor.rotateFarmObject3D(bench,'-6,5').state.farmLayout.decorations['-6,5'].rotation,1);
});

test('moving objects rejects overlaps without changing their original saved location', () => {
  const state=game.freshGame3DSave();
  for(const id of ['tree-1','portal']) {
    for(const key of ['7,-2','16,-7','0,8','-15,-15']) {
      const result=farmEditor.moveFarmObject3D(state,id,key,0);
      assert.equal(result.changed,false,`${id}: ${key}`);
      assert.deepEqual(result.state.farmLayout,state.farmLayout);
    }
  }
});


test('House tool creates separate houses and preserves the original home', () => {
  const initial=game.freshGame3DSave();
  const first=farmEditor.applyFarmEdit3D(initial,'house','-6,-5',1);
  assert.equal(first.changed,true);
  assert.deepEqual(first.state.farmLayout.house,initial.farmLayout.house);
  assert.equal(Object.keys(first.state.farmLayout.buildings).length,1);
  const id=Object.keys(first.state.farmLayout.buildings)[0];
  assert.deepEqual(first.state.farmLayout.buildings[id],{x:-6,z:-5,rotation:1,style:'cottage'});
  assert.equal(farmEditor.getFarmObject3D(first.state.farmLayout,id).canDelete,true);
  const second=farmEditor.applyFarmEdit3D(first.state,'house','-7,8',0);
  assert.equal(second.changed,true);
  assert.equal(Object.keys(second.state.farmLayout.buildings).length,2);
  assert.deepEqual(game.normalizeGame3DSave(JSON.parse(JSON.stringify(second.state))).farmLayout,second.state.farmLayout);
  assert.equal(farmEditor.deleteFarmObject3D(first.state,id).changed,true);
  assert.equal(farmEditor.deleteFarmObject3D(first.state,'house').changed,false);
});

test('new houses block movement and terrain edits and keep their own working doorway', () => {
  const placed=farmEditor.applyFarmEdit3D(game.freshGame3DSave(),'house','-6,-5',1).state;
  const id=Object.keys(placed.farmLayout.buildings)[0];
  assert.equal(game.isPositionBlocked({x:-6,y:0,z:-5},farmEditor.farmObstacles3D(placed.farmLayout)),true);
  assert.equal(farmEditor.applyFarmEdit3D(placed,'path','-6,-5',0).changed,false);
  assert.equal(farmEditor.applyFarmEdit3D(placed,'house','-6,-5',0).changed,false);
  const inside=game.walkThroughHouseDoor3D(placed,{x:-3.3,y:0,z:-5});
  assert.equal(inside.worldId,'house');
  assert.equal(inside.interiorHouseId,id);
  assert.deepEqual(game.walkThroughHouseDoor3D(inside,{x:0,y:0,z:5.3}).player,{x:-2.2,y:0,z:-5});
  const moved=farmEditor.moveFarmObject3D(placed,id,'-7,8',2);
  assert.equal(moved.changed,true);
  assert.equal(moved.state.farmLayout.buildings[id].rotation,2);
});

test('House catalogue and Terrace category leave room for future house styles', () => {
  assert.ok(farmEditor.FARM_HOUSE_CATALOG_3D.some(item=>item.id==='cottage'));
  assert.deepEqual(farmEditor.FARM_EDIT_CATEGORIES_3D.find(item=>item.id==='terrace').tools,['path','grass']);
  assert.equal(farmEditor.FARM_EDIT_CATEGORIES_3D.find(item=>item.id==='house').label,'House');
  assert.ok(!farmEditor.FARM_EDIT_CATEGORIES_3D.some(item=>item.id==='path'||item.id==='grass'));
});

test('wooden fences join across rows and corners to form a closed square', () => {
  let state=game.freshGame3DSave();
  for(let x=-8;x<=-4;x++)for(let z=3;z<=7;z++)if(x===-8||x===-4||z===3||z===7) {
    const result=farmEditor.applyFarmEdit3D(state,'fence',`${x},${z}`,0);
    assert.equal(result.changed,true,`${x},${z}`);state=result.state;
  }
  assert.deepEqual(farmEditor.getFenceConnections3D(state.farmLayout,'-8,3'),[{x:1,z:0},{x:0,z:1}]);
  assert.deepEqual(farmEditor.getFenceConnections3D(state.farmLayout,'-6,3'),[{x:1,z:0},{x:-1,z:0}]);
  const obstacles=farmEditor.farmObstacles3D(state.farmLayout);
  assert.equal(game.isPositionBlocked({x:-6,y:0,z:5},obstacles),false);
  for(const p of [{x:-8,z:5},{x:-4,z:5},{x:-6,z:3},{x:-6,z:7}])assert.equal(game.isPositionBlocked({...p,y:0},obstacles),true);
  const moved=game.movePlayer({x:-6,y:0,z:5},{x:4,y:0,z:0},obstacles);
  assert.ok(moved.x<-4.45,'the player cannot walk through the right fence');
  const restored=game.normalizeGame3DSave(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(farmEditor.getFenceConnections3D(restored.farmLayout,'-8,3'),[{x:1,z:0},{x:0,z:1}]);
});

test('fence connections update after moving, erasing and rotating pieces', () => {
  let state=game.freshGame3DSave();
  for(const key of ['-6,3','-5,3','-5,4'])state=farmEditor.applyFarmEdit3D(state,'fence',key,0).state;
  const rotated=farmEditor.rotateFarmObject3D(state,'-6,3').state;
  assert.deepEqual(farmEditor.getFenceConnections3D(rotated.farmLayout,'-6,3'),[{x:0,z:1}],'local rails compensate for object rotation');
  const removed=farmEditor.deleteFarmObject3D(state,'-5,3').state;
  assert.deepEqual(farmEditor.getFenceConnections3D(removed.farmLayout,'-6,3'),[]);
  const moved=farmEditor.moveFarmObject3D(state,'-5,3','-7,3').state;
  assert.deepEqual(farmEditor.getFenceConnections3D(moved.farmLayout,'-6,3'),[{x:-1,z:0}]);
  assert.deepEqual(farmEditor.previewFenceConnections3D(state.farmLayout,'-6,4',0),[{x:1,z:0},{x:0,z:-1}]);
});

test('hidden players do not block placement in farm edit mode', () => {
  const state=game.pauseFarmTime3D({...game.freshGame3DSave(),player:{x:-6,y:0,z:5}},1000);
  assert.equal(farmEditor.applyFarmEdit3D(state,'fence','-6,5',0).changed,true);
  assert.equal(farmEditor.applyFarmEdit3D(state,'house','-6,5',0).changed,true);
  assert.equal(farmEditor.moveFarmObject3D(state,'tree-1','-6,5').changed,true);
  for(const key of ['16,-7','7,-2','-18,-14'])assert.equal(farmEditor.applyFarmEdit3D(state,'fence',key,0).changed,false,key);
  const planted={...state,soil:{'-6,5':{watered:false}}};
  assert.equal(farmEditor.applyFarmEdit3D(planted,'fence','-6,5',0).changed,false,'crop ground remains protected');
});

test('saving a fence on the hidden player moves them to nearby clear ground', () => {
  const paused=game.pauseFarmTime3D({...game.freshGame3DSave(),player:{x:-6,y:0,z:5},coins:35},1000);
  const placed=farmEditor.applyFarmEdit3D(paused,'fence','-6,5',0).state;
  const resumed=game.resolveFarmPlayerPosition3D(game.resumeFarmTime3D(placed,5000));
  assert.equal(game.isPositionBlocked(resumed.player,farmEditor.farmObstacles3D(resumed.farmLayout)),false);
  assert.notDeepEqual(resumed.player,paused.player);
  assert.ok(Math.hypot(resumed.player.x-paused.player.x,resumed.player.z-paused.player.z)<=2);
  assert.deepEqual(resumed.worldPositions.farm,resumed.player);
  assert.equal(resumed.coins,35);
  assert.equal(resumed.farmLayout.decorations['-6,5'].kind,'fence');
  const cancelled=game.resolveFarmPlayerPosition3D(game.resumeFarmTime3D(paused,5000));
  assert.deepEqual(cancelled.player,paused.player,'Cancel preserves the original position');
  const restored=game.normalizeGame3DSave(JSON.parse(JSON.stringify(placed)),5000);
  assert.equal(game.isPositionBlocked(restored.player,farmEditor.farmObstacles3D(restored.farmLayout)),false);
});

const painting = await loadTypeScriptModule('../src/pages/game3d/farmPaint3D.ts');
test('a fast terrain drag fills skipped tiles and retains one original layout for Undo', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  let stroke=painting.startFarmPaint3D(initial,'path','-8,5',0);
  stroke=painting.extendFarmPaint3D(stroke,'-4,5');
  assert.equal(stroke.painted,5);
  for(let x=-8;x<=-4;x++)assert.equal(stroke.state.farmLayout.terrain[`${x},5`],'path');
  assert.strictEqual(stroke.before,initial.farmLayout);
  assert.deepEqual(stroke.before.terrain,{});
  const repeated=painting.extendFarmPaint3D(stroke,'-8,5');
  assert.equal(repeated.painted,1,'dragging back removes the rest of this stroke');
  assert.deepEqual(repeated.state.farmLayout.terrain,{'-8,5':'path'});
  assert.deepEqual(initial.farmLayout,game.freshGame3DSave().farmLayout);
});
test('dragged fences stay connected through diagonal pointer jumps and corners', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  let stroke=painting.startFarmPaint3D(initial,'fence','-8,3',0);
  stroke=painting.extendFarmPaint3D(stroke,'-6,5');
  const keys=Object.keys(stroke.state.farmLayout.decorations);
  assert.equal(keys.length,5);
  for(const key of keys)assert.ok(farmEditor.getFenceConnections3D(stroke.state.farmLayout,key).length>0,key);
  assert.deepEqual(painting.farmPaintLine3D('-8,3','-6,5'),['-8,3','-7,3','-7,4','-6,4','-6,5']);
});
test('painting skips planted and occupied tiles and supports grass without touching inventory', () => {
  const initial={...game.pauseFarmTime3D(game.freshGame3DSave(),1000),soil:{'-6,5':{watered:false}}};
  const stroke=painting.extendFarmPaint3D(painting.startFarmPaint3D(initial,'path','-8,5',0),'-4,5');
  assert.equal(stroke.state.farmLayout.terrain['-6,5'],undefined);
  assert.equal(stroke.painted,4);
  const grass=painting.extendFarmPaint3D(painting.startFarmPaint3D(stroke.state,'grass','-8,5',0),'-4,5');
  assert.equal(grass.state.farmLayout.terrain['-8,5'],'grass');
  assert.deepEqual(grass.state.inventory,initial.inventory);
  assert.equal(painting.isFarmPaintTool3D('house'),false);
  assert.equal(painting.isFarmPaintTool3D('select'),false);
  assert.equal(painting.isFarmPaintTool3D('flowers'),false);
  assert.deepEqual(painting.farmPaintLine3D('bad','1,2'),[]);
});

test('backtracking terrain restores previous materials and can extend again', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  initial.farmLayout.terrain['-6,5']='grass';
  let stroke=painting.extendFarmPaint3D(painting.startFarmPaint3D(initial,'path','-8,5',0),'-4,5');
  stroke=painting.extendFarmPaint3D(stroke,'-7,5');
  assert.deepEqual(stroke.state.farmLayout.terrain,{'-8,5':'path','-7,5':'path','-6,5':'grass'});
  assert.equal(stroke.painted,2);
  stroke=painting.extendFarmPaint3D(stroke,'-5,5');
  assert.equal(stroke.painted,4);
  assert.equal(stroke.state.farmLayout.terrain['-6,5'],'path');
  assert.strictEqual(stroke.before,initial.farmLayout);
});
test('backtracking fences removes only this drag and restores saved rotation', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  initial.farmLayout.decorations['-6,5']={kind:'fence',rotation:1};
  let stroke=painting.extendFarmPaint3D(painting.startFarmPaint3D(initial,'fence','-8,5',0),'-4,5');
  stroke=painting.extendFarmPaint3D(stroke,'-7,5');
  assert.deepEqual(stroke.state.farmLayout.decorations,{
    '-8,5':{kind:'fence',rotation:0},'-7,5':{kind:'fence',rotation:0},'-6,5':{kind:'fence',rotation:1}
  });
  assert.equal(stroke.painted,2);
});
test('backtracking diagonal corners and protected tiles restores their prior state', () => {
  const initial={...game.pauseFarmTime3D(game.freshGame3DSave(),1000),soil:{'-7,3':{watered:false}}};
  let stroke=painting.extendFarmPaint3D(painting.startFarmPaint3D(initial,'fence','-8,3',0),'-6,5');
  stroke=painting.extendFarmPaint3D(stroke,'-7,3');
  assert.deepEqual(Object.keys(stroke.state.farmLayout.decorations),['-8,3']);
  assert.equal(stroke.painted,1);
  assert.deepEqual(stroke.state.soil,initial.soil);
});

test('Select hover resolves objects occupying terrain instead of highlighting the ground tile', () => {
  const state=farmEditor.applyFarmEdit3D(game.freshGame3DSave(),'bench','-6,5',0).state;
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'-6,5').kind,'bench');
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'7,-2').id,'house');
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'8,-2').id,'house');
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'-18,-14').kind,'tree');
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'0,12').id,'portal');
  assert.equal(farmEditor.getFarmObjectAtTile3D(state.farmLayout,'-6,6'),null);
});


test('pool moves with collision and editing protection, and survives reload', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  const moved=farmEditor.moveFarmObject3D(initial,'pond','-5,-6');
  assert.equal(moved.changed,true,moved.message);
  assert.equal(farmEditor.getFarmObjectAtTile3D(moved.state.farmLayout,'-4,-6').id,'pond');
  assert.equal(farmEditor.canDigFarm3D(moved.state.farmLayout,'-5,-6'),false);
  assert.equal(farmEditor.canDigFarm3D(moved.state.farmLayout,'16,-7'),true);
  assert.equal(farmEditor.applyFarmEdit3D(moved.state,'fence','-5,-6',0).changed,false);
  assert.ok(farmEditor.farmObstacles3D(moved.state.farmLayout).some(o=>o.kind==='circle'&&o.radius===4.2&&o.x===-5&&o.z===-6));
  const loaded=game.normalizeGame3DSave(JSON.parse(JSON.stringify(moved.state)),2000);
  assert.deepEqual(loaded.farmLayout.pond,{x:-5,z:-6,rotation:0});
  assert.deepEqual(initial.farmLayout.pond,{x:16,z:-7,rotation:0});
});
test('pool placement rejects crops, trees, buildings, portal and farm edges', () => {
  const initial=game.pauseFarmTime3D(game.freshGame3DSave(),1000);
  for(const key of ['7,-2','0,12','-18,-14','22,22']) {
    assert.equal(farmEditor.moveFarmObject3D(initial,'pond',key).changed,false,key);
  }
  const planted={...initial,soil:{'-5,-6':{watered:false}}};
  assert.equal(farmEditor.moveFarmObject3D(planted,'pond','-5,-6').changed,false);
  assert.equal(farmEditor.deleteFarmObject3D(initial,'pond').changed,true);
  assert.deepEqual(farmEditor.normalizeFarmLayout3D({}).pond,initial.farmLayout.pond);
});


test('deleted pool stays deleted after reload and frees the old water area', () => {
  const result=farmEditor.deleteFarmObject3D(game.freshGame3DSave(),'pond');
  assert.equal(result.changed,true);
  assert.equal(result.state.farmLayout.pond,null);
  assert.equal(farmEditor.canDigFarm3D(result.state.farmLayout,'16,-7'),true);
  assert.equal(game.normalizeGame3DSave(result.state).farmLayout.pond,null);
});
test('chicken coop is available under House and cannot be entered as a player house', () => {
  assert.ok(farmEditor.FARM_HOUSE_CATALOG_3D.some(style=>style.id==='coop'));
  const result=farmEditor.createFarmHouse3D(game.pauseFarmTime3D(game.freshGame3DSave(),1000),'-5,-6',0,'coop');
  assert.equal(result.changed,true,result.message);
  assert.equal(result.state.farmLayout.buildings['house-1'].style,'coop');
  assert.equal(farmEditor.getFarmHouses3D(result.state.farmLayout).some(h=>h.id==='house-1'),false);
});
const poultry=await loadTypeScriptModule('../src/pages/game3d/poultry3D.ts');
test('buy, place, feed, lay, collect and sell eggs form a persistent chicken loop', () => {
  let state=farmEditor.createFarmHouse3D(game.pauseFarmTime3D(game.freshGame3DSave(),1000),'-5,-6',0,'coop').state;
  state={...game.resumeFarmTime3D(state,1000),coins:100};
  state=poultry.buyPoultryItem3D(state,'chicken').state;
  state=poultry.buyPoultryItem3D(state,'chickenFeed').state;
  assert.equal(state.coins,65);
  state=poultry.placeChicken3D(state,'house-1').state;
  assert.equal(state.inventory.chicken,0);
  assert.equal(state.chickens.length,1);
  assert.equal(poultry.collectEggs3D(state,'house-1',999999).changed,false,'unfed chickens cannot lay eggs');
  state=poultry.feedChickens3D(state,'house-1',1000).state;
  assert.equal(state.inventory.chickenFeed,0);
  assert.equal(poultry.collectEggs3D(state,'house-1',180999).changed,false);
  const ready=game.normalizeGame3DSave(JSON.parse(JSON.stringify(state)),181000);
  state=poultry.collectEggs3D(ready,'house-1',181000).state;
  assert.equal(state.inventory.egg,1);
  assert.equal(poultry.collectEggs3D(state,'house-1',999999).changed,false,'cannot collect twice');
  state=game.sellItem3D(state,'egg',1).state;
  assert.equal(state.inventory.egg,0);
  assert.equal(state.coins,70);
});
test('chicken capacity, feed costs, occupied-coop deletion and frozen egg time are enforced', () => {
  let state=farmEditor.createFarmHouse3D(game.pauseFarmTime3D(game.freshGame3DSave(),1000),'-5,-6',0,'coop').state;
  state={...game.resumeFarmTime3D(state,1000),inventory:{...state.inventory,chicken:7,chickenFeed:1}};
  assert.equal(poultry.placeChicken3D(state,'house').changed,false);
  state=poultry.placeChicken3D(state,'house-1').state;
  state=poultry.feedChickens3D(state,'house-1',1000).state;
  assert.equal(poultry.feedChickens3D(state,'house-1',2000).changed,false);
  assert.equal(farmEditor.deleteFarmObject3D(state,'house-1').changed,false);
  const resumed=game.resumeFarmTime3D(game.pauseFarmTime3D(state,2000),602000);
  assert.equal(poultry.collectEggs3D(resumed,'house-1',602000).changed,false);
  for(let i=1;i<6;i++)state=poultry.placeChicken3D(state,'house-1').state;
  assert.equal(poultry.placeChicken3D(state,'house-1').changed,false);
  assert.equal(poultry.feedChickens3D(state,'house-1',3000).changed,false);
  assert.equal(poultry.buyPoultryItem3D({...state,coins:0},'chicken').changed,false);
});

test('chicken return preserves inventory and malformed poultry saves normalize safely', () => {
  let state=farmEditor.createFarmHouse3D(game.pauseFarmTime3D(game.freshGame3DSave(),1000),'-5,-6',0,'coop').state;
  state={...game.resumeFarmTime3D(state,1000),inventory:{...state.inventory,chicken:1,chickenFeed:1}};
  state=poultry.placeChicken3D(state,'house-1').state;
  const returned=poultry.returnChickenToBag3D(state,'house-1');
  assert.equal(returned.state.chickens.length,0);
  assert.equal(returned.state.inventory.chicken,1);
  assert.equal(farmEditor.deleteFarmObject3D(returned.state,'house-1').changed,true);
  const corrupt={...state,chickens:[state.chickens[0],state.chickens[0],{id:'chicken-2',coopId:'missing',fedAt:0}],inventory:{...state.inventory,egg:-2,chicken:NaN},growth:{...state.growth,eggSeconds:0}};
  const restored=game.normalizeGame3DSave(corrupt,1000);
  assert.equal(restored.chickens.length,1);
  assert.equal(restored.inventory.egg,0);
  assert.equal(restored.inventory.chicken,0);
  assert.equal(restored.growth.eggSeconds,180);
});

const cats=await loadTypeScriptModule('../src/pages/game3d/cats3D.ts');
test('cat shop purchase, house placement and care preserve owned cats across reloads', () => {
  let state={...game.freshGame3DSave(),coins:100};
  state=cats.buyCat3D(state,'ginger').state;
  assert.equal(state.coins,40);
  assert.equal(state.cats[0].houseId,null);
  assert.equal(cats.placeCat3D(state,state.cats[0].id).changed,false,'place only while indoors');
  state={...state,worldId:'house'};
  state=cats.placeCat3D(state,state.cats[0].id).state;
  assert.equal(state.cats[0].houseId,'house');
  const food=state.inventory.petFood;
  state=cats.careForCat3D(state,state.cats[0].id,'feed',1000).state;
  assert.equal(state.inventory.petFood,food-1);
  state=cats.careForCat3D(state,state.cats[0].id,'pet',2000).state;
  assert.equal(state.cats[0].lastPetAt,2000);
  const loaded=game.normalizeGame3DSave(JSON.parse(JSON.stringify(state)),3000);
  assert.deepEqual(loaded.cats,state.cats);
  assert.equal(cats.returnCat3D(loaded,loaded.cats[0].id).state.cats[0].houseId,null);
});
test('cat purchases and placements enforce coins, house capacity and safe normalization', () => {
  let state={...game.freshGame3DSave(),coins:1000};
  assert.equal(cats.buyCat3D({...state,coins:0},'ginger').changed,false);
  assert.equal(cats.buyCat3D(state,'unknown').changed,false);
  for(let i=0;i<4;i++)state=cats.buyCat3D(state,'grey').state;
  state={...state,worldId:'house'};
  for(let i=0;i<3;i++)state=cats.placeCat3D(state,state.cats[i].id).state;
  assert.equal(cats.placeCat3D(state,state.cats[3].id).changed,false);
  assert.equal(cats.careForCat3D({...state,inventory:{...state.inventory,petFood:0}},state.cats[0].id,'feed',1000).changed,false);
  assert.equal(cats.careForCat3D(state,state.cats[3].id,'pet',1000).changed,false);
  const normalized=cats.normalizeCats3D([{...state.cats[0],houseId:'missing'},state.cats[0],{id:'bad',coat:'missing'}],['house'],1000);
  assert.equal(normalized.length,1);
  assert.equal(normalized[0].houseId,null,'cats whose home was removed return to the bag');
});
test('indoor cat behavior wanders, rests and follows without walking through furniture or walls', () => {
  let brain=cats.freshCatBrain3D(1);
  const modes=new Set();
  for(let i=0;i<6000;i++) {
    brain=cats.stepCatBrain3D(brain,{x:0,z:1},.1,i*.1,1,false);
    modes.add(brain.mode);
    assert.equal(cats.isCatFloorClear3D(brain.x,brain.z),true);
  }
  assert.ok(modes.has('resting'));
  assert.ok(modes.has('walking'));
  assert.ok(modes.has('following'));
  const asleep=cats.freshCatBrain3D(1);
  assert.deepEqual(cats.stepCatBrain3D(asleep,{x:0,z:0},0,0,1,false),asleep);
});

test('removing an extra house returns its cats safely to the bag', () => {
  let state=farmEditor.createFarmHouse3D(game.pauseFarmTime3D(game.freshGame3DSave(),1000),'-5,-6',0).state;
  state=cats.buyCat3D({...state,coins:100},'tuxedo').state;
  state=cats.placeCat3D({...state,worldId:'house',interiorHouseId:'house-1'},state.cats[0].id).state;
  const removed=farmEditor.deleteFarmObject3D({...state,worldId:'farm'},'house-1');
  assert.equal(removed.changed,true);
  assert.equal(removed.state.cats[0].houseId,null);
  assert.equal(removed.state.cats[0].coat,'tuxedo');
});

const houseEditor=await loadTypeScriptModule('../src/pages/game3d/houseCustomization3D.ts');
test('house doorway has a route to the wall-mounted mirror',()=>{
  assert.ok(objectWalk.findObjectWalkPath3D({x:0,z:4},{x:-5.8,z:1.5},houseEditor.houseObstacles3D(houseEditor.freshHouseLayout3D())).length>0);
});
test('house furniture placement and movement preserve structure and protect the exit', () => {
  const initial=houseEditor.freshHouseLayout3D();
  const placed=houseEditor.editHouseFurniture3D(initial,'chair','0,2',0);
  assert.equal(placed.changed,true,placed.message);
  const id=Object.keys(placed.layout.furniture).find(key=>!initial.furniture[key]);
  const moved=houseEditor.moveHouseObject3D(placed.layout,id,'-2,2',1);
  assert.equal(moved.changed,true,moved.message);
  assert.equal(moved.layout.furniture[id].rotation,1);
  assert.equal(houseEditor.moveHouseObject3D(moved.layout,id,'0,5',0).changed,false);
  assert.equal(houseEditor.editHouseFurniture3D(initial,'bed','6,0',0).changed,false);
  assert.equal(houseEditor.editHouseFurniture3D(initial,'tree','0,0',0).changed,false);
  assert.equal(initial.furniture[id],undefined,'draft changes leave the starting layout untouched');
  const obstacles=houseEditor.houseObstacles3D(moved.layout);
  assert.ok(obstacles.some(o=>o.x===-2&&o.z===2));
});
test('house layouts normalize independently and cats can be positioned without being duplicated', () => {
  const initial=houseEditor.freshHouseLayout3D();
  const point=houseEditor.moveHouseCat3D(initial,'cat-1','0,2',1);
  assert.equal(point.changed,true,point.message);
  assert.deepEqual(point.layout.catPositions['cat-1'],{x:0,z:2,rotation:1});
  assert.equal(houseEditor.moveHouseCat3D(initial,'cat-1','3,0',0).changed,false,'table blocks cat placement');
  const state={...game.freshGame3DSave(),houseLayouts:{house:point.layout},cats:[{id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null}]};
  const loaded=game.normalizeGame3DSave(JSON.parse(JSON.stringify(state)),1000);
  assert.deepEqual(loaded.houseLayouts.house.catPositions['cat-1'],point.layout.catPositions['cat-1']);
  assert.equal(loaded.cats.length,1);
  assert.equal(houseEditor.normalizeHouseLayout3D({furniture:{bad:{kind:'house',x:0,z:0,rotation:0}},catPositions:{}}).furniture.bad,undefined);
});
test('saving house furniture over the hidden player finds a safe indoor position', () => {
  let state={...game.freshGame3DSave(),worldId:'house',player:{x:0,y:0,z:2}};
  const placed=houseEditor.editHouseFurniture3D(houseEditor.freshHouseLayout3D(),'table','0,2',0);
  assert.equal(placed.changed,true);
  state={...state,houseLayouts:{house:placed.layout}};
  const safe=houseEditor.resolveHousePlayer3D(state);
  assert.notDeepEqual(safe.player,state.player);
  assert.equal(game.isPositionBlocked(safe.player,houseEditor.houseObstacles3D(placed.layout)),false);
});

test('deleting indoor furniture frees collision, survives reload and preserves the original for Undo', () => {
  const initial=houseEditor.freshHouseLayout3D();
  const result=houseEditor.deleteHouseFurniture3D(initial,'table');
  assert.equal(result.changed,true);
  assert.equal(result.layout.furniture.table,undefined);
  assert.ok(initial.furniture.table,'Undo can restore the unchanged starting layout');
  assert.deepEqual(result.layout.catPositions,initial.catPositions);
  assert.equal(houseEditor.houseObstacles3D(result.layout).some(o=>o.x===3.5&&o.z===0),false);
  assert.equal(houseEditor.normalizeHouseLayout3D(JSON.parse(JSON.stringify(result.layout))).furniture.table,undefined);
  assert.equal(houseEditor.deleteHouseFurniture3D(initial,'cat-1').changed,false);
  assert.equal(houseEditor.deleteHouseFurniture3D(initial,'mirror').changed,false);
});

const feeding=await loadTypeScriptModule('../src/pages/game3d/petFeeding3D.ts');
test('feeding through the bowl reserves food once and marks the cat fed after eating', () => {
  let state={...game.freshGame3DSave(),worldId:'house',player:{x:-2,y:0,z:3},cats:[{id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null}]};
  const result=feeding.fillPetBowl3D(state,1000);
  assert.equal(result.changed,true,result.message);
  assert.equal(result.state.inventory.petFood,state.inventory.petFood-1);
  assert.equal(result.state.cats[0].lastFedAt,null,'food is served before the cat eats');
  assert.equal(result.state.cats[0].mealServedAt,1000);
  assert.equal(feeding.fillPetBowl3D(result.state,1001).changed,false,'cannot double charge a queued meal');
  const loaded=game.normalizeGame3DSave(JSON.parse(JSON.stringify(result.state)),1100);
  assert.equal(loaded.cats[0].mealServedAt,1000);
  const completed=feeding.completeCatMeal3D(loaded,'cat-1',1000,8000);
  assert.equal(completed.state.cats[0].lastFedAt,8000);
  assert.equal(completed.state.cats[0].mealServedAt,undefined);
  assert.equal(feeding.fillPetBowl3D(completed.state,8001).changed,false,'recently fed cats do not consume another meal');
  assert.equal(feeding.completeCatMeal3D(completed.state,'cat-1',1000,8001).changed,false);
  assert.equal(feeding.fillPetBowl3D({...state,inventory:{...state.inventory,petFood:0}},1000).changed,false);
  assert.equal(feeding.fillPetBowl3D({...state,player:{x:5,y:0,z:-5}},1000).changed,false);
});
test('cat meal paths avoid furniture and the eating animation runs only after arrival', () => {
  const obstacles=houseEditor.houseObstacles3D(houseEditor.freshHouseLayout3D());
  const route=feeding.findCatMealPath3D({x:4,z:-1.5},{x:-2,z:2},obstacles);
  assert.ok(route.length>0);
  let meal=feeding.freshCatMeal3D({...cats.freshCatBrain3D(1),x:4,z:-1.5},route);
  let ate=false;
  for(let i=0;i<2000&&meal.phase!=='complete';i++){
    meal=feeding.stepCatMeal3D(meal,.1);
    assert.equal(cats.isCatFloorClear3D(meal.brain.x,meal.brain.z,obstacles),true);
    if(meal.phase==='eating'){ate=true;assert.ok(Math.hypot(meal.brain.x+2,meal.brain.z-2)<.1);}
  }
  assert.ok(ate);
  assert.equal(meal.phase,'complete');
});

test('an unreachable reserved pet meal refunds its food exactly once', () => {
  let state={...game.freshGame3DSave(),worldId:'house',player:{x:-2,y:0,z:3},cats:[{id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null}]};
  const initialFood=state.inventory.petFood;
  state=feeding.fillPetBowl3D(state,1000).state;
  const refunded=feeding.refundCatMeal3D(state,'cat-1',1000);
  assert.equal(refunded.changed,true);
  assert.equal(refunded.state.inventory.petFood,initialFood);
  assert.equal(refunded.state.cats[0].mealServedAt,undefined);
  assert.equal(feeding.refundCatMeal3D(refunded.state,'cat-1',1000).changed,false);
});

const catSleep=await loadTypeScriptModule('../src/pages/game3d/catSleep3D.ts');
test('cats tire while awake and recover only after sleeping in a bed', () => {
  const cat={id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null,rest:{energy:100,updatedAt:1000,bedId:null,sleeping:false}};
  assert.equal(catSleep.catEnergy3D(cat,181000),25);
  assert.equal(catSleep.catEnergy3D(cat,999999),0);
  const sleeping={...cat,rest:{energy:25,updatedAt:181000,bedId:'bed-1',sleeping:true}};
  assert.equal(catSleep.catEnergy3D(sleeping,211000),100);
  const updated=catSleep.setCatRest3D({...game.freshGame3DSave(),cats:[cat]},cat.id,{energy:25,bedId:'bed-1',sleeping:true},181000);
  assert.equal(updated.cats[0].rest.sleeping,true);
  const roundTrip=cats.normalizeCats3D(updated.cats,['house'],181000);
  assert.deepEqual(roundTrip[0].rest,updated.cats[0].rest);
});
test('tired cats select reachable free cat beds and reserve separate beds', () => {
  let layout=houseEditor.editHouseFurniture3D(houseEditor.freshHouseLayout3D(),'catBed','-2,2',0).layout;
  layout=houseEditor.editHouseFurniture3D(layout,'catBed','2,2',1).layout;
  const catsHere=[{id:'cat-1',houseId:'house',rest:{energy:20,updatedAt:0,bedId:null,sleeping:false}},{id:'cat-2',houseId:'house'}];
  const first=catSleep.findCatBed3D('cat-1',catsHere,layout,{x:0,z:2});
  assert.ok(first);
  catsHere[0].rest.bedId=first.id;
  const second=catSleep.findCatBed3D('cat-2',catsHere,layout,{x:0,z:2});
  assert.ok(second);
  assert.notEqual(first.id,second.id);
  assert.ok(first.path.length);
  assert.equal(catSleep.findCatBed3D('cat-1',catsHere,houseEditor.freshHouseLayout3D(),{x:0,z:2}),null);
});

test('editing freezes cat fatigue and another cat cannot claim an occupied bed', () => {
  const rest={energy:25,updatedAt:1000,bedId:'bed-1',sleeping:true};
  const first={id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null,rest};
  const second={id:'cat-2',coat:'grey',houseId:'house',lastFedAt:null,lastPetAt:null};
  const state={...game.freshGame3DSave(),worldId:'house',cats:[first,second]};
  const resumed=game.resumeFarmTime3D(game.pauseFarmTime3D(state,1000),61000);
  assert.equal(catSleep.catEnergy3D(resumed.cats[0],61000),25);
  assert.strictEqual(catSleep.setCatRest3D(state,'cat-2',{energy:20,bedId:'bed-1',sleeping:false},1000),state);
});

const objectActions=await loadTypeScriptModule('../src/pages/game3d/objectActions3D.ts');
test('cat context actions reflect distance, sleep and pending meals', () => {
  const cat={id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null};
  let state={...game.freshGame3DSave(),worldId:'house',player:{x:0,y:0,z:0},cats:[cat]};
  const target={kind:'cat',id:'cat-1',x:1,z:0};
  let actions=objectActions.houseObjectActions3D(state,target,1000);
  assert.equal(actions.find(a=>a.id==='pet').disabled,false);
  assert.ok(actions.some(a=>a.id==='call'));
  assert.equal(actions.some(a=>['move','edit','delete'].includes(a.id)),false,'gameplay actions exclude editing controls');
  actions=objectActions.houseObjectActions3D(state,{...target,x:5},1000);
  assert.equal(actions.find(a=>a.id==='pet').disabled,true);
  state={...state,cats:[{...cat,rest:{energy:25,updatedAt:1000,bedId:'bed-1',sleeping:true},mealServedAt:1000}]};
  actions=objectActions.houseObjectActions3D(state,target,1000);
  assert.equal(actions.find(a=>a.id==='call').disabled,true);
  assert.ok(actions.some(a=>a.id==='wake'));
  assert.equal(actions.find(a=>a.id==='return').disabled,true);
});
test('calling and waking a cat preserves feeding and energy without faking a pet interaction', () => {
  const cat={id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:0,lastPetAt:null,rest:{energy:25,updatedAt:1000,bedId:'bed-1',sleeping:true}};
  const state={...game.freshGame3DSave(),worldId:'house',cats:[cat]};
  assert.equal(objectActions.callCat3D(state,cat.id,2000).changed,false);
  const woke=objectActions.wakeCat3D(state,cat.id,2000);
  assert.equal(woke.changed,true);
  assert.equal(woke.state.cats[0].rest.sleeping,false);
  assert.equal(woke.state.cats[0].rest.bedId,null);
  assert.equal(woke.state.cats[0].lastPetAt,null);
  assert.equal(woke.state.cats[0].calledAt,2000);
  assert.deepEqual(woke.state.inventory,state.inventory);
});

test('normal object dialogs never offer Edit, Move or Delete', () => {
  const state={...game.freshGame3DSave(),worldId:'house',cats:[{id:'cat-1',coat:'ginger',houseId:'house',lastFedAt:null,lastPetAt:null}]};
  for(const target of [{kind:'cat',id:'cat-1',x:0,z:0},{kind:'bowl',id:'bowl',x:0,z:0},{kind:'furniture',id:'table',x:3.5,z:0},{kind:'mirror',id:'mirror',x:-5.8,z:1.5},{kind:'exit',id:'exit',x:0,z:5.6}]) {
    assert.equal(objectActions.houseObjectActions3D(state,target,1000).some(action=>['edit','move','delete'].includes(action.id)),false,target.kind);
  }
});
