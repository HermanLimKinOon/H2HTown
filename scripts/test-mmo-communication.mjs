import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

// Intentionally permit test-account creation only on a loopback Supabase instance.
const env = Object.fromEntries((await readFile(new URL('../.env', import.meta.url), 'utf8')).split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => { const split = line.indexOf('='); return [line.slice(0, split), line.slice(split + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const url = env.VITE_PUBLIC_SUPABASE_URL, key = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Only local Supabase is allowed.');
const urls = new Map();
async function moduleUrl(url) {
  if (urls.has(url.href)) return urls.get(url.href);
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)]) js = js.replaceAll(match[0], `from ${JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`, url)))}`);
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`; urls.set(url.href, result); return result;
}
const { createMmoCommunicationClient3D } = await import(await moduleUrl(new URL('../src/pages/game3d/mmoCommunicationClient3D.ts', import.meta.url)));
const clients = [0, 1].map(index => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `mmo-smoke-${index}-${crypto.randomUUID()}` } }));
const users = [], services = [], snapshots = [], poses = [{ x: 0, z: 5 }, { x: 0, z: 5 }];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, description) { const deadline = Date.now() + 15000; while (Date.now() < deadline) { if (check()) return; await pause(50); } throw new Error(`Timed out: ${description}. Status: ${snapshots.map(snapshot => `${snapshot?.status ?? 'none'} ${snapshot?.error ?? ''}`).join('; ')}`); }
const prefix = `MMO smoke ${crypto.randomUUID().slice(0, 8)}`;
function start(index) {
  const service = createMmoCommunicationClient3D({ client: clients[index], userId: users[index].id, name: `${prefix} ${index + 1}`, world: 'town', getPose: () => poses[index], onCorrection: presence => { poses[index] = { x: presence.x, z: presence.z }; }, onChange: model => { snapshots[index] = model; } });
  services[index] = service; void service.start(); return service;
}
try {
  for (const client of clients) {
    const result = await client.auth.signUp({ email: `mmo-smoke-${crypto.randomUUID()}@example.test`, password: `Local-${crypto.randomUUID()}!` });
    assert.equal(result.error, null, 'Local test sign-up failed'); assert.ok(result.data.session, 'Local sign-up needs a session'); users.push(result.data.user);
    await client.realtime.setAuth(result.data.session.access_token);
  }
  start(0); start(1); await waitFor(() => snapshots.length === 2 && snapshots.every(snapshot => snapshot.status === 'online'), 'two private inbox subscriptions');
  assert.equal(await snapshots[0].send('local', `${prefix} nearby`), true);
  await waitFor(() => snapshots[1].messages.some(message => message.body === `${prefix} nearby` && message.channel === 'local' && message.receivedAt), 'server-routed local broadcast');
  console.log('PASS: two test accounts connect and receive server-routed local messages through private Realtime inboxes.');

  assert.equal(await snapshots[0].send('private', `${prefix} private`, users[1].id), true);
  await waitFor(() => snapshots[1].messages.some(message => message.body === `${prefix} private`) && snapshots[1].state.unread_private >= 1, 'private live delivery and unread count');
  const firstPrivate = snapshots[1].messages.find(message => message.body === `${prefix} private`);
  await snapshots[1].markRead('private', users[0].id, firstPrivate.id);
  await waitFor(() => snapshots[1].state.unread_private === 0, 'private read acknowledgement');
  console.log('PASS: private live messages update unread state and explicit reads clear it.');

  assert.equal(await snapshots[0].social({ action: 'create', kind: 'party', name: `${prefix} party` }), true);
  await waitFor(() => snapshots[0].state.groups.some(group => group.kind === 'party'), 'party creation');
  const party = snapshots[0].state.groups.find(group => group.kind === 'party');
  await pause(200);
  assert.equal(await snapshots[0].social({ action: 'invite', kind: 'party', group: party.id, target: users[1].id }), true);
  await waitFor(() => snapshots[1].state.invitations.some(invite => invite.group_id === party.id), 'Realtime invitation refresh');
  const invite = snapshots[1].state.invitations.find(invite => invite.group_id === party.id);
  assert.equal(await snapshots[1].social({ action: 'accept', kind: 'party', target: invite.id }), true);
  await waitFor(() => snapshots.every(snapshot => snapshot.state.groups.find(group => group.id === party.id)?.members.length === 2), 'party membership refresh');
  assert.equal(await snapshots[0].send('party', `${prefix} party message`), true);
  await waitFor(() => snapshots[1].messages.some(message => message.channel === 'party' && message.body === `${prefix} party message`), 'party member receives message');
  console.log('PASS: party create/invite/accept refresh through Realtime, and party messages reach members.');

  await services[1].stop(); await clients[1].removeAllChannels();
  assert.equal(await snapshots[0].send('private', `${prefix} offline`, users[1].id), true);
  const found = await snapshots[0].findPlayers(`${prefix} 2`); assert.ok(found.some(player => player.id === users[1].id && player.online === false));
  start(1); await waitFor(() => snapshots[1].status === 'online' && snapshots[1].messages.some(message => message.body === `${prefix} offline`), 'offline private catch-up');
  const offline = snapshots[1].messages.find(message => message.body === `${prefix} offline`);
  assert.equal(offline.receivedAt, undefined, 'Historical private messages must not replay speech/preview effects');
  assert.ok(snapshots[1].state.unread_private >= 1);
  console.log('PASS: offline player lookup works, private messages persist, and reconnect restores unread history without live effects.');

  await pause(200);
  assert.equal(await snapshots[1].social({ action: 'leave', kind: 'party', group: party.id }), true);
  await waitFor(() => !snapshots[1].state.groups.some(group => group.id === party.id), 'party leave');
  assert.ok(!snapshots[1].messages.some(message => message.group_id === party.id));
  console.log('PASS: leaving a group removes its cached history.');
} catch (reason) {
  console.error(`FAIL: ${reason instanceof Error ? reason.message : 'MMO communication smoke failed'}`); process.exitCode = 1;
} finally {
  await Promise.all(services.map(service => service.stop()));
  for (const client of clients) { await client.removeAllChannels(); client.realtime.disconnect(); await client.auth.signOut(); }
}
