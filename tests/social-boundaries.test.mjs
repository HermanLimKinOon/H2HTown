import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createJiti } from 'jiti';
import ts from 'typescript';

const jiti = createJiti(import.meta.url);
const game = await jiti.import('../src/pages/game3d/game3d.ts');
const social = await jiti.import('../src/pages/game3d/socialFarm3D.ts');
const source = await readFile(new URL('../src/pages/game3d/Game3DScreen.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('Game3DScreen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate) { let result; function visit(node) { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); } visit(ast); assert.ok(result, 'Game screen boundary callback must exist'); return result; }
function evaluate(expression, scope) {
  const code = ts.transpileModule(`const boundary = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  // Execute the production callback body, with state/ref/timer dependencies supplied by the harness.
  return Function('scope', `with (scope) { ${code}\nreturn boundary; }`)(scope);
}
function callback(name, scope) { const declaration = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name); return evaluate(declaration.initializer.getText(ast), scope); }
function harness() {
  const owned = game.freshGame3DSave(); owned.coins = 57; owned.inventory.carrot = 9; owned.soil = { '-4,2': { watered: true } }; owned.farmPausedAt = Date.now() - 5000;
  const state = { ownSave: owned, farmDraft: { oldOwner: true }, editHistory: [{ oldOwner: true }], selectedObject: 'tree-1', movingObject: true, editTile: '2,3', hoveredMeshObject: 'tree-1', actionMenu: '1,2', objectMenu: {}, travelOpen: true, inventoryOpen: true, coopOpen: 'coop', shopOpen: true, h2hOpen: true, talkingTo: 'npc', catMode: 'shop', characterEditorOpen: true, swingUntil: 900, actionTarget: { x: 1, z: 2 }, profileSelection: {}, socialFocused: true, chatFocused: true, visitSession: null };
  const writes = [], pendingTimers = new Map([[42, () => { state.ownSave.inventory.wood++; }]]);
  let discarded = 0, released = 0;
  const env = {
    useCallback: fn => fn,
    Date,
    window: { clearTimeout: id => pendingTimers.delete(id) },
    controls: { current: new Set(['w']) }, objectWalk: { current: { path: [1] } }, walkTarget: { current: { id: 'old' } },
    houseEditActions: { current: { discard() { discarded++; } } },
    paintPointer: { current: { id: 1, canvas: { hasPointerCapture: () => true, releasePointerCapture() { released++; } } } }, paintStroke: { current: { oldPaint: true } },
    chopTimer: { current: 42 }, chopBusyUntil: { current: 900 }, visitRef: { current: null },
    ownSaveRef: { get current() { return state.ownSave; } }, liveSave: { get current() { return state.ownSave; } },
    townPose: { current: { x: 1, y: 0, z: 2, moving: true, running: true } },
    saveStorage: { storage: { setItem: (key, value) => writes.push({ key, value: JSON.parse(value) }) }, key: 'game-save' }, storageOwner: 'A',
    resumeFarmTime3D: game.resumeFarmTime3D,
  };
  for (const name of Object.keys(state)) env[`set${name[0].toUpperCase()}${name.slice(1)}`] = update => { state[name] = typeof update === 'function' ? update(state[name]) : update; };
  env.setH2HOpen = env.setH2hOpen;
  env.setSave = update => { state.ownSave = typeof update === 'function' ? update(state.ownSave) : update; };
  env.setHint = value => { state.hint = value; };
  env.abandonFarmPaint = callback('abandonFarmPaint', env);
  env.changeVisit = callback('changeVisit', env);
  return { env, state, writes, pendingTimers, discarded: () => discarded, released: () => released };
}
const hostFarm = () => ({ owner_id: 'host', owner_name: 'Host', version: 1, server_now: new Date().toISOString(), harvested_carrots: 0, occupants: [], snapshot: { ...social.farmSnapshotData3D(game.freshGame3DSave()), soil: { '8,9': { watered: false } } } });

test('entering a visit discards owner edit/economy state, cancels pending chop, resumes own growth and preserves own farm', () => {
  const h = harness(), soil = h.state.ownSave.soil, inventory = { ...h.state.ownSave.inventory };
  h.env.changeVisit(hostFarm());
  assert.equal(h.env.visitRef.current.farm.owner_id, 'host');
  assert.equal(h.state.visitSession.farm.owner_id, 'host');
  assert.equal(h.state.ownSave.coins, 57); assert.deepEqual(h.state.ownSave.inventory, inventory); assert.equal(h.state.ownSave.soil, soil);
  assert.equal(h.state.ownSave.farmPausedAt, null, 'Abandoning an editor for travel must resume owner growth');
  assert.equal(h.state.farmDraft, null); assert.deepEqual(h.state.editHistory, []);
  for (const key of ['selectedObject', 'editTile', 'hoveredMeshObject', 'actionMenu', 'objectMenu', 'coopOpen', 'talkingTo', 'catMode', 'actionTarget']) assert.equal(h.state[key], null, key);
  for (const key of ['movingObject', 'travelOpen', 'inventoryOpen', 'shopOpen', 'h2hOpen', 'characterEditorOpen']) assert.equal(h.state[key], false, key);
  assert.equal(h.env.paintPointer.current, null); assert.equal(h.env.paintStroke.current, null); assert.equal(h.released(), 1); assert.equal(h.discarded(), 1);
  assert.equal(h.env.chopTimer.current, null); assert.equal(h.pendingTimers.size, 0); assert.equal(h.env.controls.current.size, 0);
  for (const timer of h.pendingTimers.values()) timer();
  assert.deepEqual(h.state.ownSave.inventory, inventory); assert.equal(h.writes.length, 0);
});
test('account boundary clears old interactions without replacing the newly loaded account farm', () => {
  const h = harness(), next = game.freshGame3DSave(); next.coins = 123; next.soil = { '12,13': { watered: false } }; h.state.ownSave = next;
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[1] && ts.isArrayLiteralExpression(node.arguments[1]) && node.arguments[1].elements.some(dependency => dependency.getText(ast) === 'gameIdentity.userId') && node.arguments[1].elements.some(dependency => dependency.getText(ast) === 'changeVisit'));
  evaluate(effect.arguments[0].getText(ast), h.env)();
  assert.equal(h.state.ownSave, next, 'Resume must preserve an unpaused newly loaded save');
  assert.equal(h.state.ownSave.coins, 123); assert.deepEqual(h.state.ownSave.soil, { '12,13': { watered: false } });
  assert.equal(h.state.profileSelection, null); assert.equal(h.state.socialFocused, false); assert.equal(h.state.farmDraft, null); assert.equal(h.pendingTimers.size, 0);
});
test('direct edit persistence refuses a visitor view and stores only the account-owned save outside visits', () => {
  const h = harness(), persist = callback('persistOwnSave', h.env), farm = hostFarm();
  h.env.visitRef.current = { farm, player: { x: 0, y: 0, z: 8 } };
  const view = social.visitFarmView3D(h.state.ownSave, farm, h.env.visitRef.current.player);
  persist(view); assert.equal(h.writes.length, 0);
  h.env.visitRef.current = null; persist(h.state.ownSave);
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].key, 'game-save-owner-A'); assert.deepEqual(h.writes[0].value.soil, h.state.ownSave.soil); assert.ok(!h.writes[0].value.soil['8,9']);
});
test('own private world keeps its initial local position but applies rejected authoritative movement corrections', () => {
  const h = harness(), correct = callback('correctCommunicationPosition', h.env);
  const original = { ...h.state.ownSave.player };
  correct({ x: 0, z: 5, accepted: true }); assert.deepEqual(h.state.ownSave.player, original);
  correct({ x: -3, z: 4, accepted: false }); assert.deepEqual(h.state.ownSave.player, { ...original, x: -3, z: 4 });
  assert.equal(h.env.townPose.current.moving, false); assert.equal(h.env.controls.current.size, 0);
});

// Execute the actual hook with a tiny useState dispatcher; no DOM/test renderer dependency.
const urls = new Map(); let hookState = [], hookIndex = 0;
const dispatcherKey = `__houseBoundaryState_${process.pid}`;
globalThis[dispatcherKey] = initial => { const index = hookIndex++; if (!(index in hookState)) hookState[index] = typeof initial === 'function' ? initial() : initial; return [hookState[index], update => { hookState[index] = typeof update === 'function' ? update(hookState[index]) : update; }]; };
async function hookModuleUrl(url) {
  if (urls.has(url.href)) return urls.get(url.href);
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const dependency = match[1] === 'react' ? `data:text/javascript;base64,${Buffer.from(`export const useState = globalThis[${JSON.stringify(dispatcherKey)}];`).toString('base64')}` : await hookModuleUrl(new URL(`${match[1]}.ts`, url));
    js = js.replaceAll(match[0], `from ${JSON.stringify(dependency)}`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`; urls.set(url.href, result); return result;
}
const { useHouseEditor3D } = await import(await hookModuleUrl(new URL('../src/pages/game3d/useHouseEditor3D.ts', import.meta.url)));
delete globalThis[dispatcherKey];
test('house editor discard clears its live draft without invoking a save/cancel callback into a new world', () => {
  hookState = []; let started = 0, ended = 0; const save = game.freshGame3DSave();
  const render = () => { hookIndex = 0; return useHouseEditor3D(save, () => { started++; }, () => { ended++; }); };
  render().start(); let editor = render(); assert.equal(editor.active, true); assert.equal(started, 1);
  editor.discard(); editor = render(); assert.equal(editor.active, false); assert.equal(editor.selected, null); assert.equal(editor.moving, false); assert.deepEqual(editor.history, []); assert.equal(ended, 0);
});
