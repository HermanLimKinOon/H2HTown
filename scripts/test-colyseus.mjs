import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Client as ColyseusClient } from '@colyseus/sdk';
import { createJiti } from 'jiti';

// Disposable accounts, public credentials and loopback services only. No privileged key is used.
const settings = {};
for (const file of ['../.env', '../.env.local', '../local.env']) {
  try {
    for (const line of (await readFile(new URL(file, import.meta.url), 'utf8')).split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) settings[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (reason) { if (reason.code !== 'ENOENT') throw new Error('Cannot read local public configuration.'); }
}
const supabaseUrl = settings.VITE_PUBLIC_SUPABASE_URL ?? settings.VITE_SUPABASE_URL ?? settings.SUPABASE_URL;
const publicKey = settings.VITE_PUBLIC_SUPABASE_ANON_KEY ?? settings.VITE_SUPABASE_ANON_KEY ?? settings.SUPABASE_ANON_KEY;
const endpoint = process.env.COLYSEUS_TEST_ENDPOINT ?? 'http://127.0.0.1:2567';
const movementUrl = new URL(endpoint);
assert.ok(movementUrl.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(movementUrl.hostname) && !movementUrl.username && !movementUrl.password && movementUrl.pathname === '/' && !movementUrl.search && !movementUrl.hash, 'Only a loopback Colyseus test endpoint is allowed.');
const parsed = new URL(supabaseUrl);
assert.ok(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) && !parsed.username && !parsed.password, 'Only a loopback Supabase instance is allowed.');
if (!publicKey?.startsWith('sb_publishable_')) {
  let role;
  try { role = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()).role; } catch { /* Reject malformed or privileged keys below. */ }
  assert.equal(role, 'anon', 'Use only a public anonymous Supabase key.');
}
const jiti = createJiti(import.meta.url);
const { freshGame3DSave } = await jiti.import('../src/pages/game3d/game3d.ts');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const credentials = [publicKey];
const safe = value => {
  let text = String(value ?? 'Live multiplayer test failed');
  for (const secret of credentials) if (secret) text = text.replaceAll(secret, '[redacted]');
  return text.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 240);
};
const actors = [], extraRooms = new Set();
const phase = process.env.COLYSEUS_TEST_PHASE ?? 'all';
assert.ok(['all', 'pond'].includes(phase), 'COLYSEUS_TEST_PHASE must be all or pond.');
let lastCapacity = null;
const prefix = `Colyseus smoke ${crypto.randomUUID().slice(0, 6)}`;
async function rpc(actor, name, args) {
  const response = await actor.supabase.rpc(name, args);
  if (response.error) throw new Error(`${name}: ${safe(response.error.message)}`);
  return response.data;
}
async function waitFor(check, description, timeout = 10000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) { if (await check()) return; await pause(35); }
  throw new Error(`Timed out: ${description}`);
}
async function health() {
  const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, 'Local Colyseus health endpoint must be ready');
  const value = await response.json(); lastCapacity = value.players; return value;
}
async function tick(actor) {
  if (actor.stopped) return;
  if (!actor.transitioning && actor.lease && !actor.snapshot?.positionWriter) {
    const lease = actor.lease;
    actor.tickInFlight = (async () => {
      const next = await rpc(actor, 'mmo_tick', { p_client: lease, p_seq: ++actor.databaseSeq, p_x: actor.pose.x, p_z: actor.pose.z });
      if (actor.lease === lease && next.accepted === false && !actor.snapshot?.positionWriter) actor.pose = { ...actor.pose, x: next.x, z: next.z };
    })();
    try { await actor.tickInFlight; } catch (reason) { if (!actor.transitioning && !actor.stopped) actor.tickError = safe(reason.message); }
    finally { actor.tickInFlight = null; }
  }
  if (!actor.stopped) actor.timer = setTimeout(() => { void tick(actor); }, 500);
}
async function connectWorld(actor, world) {
  actor.transitioning = true;
  try {
    await actor.tickInFlight;
    const lease = crypto.randomUUID();
    const connected = await rpc(actor, 'mmo_connect', { p_client: lease, p_name: actor.name, p_world: world, p_server: 'local-1' });
    actor.world = world === 'farm' ? `farm:${actor.id}` : world; actor.lease = lease; actor.databaseSeq = 0;
    actor.pose = { seq: 0, x: connected.presence.x, y: 0, z: connected.presence.z, yaw: 0, moving: false, running: false };
    actor.tickError = '';
    await rpc(actor, 'mmo_tick', { p_client: lease, p_seq: ++actor.databaseSeq, p_x: actor.pose.x, p_z: actor.pose.z });
  } finally { actor.transitioning = false; }
}
async function publish(actor) {
  const { farmLayout, soil, plants, choppedTrees, growth, chickens, farmPausedAt } = freshGame3DSave();
  await rpc(actor, 'mmo_farm_publish', { p_snapshot: { farmLayout, soil, plants, choppedTrees, growth, chickens, farmPausedAt } });
}
async function join(actor, options = {}) {
  const verified = await rpc(actor, 'mmo_room_session');
  assert.equal(verified.world, actor.world, `Actor ${actors.indexOf(actor) + 1} has a mismatched verified world`);
  if (actor.world !== 'town') assert.ok(verified.farmLayout && typeof verified.farmLayout === 'object', 'Farm fixture must publish a layout before joining');
  let room;
  try { room = await actor.colyseus.joinOrCreate('h2h_world', { world: actor.world, serverId: 'local-1', ...options }); }
  catch (reason) { throw new Error(`Actor ${actors.indexOf(actor) + 1} ${actor.world === 'town' ? 'town' : 'farm'} join: ${safe(reason.message)}${actor.tickError ? `; keepalive: ${actor.tickError}` : ''}`); }
  actor.room = room; actor.snapshot = null; actor.roomSeq = 0; actor.corrections = []; actor.left = null;
  extraRooms.add(room);
  room.onMessage('snapshot', snapshot => { if (actor.room === room) actor.snapshot = snapshot; });
  room.onMessage('correction', correction => { if (actor.room === room) { actor.corrections.push(correction); actor.pose = { ...actor.pose, ...correction }; } });
  room.onError(() => {});
  room.onLeave((code, reason) => { extraRooms.delete(room); if (actor.room === room) { actor.left = { code, reason: safe(reason), at: performance.now() }; actor.room = null; } });
  await waitFor(() => actor.snapshot?.selfId === room.sessionId, 'first verified room snapshot');
  return room;
}
async function leave(actor) { const room = actor.room; if (room) { await room.leave(); await waitFor(() => actor.room !== room, 'room leave acknowledgement'); } }
async function rejectedJoin(actor, options, description, token) {
  const client = token === undefined ? actor.colyseus : new ColyseusClient(endpoint);
  if (token !== undefined) client.auth.token = token;
  let room, denied = false;
  try { room = await client.joinOrCreate('h2h_world', { world: actor.world, serverId: 'local-1', ...options }); }
  catch (reason) { denied = true; assert.ok(typeof reason.message === 'string' && reason.message.length, `${description} should return a useful reason`); }
  finally { if (room) await room.leave(); }
  assert.ok(denied, description);
}
const contains = (actor, id) => actor.snapshot?.players.some(peer => peer.userId === id);
function pose(actor, change = {}) { const proposed = { ...actor.pose, seq: ++actor.roomSeq, ...change }; actor.room.send('pose', proposed); return proposed; }

