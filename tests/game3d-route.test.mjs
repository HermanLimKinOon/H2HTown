import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadNavigation() {
  try {
    const source = await readFile(new URL('../src/pages/game3d/navigation.ts', import.meta.url), 'utf8');
    const javascript = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  } catch {
    return {};
  }
}

const navigation = await loadNavigation();

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('the 3D game has its own route and translation key', () => {
  assert.deepEqual(navigation.game3dNavigation, {
    label: 'Game 3D',
    labelKey: 'nav.game3d',
    path: '/game-3d',
  });
});

test('the 3D route never aliases the existing 2D route', () => {
  assert.notEqual(navigation.game3dNavigation?.path, '/game');
});

test('the application wires the 3D page without replacing the 2D page', async () => {
  const [router, navbar, homeData] = await Promise.all([
    readProjectFile('src/router/config.tsx'),
    readProjectFile('src/components/feature/Navbar.tsx'),
    readProjectFile('src/mocks/homeData.ts'),
  ]);

  assert.match(router, /import Game from ["']\.\.\/pages\/game\/page["']/);
  assert.match(router, /path:\s*["']\/game["'][\s\S]*?element:\s*<Game\s*\/>/);
  assert.match(router, /import Game3D from ["']\.\.\/pages\/game3d\/page["']/);
  assert.match(router, /path:\s*["']\/game-3d["'][\s\S]*?element:\s*<Game3D\s*\/>/);
  assert.match(navbar, /["']Game 3D["']:\s*["']\/game-3d["']/);
  assert.match(homeData, /label:\s*["']Game 3D["'],\s*href:\s*["']\/game-3d["']/);
});

test('the 3D renderer dependencies are declared', async () => {
  const manifest = JSON.parse(await readProjectFile('package.json'));
  assert.equal(typeof manifest.dependencies?.three, 'string');
  assert.equal(typeof manifest.dependencies?.['@react-three/fiber'], 'string');
  assert.equal(typeof manifest.dependencies?.['@react-three/drei'], 'string');
});
