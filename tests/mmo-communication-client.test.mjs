import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const urls = new Map();
async function moduleUrl(url) {
  if (urls.has(url.href)) return urls.get(url.href);
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)]) js = js.replaceAll(match[0], `from ${JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`, url)))}`);
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`; urls.set(url.href, result); return result;
}
const { createMmoCommunicationClient3D } = await import(await moduleUrl(new URL('../src/pages/game3d/mmoCommunicationClient3D.ts', import.meta.url)));
const pause = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve,reject; const promise = new Promise((done,fail) => { resolve = done;reject=fail; }); return { promise, resolve,reject }; };
function message(id, extra = {}) { return { id, channel: 'local', sender_id: 'alice', sender_name: 'Alice', body: 'Hello', kind: 'text', created_at: new Date(Date.parse('2026-11-20T06:00:00Z') + Number(id) * 1000).toISOString(), group_id: null, recipient_id: null, world_id: 'town', server_id: 'local-1', origin: null, ...extra }; }
const permissions = { read: true, write: true, invite: true };
const group = { id: 'group-1', kind: 'guild', name: 'Guild', role: 'owner', permissions: { owner: permissions, officer: permissions, member: permissions }, my_permissions: permissions, members: [] };
function playerState(extra = {}) { return { profile: { id: 'self', name: 'Me', world_id: 'town' }, config: { max_length: 400, local_radius: 30 }, groups: [], invitations: [], conversations: [], blocked: [], unread_private: 0, ...extra }; }
function setup(t, extra = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [], channels = [], snapshots = [], corrections = [];
  let state = extra.state ?? playerState();
  let handler = extra.handler;
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      const override = handler?.(name, args); if (override !== undefined) return await override;
      if (name === 'mmo_connect') return { data: { ...state, presence: { x: 0, z: 5, seq: 0, world_id: 'town', server_id: 'local-1' } }, error: null };
      if (name === 'mmo_tick') return { data: { x: args.p_x, z: args.p_z, seq: args.p_seq, accepted: true, world_id: 'town', server_id: 'local-1' }, error: null };
      if (name === 'mmo_state' || name === 'mmo_social') return { data: state, error: null };
      if (name === 'mmo_history' || name === 'mmo_find_players') return { data: [], error: null };
      return { data: true, error: null };
    },
    channel(topic, config) { const instance = { topic, config, on(event, filter, receive) { this.receive = receive; return this; }, subscribe(status) { this.status = status; status('SUBSCRIBED'); return this; } }; channels.push(instance); return instance; },
    async removeChannel(instance) { instance.removed = true; return 'ok'; },
  };
  const service = createMmoCommunicationClient3D({ client, userId: 'self', name: 'Me', world: 'town', movementOwned:()=>Boolean(extra.movementOwned?.()), getPose: () => ({ x: 2, z: 5 }), onCorrection: correction => corrections.push(correction), onChange: snapshot => snapshots.push(snapshot) });
  t.after(async () => { await service.stop(); });
  return { service, calls, channels, snapshots, corrections, setHandler(next) { handler = next; }, setState(next) { state = next; } };
}