try {
  const initial = await health(); assert.equal(initial.limit, 10); assert.equal(initial.players, 0, 'Close existing local game clients before the exact-capacity smoke test.');
  for (let index = 0; index < (phase === 'pond' ? 2 : 11); index++) {
    const supabase = createClient(supabaseUrl, publicKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `colyseus-smoke-${crypto.randomUUID()}` } });
    const signed = await supabase.auth.signUp({ email: `colyseus-smoke-${crypto.randomUUID()}@example.test`, password: `Local-${crypto.randomUUID()}!` });
    if (signed.error || !signed.data.session) throw new Error(`Disposable local signup failed: ${safe(signed.error?.message ?? 'No session')}`);
    const token = signed.data.session.access_token; credentials.push(token);
    const colyseus = new ColyseusClient(endpoint); colyseus.auth.token = token;
    const actor = { supabase, colyseus, id: signed.data.user.id, name: `${prefix} ${index + 1}`, stopped: false, transitioning: false, tickInFlight: null, databaseSeq: 0, roomSeq: 0, room: null, snapshot: null, corrections: [], left: null };
    actors.push(actor); await connectWorld(actor, 'town'); void tick(actor);
  }
  const [host, guest] = actors;
  await rejectedJoin(host, {}, 'Unauthenticated/invalid tokens must not join', 'invalid-token');
  await rejectedJoin(host, { serverId: 'foreign-server' }, 'A client cannot spoof its server scope');
  await rejectedJoin(host, { world: `farm:${guest.id}` }, 'Town lease cannot claim an unrelated farm room');
  const forbidden = await host.supabase.rpc('mmo_connect', { p_client: crypto.randomUUID(), p_name: host.name, p_world: `farm:${guest.id}`, p_server: 'local-1' });
  assert.ok(forbidden.error, 'An uninvited farm must fail checked database authorization');
  await join(host); await join(guest);
  await waitFor(() => contains(host, guest.id) && contains(guest, host.id), 'two verified town peers see one another');
  assert.equal(host.snapshot.world, 'town'); assert.equal(host.snapshot.serverId, 'local-1');
  assert.ok(host.snapshot.players.every(peer => peer.clientId && peer.userId));
  console.log('PASS: verified JWTs join town; invalid authentication, foreign scope and uninvited farm joins are rejected.');

  await pause(350);
  const moved = pose(host, { x: .5, moving: true });
  await waitFor(() => guest.snapshot?.players.some(peer => peer.userId === host.id && Math.abs(peer.x - .5) < .01), 'bounded movement reaches the other peer');
  host.pose = { ...moved, moving: false };
  for (const invalid of [{ x: 22, z: 22 }, { x: 'not-a-number' }, { userId: guest.id, name: 'FORGED NAME', clientId: 'forged-session' }]) {
    const before = host.corrections.length; pose(host, invalid);
    await waitFor(() => host.corrections.length > before, 'invalid, teleporting or self-spoofed movement correction');
    assert.ok(Math.abs(host.corrections.at(-1).x - .5) < .01);
  }
  await waitFor(() => guest.snapshot?.players.some(peer => peer.userId === host.id && peer.name === host.name && Math.abs(peer.x - .5) < .01), 'authoritative identity and position survive spoof attempts');
  assert.ok(!guest.snapshot.players.some(peer => peer.name === 'FORGED NAME' || peer.clientId === 'forged-session'));
  console.log('PASS: peer movement propagates; teleport, malformed coordinates and identity injection receive authoritative corrections.');

  await rpc(host, 'mmo_social', { p_action: 'block', p_kind: 'party', p_target: guest.id });
  await waitFor(() => !contains(host, guest.id) && !contains(guest, host.id), 'bilateral block snapshot filtering', 4000);
  await rpc(host, 'mmo_social', { p_action: 'unblock', p_kind: 'party', p_target: guest.id });
  await waitFor(() => contains(host, guest.id) && contains(guest, host.id), 'unblocked peers become visible', 4000);
  console.log('PASS: authoritative block changes filter snapshots in both directions.');

  if (phase === 'all') {
  await publish(actors[2]); await connectWorld(actors[2], 'farm');
  for (let index = 2; index < 10; index++) await join(actors[index]);
  await waitFor(async () => (await health()).players === 10, 'ten global seats across town and farm rooms');
  assert.equal(host.snapshot.count, host.snapshot.players.length);
  assert.equal(actors[2].snapshot.count, actors[2].snapshot.players.length);
  assert.equal(actors[2].snapshot.players.length, 1); assert.equal(actors[2].snapshot.players[0].userId, actors[2].id);
  assert.ok(!contains(host, actors[2].id), 'Town snapshots must not contain unrelated farm occupants');
  await publish(actors[10]); await connectWorld(actors[10], 'farm');
  await rejectedJoin(actors[10], {}, 'Eleventh user must be rejected even in a distinct authorized farm room');
  assert.equal((await health()).players, 10);
  await leave(actors[9]);
  await waitFor(async () => (await health()).players === 9, 'global seat is released after leave');
  await join(actors[10]); await waitFor(async () => (await health()).players === 10, 'released seat can be used by another world');
  await leave(actors[10]); await join(actors[9]);
  assert.equal((await health()).players, 10);
  console.log('PASS: the ten-player cap is process-wide, rooms are isolated, and leaving frees a reusable seat.');
  await Promise.all(actors.slice(2).map(leave));
  await waitFor(async () => (await health()).players === 2, 'capacity is cleared for farm travel');
  // Capacity fixtures are finished; keep only the two farm participants' leases alive.
  for (const actor of actors.slice(2)) {
    actor.stopped = true; clearTimeout(actor.timer);
    await actor.tickInFlight?.catch(() => {});
    if (actor.lease) await rpc(actor, 'mmo_leave', { p_client: actor.lease });
    actor.lease = null;
  }
  }

  await publish(host);
  await rpc(host, 'mmo_friend_action', { p_action: 'request', p_target: guest.id });
  await rpc(guest, 'mmo_friend_action', { p_action: 'accept', p_target: host.id });
  await rpc(host, 'mmo_farm_invite', { p_target: guest.id });
  const state = await rpc(guest, 'mmo_social_state');
  const invitation = state.farm_invitations.find(item => item.owner_id === host.id); assert.ok(invitation);
  await rpc(guest, 'mmo_farm_invitation', { p_id: invitation.id, p_accept: true });
  await leave(host); await leave(guest);
  await connectWorld(host, 'farm'); await connectWorld(guest, `farm:${host.id}`);
  await join(host); await join(guest);
  await waitFor(() => contains(host, guest.id) && contains(guest, host.id), 'invited friend and host share the same farm room');
  assert.equal(host.snapshot.world, `farm:${host.id}`); assert.equal(guest.snapshot.world, host.snapshot.world);
  console.log('PASS: an explicitly accepted friend invitation permits scoped host/guest farm visibility.');

  // Owner layout changes must relocate through SQL and converge with live movement authority.
  for (const x of [2, 4, 6, 8]) {
    await pause(650);
    const proposed = pose(guest, { x, z: 8, moving: true });
    await waitFor(() => host.snapshot?.players.some(peer => peer.userId === guest.id && Math.abs(peer.x - x) < .01 && Math.abs(peer.z - 8) < .01), 'bounded guest walk to future pond site');
    guest.pose = { ...proposed, moving: false };
  }
  await pause(600);
  const beforeLayout = await rpc(guest, 'mmo_room_session');
  assert.ok(Number.isSafeInteger(beforeLayout.roomRevision), 'SQL must expose a trusted roomRevision before relocation testing');
  const publishedFarm = await rpc(host, 'mmo_farm_state', { p_owner: host.id, p_pose: null });
  const changed = { ...publishedFarm.snapshot, farmLayout: { ...publishedFarm.snapshot.farmLayout, pond: { x: 8, z: 8, rotation: 0 } } };
  await rpc(host, 'mmo_farm_publish', { p_snapshot: changed });
  let relocated;
  await waitFor(async () => {
    relocated = await rpc(guest, 'mmo_room_session');
    return relocated.roomRevision > beforeLayout.roomRevision && Math.hypot(relocated.x - 8, relocated.z - 8) > 4.65;
  }, 'server-owned safe relocation and revision after a pond moves over a guest', 4000);
  await waitFor(() => host.snapshot?.players.some(peer => peer.userId === guest.id && Math.hypot(peer.x - relocated.x, peer.z - relocated.z) < .01) && guest.corrections.some(correction => Math.hypot(correction.x - relocated.x, correction.z - relocated.z) < .01), 'SQL and Colyseus converge on the same corrected guest position', 4000);
  await pause(800);
  const stable = await rpc(guest, 'mmo_room_session');
  assert.ok(Math.hypot(stable.x - relocated.x, stable.z - relocated.z) < .01, 'Keepalive must not drag the guest back into the edited pond');
  assert.ok(guest.room && host.room, 'A safe layout correction must preserve both room sessions');
  console.log('PASS: moving a pond over a guest converges SQL, live peer snapshots and client correction without position oscillation.');

  const revokedAt = performance.now();
  await rpc(host, 'mmo_farm_revoke', { p_guest: guest.id });
  await waitFor(() => guest.left && !contains(host, guest.id), 'revoked visitor is disconnected and removed from host snapshots', 3500);
  const delay = performance.now() - revokedAt; assert.ok(delay <= 3500, 'Revocation must converge within two seconds plus local network margin');
  await rejectedJoin(guest, { world: `farm:${host.id}` }, 'Revoked visitor cannot reconnect to the host room');
  assert.ok((await guest.supabase.rpc('mmo_farm_state', { p_owner: host.id, p_pose: null })).error);
  console.log(`PASS: revoked farm access disconnects the visitor and denies reconnect/state reads (${Math.round(delay)} ms).`);
  for (const actor of actors) assert.equal(actor.tickError, '', 'Lease keepalive must remain healthy');
} catch (reason) {
  console.error(`FAIL: ${safe(reason instanceof Error ? reason.message : reason)}`);
  console.error(`Diagnostics: last global capacity=${lastCapacity}; ${actors.map((actor, index) => `${index + 1}:${actor.room ? 'joined' : 'left'}${actor.left ? `(${actor.left.code}:${safe(actor.left.reason)})` : ''}${actor.tickError ? ` ping=${safe(actor.tickError)}` : ''}`).join(' ')}`);
  process.exitCode = 1;
} finally {
  for (const actor of actors) { actor.stopped = true; clearTimeout(actor.timer); }
  await Promise.all([...extraRooms].map(room => room.leave().catch(() => {})));
  for (const actor of actors) {
    await actor.tickInFlight?.catch(() => {});
    if (actor.lease) await actor.supabase.rpc('mmo_leave', { p_client: actor.lease });
    await actor.supabase.removeAllChannels(); actor.supabase.realtime.disconnect(); await actor.supabase.auth.signOut();
  }
}
