import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModel() {
  try {
    const source = await readFile(new URL('../src/pages/game/h2hShopModel.ts', import.meta.url), 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  } catch {
    return {};
  }
}

const model = await loadModel();
const catalog = [
  { id: 11, name: 'First product' },
  { id: 22, name: 'Selected product' },
];

test('the selected product remains in the preview when it still exists', () => {
  assert.deepEqual(model.resolveShopProduct?.(catalog, 22), catalog[1]);
});

test('a refreshed catalog falls back to its first product when the old selection disappears', () => {
  assert.deepEqual(model.resolveShopProduct?.(catalog, 99), catalog[0]);
});

test('an empty catalog has no product preview', () => {
  assert.equal(model.resolveShopProduct?.([], 11), null);
});