test('connect uses a server lease and private receive-only inbox, and bootstraps offline PMs without marking read', async t => {
  const state = playerState({ conversations: [{ peer_id: 'alice', peer_name: 'Alice', unread: 4, online: false }], unread_private: 4 });
  const env = setup(t, { state, handler(name, args) { if (name === 'mmo_history' && args.p_channel === 'private') return { data: [message('1', { channel: 'private', recipient_id: 'self' })] }; } });
  await env.service.start(); await pause();
  const connected = env.calls.find(call => call.name === 'mmo_connect');
  assert.match(connected.args.p_client, /^[\da-f-]{36}$/);
  assert.deepEqual(Object.keys(connected.args).sort(), ['p_client', 'p_name', 'p_server', 'p_world']);
  assert.equal(env.channels[0].topic, 'mmo:inbox:self');
  assert.equal(env.channels[0].config.config.private, true);
  assert.equal(env.service.snapshot().status, 'online');
  assert.equal(env.service.snapshot().state.unread_private, 4);
  assert.equal(env.service.snapshot().messages[0].receivedAt, undefined);
  assert.equal(env.calls.some(call => call.name === 'mmo_read'), false);
  assert.equal(env.corrections[0].z, 5);
  env.channels[0].receive({ payload: { type: 'message', message: message('1', { channel: 'private', recipient_id: 'self' }) } });
  assert.equal(env.service.snapshot().messages.length, 1);
  assert.equal(typeof env.service.snapshot().messages[0].receivedAt, 'number');
});
test('ticks never overlap and rejected movement applies the authoritative correction', async t => {
  const tick = deferred(); let pending = true;
  const env = setup(t, { handler(name) { if (name === 'mmo_tick' && pending) return tick.promise; } });
  await env.service.start(); await pause();
  t.mock.timers.tick(2000); await pause();
  assert.equal(env.calls.filter(call => call.name === 'mmo_tick').length, 1);
  pending = false; tick.resolve({ data: { x: 0, z: 5, seq: 1, accepted: false, world_id: 'town', server_id: 'local-1' } }); await pause();
  assert.equal(env.corrections.at(-1).accepted, false);
  t.mock.timers.tick(250); await pause();
  assert.equal(env.calls.filter(call => call.name === 'mmo_tick').length, 2);
});
test('failed sends reuse their idempotency nonce and reconcile optimistic messages without client recipient lists', async t => {
  let attempts = 0;
  const env = setup(t, { handler(name, args) { if (name === 'mmo_send') { attempts++; return attempts === 1 ? { error: { message: 'Network connection failed' } } : { data: message('5', { sender_id: 'self', sender_name: 'Me', body: args.p_body, nonce: args.p_nonce }) }; } } });
  await env.service.start(); await pause();
  assert.equal(await env.service.snapshot().send('local', 'Hello'), false);
  assert.equal(env.service.snapshot().messages[0].failed, true);
  assert.equal(await env.service.snapshot().send('local', 'Hello'), true);
  const sends = env.calls.filter(call => call.name === 'mmo_send');
  assert.equal(sends[0].args.p_nonce, sends[1].args.p_nonce);
  assert.deepEqual(Object.keys(sends[0].args).sort(), ['p_body', 'p_channel', 'p_kind', 'p_nonce', 'p_target']);
  assert.deepEqual(env.service.snapshot().messages.map(item => item.id), ['5']);
  env.channels[0].receive({ payload: { type: 'message', message: message('5', { sender_id: 'self', nonce: sends[0].args.p_nonce }) } });
  assert.equal(env.service.snapshot().messages.length, 1);
});
test('history cursors use the oldest known server tuple and active-thread loading cannot be cleared by another thread', async t => {
  const env = setup(t); await env.service.start(); await pause();
  const local = deferred(), world = deferred();
  env.setHandler((name, args) => { if (name === 'mmo_history') return args.p_channel === 'local' ? local.promise : world.promise; });
  const first = env.service.snapshot().loadHistory('local');
  const second = env.service.snapshot().loadHistory('world');
  local.resolve({ data: [message('1')] }); await first;
  assert.equal(env.service.snapshot().loadingHistory, true);
  world.resolve({ data: [message('2', { channel: 'world' })] }); await second;
  assert.equal(env.service.snapshot().loadingHistory, false);
  env.setHandler(name => name === 'mmo_history' ? { data: [] } : undefined);
  await env.service.snapshot().loadHistory('local', undefined, true);
  const cursor = env.calls.filter(call => call.name === 'mmo_history').at(-1).args;
  assert.equal(cursor.p_before, message('1').created_at); assert.equal(cursor.p_before_id, '1');
  assert.equal(env.service.snapshot().hasMore, false);
});
test('membership removal purges cached group history and rejects late group history responses', async t => {
  const env = setup(t, { state: playerState({ groups: [group] }), handler(name, args) { if (name === 'mmo_history' && args.p_channel === 'guild') return { data: [message('1', { channel: 'guild', group_id: 'group-1' })] }; } });
  await env.service.start(); await pause(); assert.equal(env.service.snapshot().messages.length, 1);
  const late = deferred(); env.setHandler(name => name === 'mmo_history' ? late.promise : undefined);
  const loading = env.service.snapshot().loadHistory('guild');
  env.setState(playerState());
  await env.service.snapshot().social({ action: 'leave', kind: 'guild', group: 'group-1' });
  assert.equal(env.service.snapshot().messages.length, 0);
  late.resolve({ data: [message('2', { channel: 'guild', group_id: 'group-1' })] }); await loading;
  assert.equal(env.service.snapshot().messages.length, 0);
});
test('read acknowledgement requires a known displayed conversation ID, and offline player search uses server lookup', async t => {
  const env = setup(t, { handler(name) { if (name === 'mmo_find_players') return { data: [{ id: 'alice', name: 'Alice', online: false }] }; } });
  await env.service.start(); await pause();
  env.channels[0].receive({ payload: { type: 'message', message: message('9', { channel: 'private', recipient_id: 'self' }) } });
  await env.service.snapshot().markRead('private', 'bob', '9');
  await env.service.snapshot().markRead('private', 'alice', '999');
  assert.equal(env.calls.some(call => call.name === 'mmo_read'), false);
  await env.service.snapshot().markRead('private', 'alice', '9');
  assert.deepEqual(env.calls.find(call => call.name === 'mmo_read').args, { p_channel: 'private', p_target: 'alice', p_through: '9' });
  assert.deepEqual(await env.service.snapshot().findPlayers('Alice'), [{ id: 'alice', name: 'Alice', online: false }]);
});
test('unexpected channel closure reconnects with a new lease and cleanup leaves only captured lease IDs', async t => {
  const env = setup(t); await env.service.start(); await pause();
  const old = env.calls.find(call => call.name === 'mmo_connect').args.p_client;
  env.channels[0].status('CLOSED');
  assert.equal(env.service.snapshot().status, 'offline');
  t.mock.timers.tick(499); await pause(); assert.equal(env.channels.length, 1);
  t.mock.timers.tick(1); await pause();
  assert.equal(env.channels.length, 2);
  const latest = env.calls.filter(call => call.name === 'mmo_connect').at(-1).args.p_client;
  assert.notEqual(latest, old);
  assert.equal(env.calls.find(call => call.name === 'mmo_leave').args.p_client, old);
  await env.service.stop();
  const count = env.calls.length; t.mock.timers.tick(60000); await pause();
  assert.equal(env.calls.length, count);
  assert.equal(env.calls.filter(call => call.name === 'mmo_leave').at(-1).args.p_client, latest);
});
test('stopping during connect waits for completion and cleans its lease without publishing stale state', async t => {
  const delayed = deferred();
  const env = setup(t, { handler(name) { if (name === 'mmo_connect') return delayed.promise; } });
  const started = env.service.start(); await pause(); const before = env.snapshots.length;
  const stopped = env.service.stop();
  delayed.resolve({ data: { ...playerState(), presence: { x: 0, z: 5, seq: 0, world_id: 'town', server_id: 'local-1' } } });
  await Promise.all([started, stopped]);
  assert.equal(env.snapshots.length, before); assert.equal(env.channels.length, 0);
  assert.ok(env.calls.some(call => call.name === 'mmo_leave'));
});
test('a late authoritative delivery clears failed optimistic state and its retry nonce', async t => {
  let fail = true;
  const env = setup(t, { handler(name, args) { if (name === 'mmo_send') return fail ? { error: { message: 'Network connection failed' } } : { data: message('21', { sender_id: 'self', nonce: args.p_nonce }) }; } });
  await env.service.start(); await pause();
  await env.service.snapshot().send('local', 'Hello');
  const original = env.calls.find(call => call.name === 'mmo_send').args.p_nonce;
  env.channels[0].receive({ payload: { type: 'message', message: message('20', { sender_id: 'self', nonce: original }) } });
  assert.deepEqual(env.service.snapshot().messages.map(item => item.id), ['20']);
  fail = false; await env.service.snapshot().send('local', 'Hello');
  assert.notEqual(env.calls.filter(call => call.name === 'mmo_send').at(-1).args.p_nonce, original);
});
test('older pagination survives a full recent cache, advances twice and keeps requested old pages visible', async t => {
  const env = setup(t, { handler(name, args) {
    if (name !== 'mmo_history' || args.p_channel !== 'local') return;
    const before = args.p_before_id ? Number(args.p_before_id) : 91;
    return { data: Array.from({ length: 30 }, (_, i) => message(String(before - 1 - i))) };
  } });
  await env.service.start(); await pause();
  for (let id = 1001; id <= 1650; id++) env.channels[0].receive({ payload: { type: 'message', message: message(String(id), { channel: 'world' }) } });
  assert.equal(env.service.snapshot().messages.length, 600);
  assert.ok(!env.service.snapshot().messages.some(item => item.channel === 'local'));
  await env.service.snapshot().loadHistory('local', undefined, true);
  assert.ok(env.service.snapshot().messages.some(item => item.id === '31'));
  await env.service.snapshot().loadHistory('local', undefined, true);
  const requests = env.calls.filter(call => call.name === 'mmo_history' && call.args.p_before_id);
  assert.deepEqual(requests.slice(-2).map(call => call.args.p_before_id), ['61', '31']);
  assert.ok(env.service.snapshot().messages.some(item => item.id === '1'));
  assert.ok(env.service.snapshot().messages.some(item => item.id === '31'));
  assert.ok(env.service.snapshot().messages.length <= 1200);
  await env.service.snapshot().loadHistory('local');
  assert.ok(env.service.snapshot().messages.length <= 600, 'Fresh history releases the older browsing window');
});
test('an in-flight send interrupted by reconnect becomes retryable with its original nonce', async t => {
  const pending = deferred(); let delayed = true;
  const env = setup(t, { handler(name, args) { if (name === 'mmo_send') return delayed ? pending.promise : { data: message('25', { sender_id: 'self', nonce: args.p_nonce }) }; } });
  await env.service.start(); await pause();
  const first = env.service.snapshot().send('local', 'Hello');
  const nonce = env.calls.find(call => call.name === 'mmo_send').args.p_nonce;
  env.channels[0].status('CLOSED');
  assert.equal(env.service.snapshot().messages[0].failed, true);
  pending.resolve({ error: { message: 'Network failed' } }); await first;
  t.mock.timers.tick(500); await pause(); delayed = false;
  assert.equal(await env.service.snapshot().send('local', 'Hello'), true);
  assert.equal(env.calls.filter(call => call.name === 'mmo_send').at(-1).args.p_nonce, nonce);
  assert.deepEqual(env.service.snapshot().messages.map(item => item.id), ['25']);
});

