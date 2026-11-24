import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadInventory() {
  try {
    const source = await readFile(new URL('../src/pages/game/inventory.ts', import.meta.url), 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  } catch {
    return {};
  }
}

const inventory = await loadInventory();

test('assigning an inventory item puts it into the selected hotbar slot', () => {
  assert.deepEqual(
    inventory.assignHotbarItem?.(['hoe', null, null, null, null, null, null, null], 1, 'axe'),
    ['hoe', 'axe', null, null, null, null, null, null],
  );
});

test('assigning an item already on the hotbar swaps the two slots', () => {
  assert.deepEqual(
    inventory.assignHotbarItem?.(['hoe', 'axe', 'seeds', null, null, null, null, null], 0, 'axe'),
    ['axe', 'hoe', 'seeds', null, null, null, null, null],
  );
});

test('a hotbar slot can be cleared', () => {
  assert.deepEqual(
    inventory.clearHotbarSlot?.(['hoe', 'axe', null, null, null, null, null, null], 1),
    ['hoe', null, null, null, null, null, null, null],
  );
});

test('invalid saved hotbars fall back to the default layout', () => {
  assert.deepEqual(inventory.normalizeHotbar?.(['hoe', 'hoe']), inventory.defaultHotbar);
});

test('valid saved hotbars preserve empty slots and custom ordering', () => {
  const custom = ['axe', null, 'hoe', 'seeds', 'carrot', 'wood', 'petFood', 'wateringCan'];
  assert.deepEqual(inventory.normalizeHotbar?.(custom), custom);
});

test('the bag keeps a 24-slot inventory independently from the 8-slot hotbar', () => {
  const slots = inventory.buildInventorySlots?.(['hoe', 'axe', 'wood'], 24);
  assert.equal(slots?.length, 24);
  assert.deepEqual(slots?.slice(0, 5), ['hoe', 'axe', 'wood', null, null]);
});
