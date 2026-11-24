import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadWorldObjects() {
  try {
    const source = await readFile(new URL('../src/pages/game/worldObjects.ts', import.meta.url), 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  } catch {
    return {};
  }
}

const world = await loadWorldObjects();

test('the Meadow Shop blocks player movement through its footprint', () => {
  assert.equal(world.pointHitsBuilding?.(8 * 48 + 46, 9 * 48 + 35), true);
});

test('the H2H Shop blocks player movement through its footprint', () => {
  assert.equal(world.pointHitsBuilding?.(14 * 48 + 60, 9 * 48 + 30), true);
});

test('the path between both shops remains walkable', () => {
  assert.equal(world.pointHitsBuilding?.(12 * 48, 9 * 48 + 30), false);
});

test('trees whose trunks overlap either shop are removed from the world tree list', () => {
  assert.deepEqual(
    world.filterTreesOutsideBuildings?.([[8, 9], [16, 4], [14, 9]]),
    [[16, 4]],
  );
});

test('a saved player position inside a shop returns to the safe starting path', () => {
  assert.deepEqual(
    world.resolveBuildingSafePosition?.({ x: 430, y: 460 }, { x: 600, y: 696 }),
    { x: 600, y: 696 },
  );
});

test('a saved player position outside both shops is preserved', () => {
  assert.deepEqual(
    world.resolveBuildingSafePosition?.({ x: 600, y: 696 }, { x: 100, y: 100 }),
    { x: 600, y: 696 },
  );
});
