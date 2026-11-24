import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const urls = new Map();
async function moduleUrl(url) {
  if (urls.has(url.href)) return urls.get(url.href);
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const dependency = match[1].startsWith('.') ? await moduleUrl(new URL(`${match[1]}.ts`, url)) : import.meta.resolve(match[1]);
    js = js.replaceAll(match[0], `from ${JSON.stringify(dependency)}`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  urls.set(url.href, result); return result;
}
const helper = await import(await moduleUrl(new URL('../src/pages/game3d/mmoChatHudLogic3D.ts', import.meta.url)));
const HUD = (await import(await moduleUrl(new URL('../src/pages/game3d/MMOChatHUD3D.tsx', import.meta.url)))).default;
function message(id, extra = {}) { return { id, channel: 'local', sender_id: 'alice', sender_name: 'Alice', body: 'Hello', kind: 'text', created_at: '2026-11-20T06:00:00Z', group_id: null, recipient_id: null, world_id: 'town', server_id: 'local-1', origin: null, ...extra }; }
function model(extra = {}) { return { status: 'online', error: '', state: { profile: { id: 'self', name: 'Me' }, config: { max_length: 240, local_radius: 30 }, groups: [], invitations: [], conversations: [], blocked: [], unread_private: 3 }, messages: [], loadingHistory: false, hasMore: false, send: async () => true, loadHistory: async () => {}, markRead: async () => {}, social: async () => true, findPlayers: async () => [], retry() {}, clearError() {}, ...extra }; }
const props = { onFocusChange() {}, onPrivateTargetChange() {}, privateTarget: null, nearbyPlayers: [] };

test('compact previews exclude historical timestamps and expire exactly at 6.5 seconds', () => {
  const messages = [message('history'), message('future', { receivedAt: 11000 }), ...Array.from({ length: 6 }, (_, i) => message(String(i), { receivedAt: 4000 + i }))];
  assert.deepEqual(helper.mmoHudPreview3D(messages, 10000).map(m => m.id), ['2', '3', '4', '5']);
  assert.deepEqual(helper.mmoHudPreview3D([message('expiry', { receivedAt: 3500 })], 10000), []);
});
test('private history isolates both directions of the selected conversation', () => {
  const messages = [message('2', { channel: 'private', sender_id: 'alice', recipient_id: 'self' }), message('10', { channel: 'private', sender_id: 'self', recipient_id: 'alice' }), message('3', { channel: 'private', sender_id: 'bob', recipient_id: 'self' }), message('4', { channel: 'private', sender_id: 'alice', recipient_id: 'bob' }), message('5')];
  assert.deepEqual(helper.mmoHudConversation3D(messages, 'private', 'self', 'alice').map(m => m.id), ['2', '10']);
  assert.deepEqual(helper.mmoHudConversation3D(messages, 'private', 'self'), []);
  assert.deepEqual(helper.mmoHudConversation3D(messages, 'local', 'self').map(m => m.id), ['5']);
});
test('controller edges do not repeat an action while the button stays held', () => {
  assert.deepEqual(helper.mmoHudButtonEdges3D([true, false, true], []), [0, 2]);
  assert.deepEqual(helper.mmoHudButtonEdges3D([true, false, true], [true, false, true]), []);
  assert.deepEqual(helper.mmoHudButtonEdges3D([false, true], [true, false]), [1]);
});
test('default HUD stays compact, advertises unread count, and makes no backend calls', () => {
  let calls = 0;
  const html = renderToStaticMarkup(createElement(HUD, { ...props, model: model({ markRead: async () => { calls++; }, loadHistory: async () => { calls++; } }) }));
  assert.match(html, /Open chat, 3 unread private messages/);
  assert.doesNotMatch(html, /role="dialog"/);
  assert.equal(calls, 0);
  assert.equal(renderToStaticMarkup(createElement(HUD, { ...props, model: model(), enabled: false })), '');
});
test('private player intent renders accessible history, offline lookup, literal text and no other conversations', () => {
  const html = renderToStaticMarkup(createElement(HUD, { ...props, privateTarget: { id: 'alice', name: '<b>Alice</b>', online: false }, model: model({ messages: [message('1', { channel: 'private', recipient_id: 'self', sender_name: '<b>Alice</b>', body: '<img src=x onerror=alert(1)>' }), message('2', { channel: 'private', sender_id: 'bob', recipient_id: 'self', body: 'BOB SECRET' })] }) }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /role="log"/);
  assert.match(html, /Find a player, including offline players/);
  assert.match(html, /maxLength="240"/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;b&gt;Alice/);
  assert.doesNotMatch(html, /<img|<b>Alice|BOB SECRET/);
  assert.match(html, /aria-selected="true"[^>]*aria-controls="mmo-chat-private"/);
});
test('offline mode keeps history visible and disables sending with a reconnect action', () => {
  const html = renderToStaticMarkup(createElement(HUD, { ...props, privateTarget: { id: 'alice', name: 'Alice' }, model: model({ status: 'offline', messages: [message('1', { channel: 'private', recipient_id: 'self', body: 'Saved conversation' })] }) }));
  assert.match(html, /Saved conversation/);
  assert.match(html, /Reconnect/);
  assert.match(html, /<input[^>]*aria-label="Message Private"[^>]*disabled=""/);
  assert.match(html, /<button type="submit"[^>]*disabled=""/);
});
test('system announcements remain visible and visibly distinct in expanded chat', () => {
  const html = renderToStaticMarkup(createElement(HUD, { ...props, privateTarget: { id: 'alice', name: 'Alice' }, model: model({ messages: [message('system', { channel: 'system', sender_id: null, sender_name: 'System', kind: 'announcement', body: 'Scheduled maintenance' })] }) }));
  assert.match(html, /aria-label="System announcements"/);
  assert.match(html, /color:#fbbf24/);
  assert.match(html, /Scheduled maintenance/);
});
