import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadEconomy() {
  try {
    const source = await readFile(new URL('../src/pages/game/economy.ts', import.meta.url), 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  } catch {
    return {};
  }
}

const economy = await loadEconomy();

test('selling carrots removes produce and awards five coins each', () => {
  assert.deepEqual(
    economy.sellCarrots?.({ carrots: 3, coins: 2, petFood: 1 }, 2),
    { ok: true, state: { carrots: 1, coins: 12, petFood: 1 } },
  );
});

test('selling more carrots than the bag contains is rejected', () => {
  assert.deepEqual(
    economy.sellCarrots?.({ carrots: 1, coins: 2, petFood: 1 }, 2),
    { ok: false, reason: 'Not enough carrots', state: { carrots: 1, coins: 2, petFood: 1 } },
  );
});

test('buying pet food spends ten coins and adds one bag item', () => {
  assert.deepEqual(
    economy.buyPetFood?.({ carrots: 2, coins: 25, petFood: 3 }),
    { ok: true, state: { carrots: 2, coins: 15, petFood: 4 } },
  );
});

test('buying without enough coins leaves the bag unchanged', () => {
  assert.deepEqual(
    economy.buyPetFood?.({ carrots: 2, coins: 9, petFood: 3 }),
    { ok: false, reason: 'Not enough coins', state: { carrots: 2, coins: 9, petFood: 3 } },
  );
});

test('selling wood removes logs and awards one coin each', () => {
  assert.deepEqual(
    economy.sellWood?.({ carrots: 2, coins: 4, petFood: 3, wood: 5 }, 3),
    { ok: true, state: { carrots: 2, coins: 7, petFood: 3, wood: 2 } },
  );
});

test('selling more wood than the bag contains is rejected', () => {
  assert.deepEqual(
    economy.sellWood?.({ carrots: 2, coins: 4, petFood: 3, wood: 1 }, 2),
    { ok: false, reason: 'Not enough wood', state: { carrots: 2, coins: 4, petFood: 3, wood: 1 } },
  );
});