test('Colyseus ownership suspends browser ticks and ignores a delayed legacy correction',async t=>{
 let owned=false;const pending=deferred();let delayed=true;
 const env=setup(t,{movementOwned:()=>owned,handler(name){if(name==='mmo_tick'&&delayed)return pending.promise;}});
 await env.service.start();await pause();const corrections=env.corrections.length;
 owned=true;delayed=false;pending.resolve({data:{x:-4,z:5,seq:8,accepted:false,world_id:'town',server_id:'local-1'}});await pause();
 assert.equal(env.corrections.length,corrections,'late HTTP response must not reverse the active movement authority');
 t.mock.timers.tick(1000);await pause();assert.equal(env.calls.filter(c=>c.name==='mmo_tick').length,1);
 owned=false;t.mock.timers.tick(250);await pause();assert.equal(env.calls.filter(c=>c.name==='mmo_tick').length,2,'legacy movement resumes after room disconnect');
 assert.equal(env.calls.filter(c=>c.name==='mmo_tick').at(-1).args.p_seq,9);
});

test('a delayed HTTP failure cannot replace a healthy Colyseus-owned session',async t=>{
 let owned=false;const pending=deferred();const env=setup(t,{movementOwned:()=>owned,handler(name){if(name==='mmo_tick')return pending.promise;}});
 await env.service.start();await pause();owned=true;pending.reject(new Error('Delayed HTTP timeout'));await pause();
 assert.equal(env.service.snapshot().status,'online');assert.equal(env.calls.filter(c=>c.name==='mmo_connect').length,1);
});
