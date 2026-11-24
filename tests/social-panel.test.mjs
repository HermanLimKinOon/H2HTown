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
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`; urls.set(url.href, result); return result;
}
const { default: Panel, SocialRequests3D, SocialInvitations3D, SocialProfileCard3D } = await import(await moduleUrl(new URL('../src/pages/game3d/SocialPanel3D.tsx', import.meta.url)));
const logic = await import(await moduleUrl(new URL('../src/pages/game3d/socialPanelLogic3D.ts', import.meta.url)));
const state = (extra = {}) => ({ friends: [], incoming: [], outgoing: [], farm_invitations: [], sent_invitations: [], visitors: [], ...extra });
const model = (extra = {}) => ({ status: 'online', error: '', busy: false, state: state(), profile: null, selfId: 'self', visiting: null, farm: null, peers: {}, findPlayers: async () => [], loadProfile: async () => {}, saveProfile: async () => true, friend: async () => true, invite: async () => true, respond: async () => true, revoke: async () => true, leave: async () => {}, refresh: async () => {}, clearError() {}, act: async () => true, ...extra });
const profile = (extra = {}) => ({ id: 'alice', name: 'Alice', bio: 'Hi!', online: false, avatar: null, friendship: 'friend', ...extra });
const props = { selectedPlayer: null, onSelectPlayer() {}, onPrivateChat() {}, onFocusChange() {} };
const html = element => renderToStaticMarkup(element);
const run = async operation => operation();
function buttons(node, found = []) {
  if (Array.isArray(node)) { for (const child of node) buttons(child, found); return found; }
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'button') found.push(node);
  buttons(node.props?.children, found); return found;
}

test('pending badge counts only received requests and unexpired addressed invitations', () => {
  const data = state({ incoming: [{ id: 'alice', name: 'Alice' }], outgoing: [{ id: 'bob', name: 'Bob' }], farm_invitations: [{ expires_at: '2026-11-20T10:01:00Z' }, { expires_at: '2026-11-20T10:00:00Z' }, { expires_at: 'invalid' }] });
  assert.equal(logic.socialPendingCount3D(data, Date.parse('2026-11-20T10:00:00Z')), 2);
  assert.equal(logic.socialPendingCount3D(null), 0);
});
test('friend lifecycle offers explicit acceptance and no actions for self or blocked players', () => {
  assert.deepEqual(logic.socialProfileActions3D('none'), ['request']);
  assert.deepEqual(logic.socialProfileActions3D('incoming'), ['accept', 'decline']);
  assert.deepEqual(logic.socialProfileActions3D('outgoing'), ['cancel']);
  assert.deepEqual(logic.socialProfileActions3D('friend'), ['remove']);
  assert.deepEqual(logic.socialProfileActions3D('self'), []);
  assert.deepEqual(logic.socialProfileActions3D('blocked'), []);
});
test('default panel stays compact with pending badge and no implicit profile/travel/backend actions', () => {
  let calls = 0;
  const result = html(createElement(Panel, { ...props, model: model({ state: state({ incoming: [{ id: 'alice', name: 'Alice' }] }), loadProfile: async () => { calls++; }, respond: async () => { calls++; return true; } }) }));
  assert.match(result, /Open friends, 1 pending requests and invitations/);
  assert.doesNotMatch(result, /role="dialog"/);
  assert.equal(calls, 0);
});
test('selected profile opens an accessible panel and escapes all player-authored text', () => {
  const user = profile({ name: '<b>Alice</b>', bio: '<img src=x onerror=alert(1)>' });
  const result = html(createElement(Panel, { ...props, selectedPlayer: user, model: model({ profile: user }) }));
  assert.match(result, /role="dialog"/);
  assert.match(result, /role="tablist"/);
  assert.match(result, /role="tabpanel"/);
  assert.match(result, /&lt;b&gt;Alice&lt;\/b&gt;/);
  assert.match(result, /&lt;img/);
  assert.doesNotMatch(result, /<img|<b>Alice/);
  assert.match(result, /Private chat/);
  assert.match(result, /Invite to my farm/);
  assert.match(result, /Remove friend/);
});
test('stale unrelated model profile stays hidden while the requested profile loads', () => {
  const result = html(createElement(Panel, { ...props, selectedPlayer: { id: 'bob', name: 'Bob' }, model: model({ profile: profile({ bio: 'ALICE ONLY' }) }) }));
  assert.match(result, /Loading Bob&#x27;s profile/);
  assert.doesNotMatch(result, /ALICE ONLY/);
});
test('self profile exposes a bounded bio editor and blocked profile has no social mutation controls', () => {
  const common = { model: model(), disabled: false, run, onPrivateChat() {}, onClose() {} };
  const self = html(createElement(SocialProfileCard3D, { ...common, profile: profile({ id: 'self', friendship: 'self', bio: 'Own bio' }) }));
  assert.match(self, /maxLength="240"/);
  assert.match(self, /Own bio/);
  assert.match(self, /Save bio/);
  assert.doesNotMatch(self, /Private chat|Add friend|Remove friend/);
  const blocked = html(createElement(SocialProfileCard3D, { ...common, profile: profile({ friendship: 'blocked' }) }));
  assert.match(blocked, /Blocked/);
  assert.doesNotMatch(blocked, /Private chat|Add friend|Invite to my farm/);
});
test('request buttons call exact explicit lifecycle actions with user IDs', async () => {
  const actions = [];
  const component = SocialRequests3D({ model: model({ state: state({ incoming: [{ id: 'alice', name: 'Alice' }], outgoing: [{ id: 'bob', name: 'Bob' }] }), friend: async (action, target) => { actions.push([action, target]); return true; } }), disabled: false, run, onSelectPlayer() {} });
  for (const text of ['Accept', 'Decline', 'Cancel request']) buttons(component).find(button => button.props.children === text).props.onClick();
  assert.deepEqual(actions, [['accept', 'alice'], ['decline', 'alice'], ['cancel', 'bob']]);
});
test('invitations use invitation IDs for travel decisions and user IDs for revocation; expired invites stay hidden', () => {
  const calls = [];
  const future = '2026-11-20T11:00:00Z';
  const component = SocialInvitations3D({ now: Date.parse('2026-11-20T10:00:00Z'), disabled: false, run, onSelectPlayer() {}, model: model({ state: state({ farm_invitations: [{ id: 'invite', owner_id: 'host', owner_name: 'Host', expires_at: future }, { id: 'expired', owner_id: 'other', owner_name: 'EXPIRED HOST', expires_at: '2026-11-20T09:00:00Z' }], visitors: [{ id: 'guest', name: 'Guest', expires_at: future }], sent_invitations: [{ id: 'sent', target_id: 'recipient', target_name: 'Recipient', expires_at: future }] }), respond: async (...args) => { calls.push(['respond', ...args]); return true; }, revoke: async target => { calls.push(['revoke', target]); return true; } }) });
  for (const text of ['Accept & travel', 'Decline', 'Revoke access', 'Revoke invitation']) buttons(component).find(button => button.props.children === text).props.onClick();
  assert.deepEqual(calls, [['respond', 'invite', true], ['respond', 'invite', false], ['revoke', 'guest'], ['revoke', 'recipient']]);
  assert.doesNotMatch(html(component), /EXPIRED HOST/);
});
test('offline visiting banner keeps return-home available without opening the large panel', () => {
  const result = html(createElement(Panel, { ...props, model: model({ status: 'offline', visiting: { id: 'host', name: 'Host' } }) }));
  assert.match(result, /Visiting Host&#x27;s farm/);
  const returnButton = result.match(/<button type="button"[^>]*>Return home<\/button>/)?.[0];
  assert.ok(returnButton);
  assert.doesNotMatch(returnButton, /disabled=/);
  assert.doesNotMatch(result, /role="dialog"/);
});
