import {useGamePanel3D} from './useGamePanel3D';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { MMO_CHANNELS_3D } from './mmoCommunicationTypes3D';
import type { MmoChannel3D, MmoCommunicationModel3D, MmoGroup3D, MmoMessage3D, MmoPlayer3D, MmoRole3D } from './mmoCommunicationTypes3D';
import { mmoHudButtonEdges3D, mmoHudConversation3D, mmoHudPreview3D } from './mmoChatHudLogic3D';

type Props = { model: MmoCommunicationModel3D; onFocusChange: (focused: boolean) => void; privateTarget: MmoPlayer3D | null; onPrivateTargetChange: (peer: MmoPlayer3D | null) => void; nearbyPlayers: MmoPlayer3D[]; enabled?: boolean };
const colors = { local: '#a7f3d0', world: '#93c5fd', party: '#c4b5fd', guild: '#6ee7b7', private: '#f9a8d4', system: '#fbbf24' };
const button: CSSProperties = { border: '1px solid #ffffff24', borderRadius: 6, padding: '5px 8px', background: '#ffffff0c', color: 'inherit', cursor: 'pointer', font: 'inherit' };
const field: CSSProperties = { ...button, background: '#020617b3', minWidth: 0 };
function label(channel: string) { return channel[0].toUpperCase() + channel.slice(1); }
function Message({ message, compact = false, onPlayer }: { message: MmoMessage3D; compact?: boolean; onPlayer: (peer: MmoPlayer3D) => void }) {
  return <div style={{ overflowWrap: 'anywhere', padding: compact ? '2px 0' : '5px 0', color: message.channel === 'system' ? colors.system : '#e2e8f0', opacity: message.pending ? .6 : 1 }}>
    {!compact && <time dateTime={message.created_at} style={{ color: '#94a3b8', fontSize: 10, marginRight: 5 }}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}
    <span style={{ color: colors[message.channel], fontSize: 10 }}>[{label(message.channel)}] </span>
    {message.sender_id ? <button type="button" style={{ border: 0, padding: 0, background: 'none', color: colors[message.channel], font: 'inherit', cursor: 'pointer' }} onClick={() => onPlayer({ id: message.sender_id!, name: message.sender_name })}>{message.sender_name}</button> : <strong>System</strong>}
    {message.kind === 'emote' ? ' ' : ': '}{message.body}{message.failed && <span style={{ color: '#fca5a5' }}> (not sent)</span>}
  </div>;
}
export default function MMOChatHUD3D({ model, onFocusChange, privateTarget, onPrivateTargetChange, nearbyPlayers, enabled = true }: Props) {
  const [expanded, setExpanded] = useState(Boolean(privateTarget));
  const [channel, setChannel] = useState<MmoChannel3D>(privateTarget ? 'private' : 'local');
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(Date.now);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [socialOpen, setSocialOpen] = useState(false);
  const [extras, setExtras] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MmoPlayer3D[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const readKey = useRef('');
  const request = useRef(0);
  const sending = useRef(false);
  const draftContext=useRef({draft,channel,target:privateTarget?.id,epoch:0});
  draftContext.current={...draftContext.current,draft,channel,target:privateTarget?.id};
  const state = model.state;
  const { loadHistory, markRead, findPlayers } = model;
  const targetId = privateTarget?.id;
  const hasState = Boolean(state);
  const group = state?.groups.find(item => item.kind === channel);
  const canRead = !['party', 'guild'].includes(channel) || Boolean(group?.my_permissions.read);
  const messages = canRead ? mmoHudConversation3D(model.messages, channel, state?.profile.id, privateTarget?.id) : [];
  const announcements = model.messages.filter(message => message.channel === 'system').slice(-2);
  const lastId = messages.at(-1)?.id;
  const latest = useRef({ expanded, channel, send: () => {}, close: () => {} });
  const open = useCallback(() => { setExpanded(true); requestAnimationFrame(() => input.current?.focus()); }, []);
  const close = useCallback(() => { draftContext.current.epoch++; setExpanded(false); setDraft(''); setExtras(false); setSocialOpen(false); input.current?.blur(); onPrivateTargetChange(null); onFocusChange(false); }, [onFocusChange, onPrivateTargetChange]);
  const hideForOverlay=useCallback(()=>{setExpanded(false);setExtras(false);setSocialOpen(false);input.current?.blur();onFocusChange(false);},[onFocusChange]);
  useGamePanel3D('chat',expanded,hideForOverlay);
  const selectPlayer = (peer: MmoPlayer3D) => { onPrivateTargetChange(peer); setChannel('private'); open(); };
  const canSend = enabled && model.status === 'online' && Boolean(state) && (channel !== 'private' || Boolean(privateTarget)) && (!['party', 'guild'].includes(channel) || Boolean(group?.my_permissions.write));
  const send = async (body = draft, kind: 'text' | 'emote' = 'text') => {
    if (!canSend || busy || sending.current || !body.trim()) return;
    sending.current = true; setBusy(true); setLocalError('');
    const submitted={...draftContext.current};
    try { if (await model.send(channel, body.trim(), privateTarget?.id, kind)) {
      const current=draftContext.current;
      if(kind==='text'&&body===submitted.draft&&current.epoch===submitted.epoch&&current.channel===submitted.channel&&current.target===submitted.target) setDraft(value=>value===submitted.draft?'':value);
    } else setLocalError('Message was not sent. Check your connection and channel permissions.'); }
    catch { setLocalError('Message could not be sent. Please try again.'); }
    finally { sending.current = false; setBusy(false); input.current?.focus(); }
  };
  latest.current = { expanded, channel, send: () => { void send(); }, close };
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 350); return () => window.clearInterval(id); }, []);
  useEffect(() => { const update = () => setVisible(!document.hidden); update(); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => { if (privateTarget && enabled) { setChannel('private'); open(); } }, [privateTarget, enabled, open]);
  useEffect(() => { onFocusChange(enabled && expanded && visible); return () => onFocusChange(false); }, [enabled, expanded, visible, onFocusChange]);
  useEffect(() => {
    if (!expanded || !enabled || !visible || !hasState || (channel === 'private' && !targetId) || (['party', 'guild'].includes(channel) && !group?.my_permissions.read)) return;
    void loadHistory(channel, targetId).catch(() => setLocalError('Could not load history.'));
  }, [expanded, enabled, visible, channel, targetId, group?.id, group?.my_permissions.read, hasState, loadHistory]);
  useEffect(() => {
    if (!expanded || !enabled || !visible || !canRead || !lastId || (channel === 'private' && !targetId)) return;
    const key = `${channel}:${targetId ?? ''}:${lastId}`;
    if (readKey.current === key) return;
    readKey.current = key;
    void markRead(channel, targetId, lastId).catch(() => { readKey.current = ''; });
  }, [expanded, enabled, visible, canRead, lastId, channel, targetId, markRead]);
  useEffect(() => { if (history.current) history.current.scrollTop = history.current.scrollHeight; }, [channel, privateTarget?.id, lastId]);
  useEffect(() => {
    if (!enabled) return;
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches('input,textarea,select,[contenteditable="true"]');
      if (event.key === 'Escape' && latest.current.expanded) { event.preventDefault(); event.stopPropagation(); latest.current.close(); }
      else if (event.key === 'Enter' && !event.repeat && !editing && !latest.current.expanded && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); event.stopPropagation(); open(); }
    };
    window.addEventListener('keydown', keyboard, true);
    let frame = 0; let previous: boolean[] = []; let lastEdge = 0;
    const poll = () => {
      const pad = navigator.getGamepads?.().find(p => p?.connected);
      const pressed = pad ? pad.buttons.map(b => b.pressed) : [];
      const edges = mmoHudButtonEdges3D(pressed, previous); previous = pressed;
      if (edges.length && performance.now() - lastEdge > 160) {
        lastEdge = performance.now();
        if (edges.includes(9)) { if (latest.current.expanded) latest.current.close(); else open(); }
        else if (latest.current.expanded) {
          if (edges.includes(1)) latest.current.close();
          if (edges.includes(4) || edges.includes(5)) setChannel(current => MMO_CHANNELS_3D[(MMO_CHANNELS_3D.indexOf(current) + (edges.includes(4) ? 4 : 1)) % 5]);
          const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)') ?? []);
          if (edges.includes(12) || edges.includes(13)) { const index = elements.indexOf(document.activeElement as HTMLElement); elements[(index + (edges.includes(12) ? elements.length - 1 : 1)) % elements.length]?.focus(); }
          if (edges.includes(0)) { if (document.activeElement === input.current) latest.current.send(); else if (panel.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).click(); }
        }
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => { window.removeEventListener('keydown', keyboard, true); cancelAnimationFrame(frame); };
  }, [enabled, open]);
  useEffect(() => {
    const token = ++request.current;
    if (!expanded || channel !== 'private' || search.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const id = window.setTimeout(() => { void findPlayers(search.trim()).then(players => { if (request.current === token) setResults(players); }).catch(() => { if (request.current === token) setLocalError('Player search unavailable.'); }).finally(() => { if (request.current === token) setSearching(false); }); }, 300);
    return () => window.clearTimeout(id);
  }, [search, expanded, channel, findPlayers]);
  if (!enabled) return null;
  const action = async (operation: Parameters<MmoCommunicationModel3D['social']>[0]) => { if (busy) return; setBusy(true); setLocalError(''); try { if (!await model.social(operation)) setLocalError('Action was not completed. Check your permissions and try again.'); } catch { setLocalError('Action failed. Please try again.'); } finally { setBusy(false); } };
  const submit = (event: FormEvent) => { event.preventDefault(); void send(); };
  const previews = mmoHudPreview3D(model.messages, now);
  return <section className={`mmo-chat-3d ${expanded?'mmo-expanded':'mmo-compact'}`} aria-label="Game chat" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>

    {!expanded ? <><div className="mmo-previews" style={{ background: previews.length ? '#020617a6' : 'transparent', borderRadius: 8, padding: previews.length ? '6px 9px' : 0, marginBottom: 5, maxHeight: 116, overflow: 'hidden' }}>{previews.map(message => <div key={message.id} style={{ opacity: Math.min(1, (6500 - (now - message.receivedAt!)) / 1000) }}><Message message={message} compact onPlayer={selectPlayer} /></div>)}</div><button type="button" onClick={open} style={{ ...button, background: '#0f172ae0', borderRadius: 18 }} aria-expanded={false} aria-label={`Open chat${state?.unread_private ? `, ${state.unread_private} unread private messages` : ''}`}>◌ Chat {state?.unread_private ? `(${state.unread_private})` : ''}<span style={{ color: '#94a3b8', fontSize: 10 }}> ↵</span></button></> :
    <div ref={panel} className="mmo-panel" role="dialog" aria-label="Chat" aria-modal="false" style={{ background: '#0b1220ed', border: '1px solid #64748b66', borderRadius: 10, boxShadow: '0 8px 28px #0006', overflow: 'auto', maxHeight: 'min(520px,65dvh)' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '7px 9px', gap: 6 }}><strong style={{ flex: 1 }}>Chat <small style={{ color: model.status === 'online' ? '#86efac' : '#fbbf24', fontWeight: 400 }}>{model.status}</small></strong><button type="button" style={button} onClick={() => setSocialOpen(value => !value)} aria-expanded={socialOpen}>People {state?.invitations.length ? `(${state.invitations.length})` : ''}</button><button type="button" style={button} onClick={close} aria-label="Minimize chat">−</button><button type="button" style={button} onClick={close} aria-label="Close chat and discard draft">×</button></header>
      <div role="tablist" aria-label="Chat channels" style={{ display: 'flex', gap: 3, padding: '0 7px 6px' }}>{MMO_CHANNELS_3D.map(item => <button key={item} type="button" role="tab" aria-selected={channel === item} aria-controls={`mmo-chat-${item}`} id={`mmo-tab-${item}`} style={{ ...button, color: colors[item], flex: 1, padding: '5px 2px', background: channel === item ? '#ffffff20' : 'transparent' }} onClick={() => setChannel(item)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'local' : event.key === 'End' ? 'private' : MMO_CHANNELS_3D[(MMO_CHANNELS_3D.indexOf(item) + (event.key === 'ArrowLeft' ? 4 : 1)) % 5]; setChannel(next); document.getElementById(`mmo-tab-${next}`)?.focus(); } }}>{label(item)}{item === 'private' && state?.unread_private ? ` ${state.unread_private}` : ''}</button>)}</div>
      {socialOpen && <div style={{ padding: 9, borderBlock: '1px solid #ffffff18' }}><strong>Groups & safety</strong>{state?.invitations.map(invite => <div key={invite.id} style={{ marginTop: 7 }}>{invite.inviter_name} invited you to {invite.group_name} ({invite.kind}) <button type="button" disabled={busy} style={button} onClick={() => void action({ action: 'accept', kind: invite.kind, target: invite.id })}>Accept</button> <button type="button" disabled={busy} style={button} onClick={() => void action({ action: 'decline', kind: invite.kind, target: invite.id })}>Decline</button></div>)}
        {(['party', 'guild'] as const).map(kind => { const current = state?.groups.find(item => item.kind === kind); return current ? <Group key={kind} group={current} self={state?.profile.id} busy={busy} action={action} players={privateTarget && !nearbyPlayers.some(peer => peer.id === privateTarget.id) ? [...nearbyPlayers, privateTarget] : nearbyPlayers} /> : <form key={kind} onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('groupName') ?? '').trim(); if (name) void action({ action: 'create', kind, name }); }} style={{ display: 'flex', gap: 4, marginTop: 8 }}><input name="groupName" aria-label={`New ${kind} name`} placeholder={`${label(kind)} name`} required maxLength={60} style={{ ...field, flex: 1 }} /><button type="submit" style={button} disabled={busy || model.status !== 'online'}>Create {kind}</button></form>; })}
        {state?.blocked.map(peer => <div key={peer.id}>{peer.name} · blocked <button style={button} type="button" disabled={busy} onClick={() => void action({ action: 'unblock', target: peer.id })}>Unblock</button></div>)}
      </div>}
      {announcements.length > 0 && <div aria-label="System announcements" style={{ padding: '0 9px', borderBlock: '1px solid #fbbf2433', maxHeight: 66, overflowY: 'auto' }}>{announcements.map(message => <Message key={message.id} message={message} onPlayer={selectPlayer} />)}</div>}
      <div role="tabpanel" id={`mmo-chat-${channel}`} aria-labelledby={`mmo-tab-${channel}`}>
        {channel === 'private' && <div style={{ padding: '5px 9px', borderBottom: '1px solid #ffffff18' }}><label style={{ display: 'flex', gap: 6 }}>To <select aria-label="Private conversation" value={privateTarget?.id ?? ''} style={{ ...field, flex: 1 }} onChange={event => { const peer = state?.conversations.find(item => item.peer_id === event.target.value); onPrivateTargetChange(peer ? { id: peer.peer_id, name: peer.peer_name, online: peer.online } : null); }}><option value="">Choose a conversation</option>{privateTarget && !state?.conversations.some(item => item.peer_id === privateTarget.id) && <option value={privateTarget.id}>{privateTarget.name}</option>}{state?.conversations.map(peer => <option key={peer.peer_id} value={peer.peer_id}>{peer.peer_name} · {peer.online ? 'online' : 'offline'}{peer.unread ? ` (${peer.unread})` : ''}</option>)}</select></label><input aria-label="Find a player, including offline players" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a player (2+ letters)" maxLength={60} style={{ ...field, width: '100%', boxSizing: 'border-box', marginTop: 5 }} />{searching && <small role="status">Searching…</small>}{results.filter(peer => peer.id !== state?.profile.id).map(peer => <button type="button" key={peer.id} style={{ ...button, margin: '4px 3px 0 0' }} onClick={() => { selectPlayer(peer); setSearch(''); }}>{peer.name} · {peer.online ? 'online' : 'offline'}</button>)}{privateTarget && <div style={{ marginTop: 5 }}>{privateTarget.name} <button type="button" style={button} disabled={busy} onClick={() => void action({ action: state?.blocked.some(peer => peer.id === privateTarget.id) ? 'unblock' : 'block', target: privateTarget.id })}>{state?.blocked.some(peer => peer.id === privateTarget.id) ? 'Unblock' : 'Block'}</button></div>}</div>}
        <div ref={history} role="log" aria-label={`${label(channel)} history`} aria-live="polite" aria-relevant="additions text" tabIndex={0} style={{ height: 'clamp(90px,22dvh,190px)', overflowY: 'auto', padding: '0 9px' }}>
          {model.hasMore && canRead && (channel !== 'private' || privateTarget) && <button type="button" disabled={model.loadingHistory} style={{ ...button, width: '100%', marginTop: 5 }} onClick={() => { const node = history.current; const height = node?.scrollHeight ?? 0; void model.loadHistory(channel, privateTarget?.id, true).then(() => requestAnimationFrame(() => { if (node) node.scrollTop = node.scrollHeight - height; })).catch(() => setLocalError('Could not load older messages.')); }}>Load older messages</button>}
          {model.loadingHistory && <p role="status">Loading history…</p>}{!messages.length && !model.loadingHistory && <p style={{ color: '#94a3b8' }}>{channel === 'private' && !privateTarget ? 'Choose a player to start a private conversation.' : ['party', 'guild'].includes(channel) && !group ? `Join or create a ${channel} using People.` : 'No messages yet.'}</p>}{messages.map(message => <Message key={message.id} message={message} onPlayer={selectPlayer} />)}
        </div>
      </div>
      {(model.error || localError) && <div role="alert" style={{ color: '#fca5a5', padding: '4px 9px' }}>{localError || model.error} <button type="button" style={button} onClick={() => { setLocalError(''); model.clearError(); }}>Dismiss</button></div>}
      {model.status !== 'online' && <div role="status" style={{ color: '#fbbf24', padding: '4px 9px' }}>Chat is {model.status}. <button type="button" style={button} onClick={model.retry}>Reconnect</button></div>}
      {group && !group.my_permissions.write && <p style={{ color: '#fbbf24', margin: '4px 9px' }}>Your {channel} role cannot send messages.</p>}
      <form onSubmit={submit} style={{ padding: 8, borderTop: '1px solid #ffffff18' }}><div style={{ display: 'flex', gap: 4 }}><button type="button" style={button} onClick={() => setExtras(value => !value)} aria-label="Emoji, emotes and quick phrases" aria-expanded={extras}>☺</button><input ref={input} aria-label={`Message ${label(channel)}`} value={draft} onChange={event => setDraft(event.target.value)} maxLength={state?.config.max_length ?? 500} placeholder={channel === 'local' ? `Nearby (${state?.config.local_radius ?? 30}m)` : `Message ${privateTarget && channel === 'private' ? privateTarget.name : label(channel)}`} style={{ ...field, flex: 1 }} disabled={!canSend} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); setChannel(current => MMO_CHANNELS_3D[(MMO_CHANNELS_3D.indexOf(current) + (event.shiftKey ? 4 : 1)) % 5]); } if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} /><button type="submit" style={button} disabled={!canSend || busy || !draft.trim()}>Send</button></div>
        {extras && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 6 }}>{['👋', '😊', '❤️', '🎉'].map(emoji => <button type="button" style={button} key={emoji} onClick={() => { setDraft(value => (value + emoji).slice(0, state?.config.max_length ?? 500)); input.current?.focus(); }}>{emoji}</button>)}{['waves', 'cheers', 'dances'].map(emote => <button type="button" style={button} disabled={!canSend || busy} key={emote} onClick={() => void send(emote, 'emote')}>/{emote}</button>)}{['Hello!', 'Thank you!', 'Follow me', 'Need help?'].map(phrase => <button type="button" style={button} key={phrase} disabled={!canSend || busy} onClick={() => void send(phrase)}>{phrase}</button>)}</div>}<small style={{ display: 'block', color: '#94a3b8', marginTop: 5 }}>Enter send · Tab channel · Esc close · Controller: Start chat, LB/RB channel, ↑↓ focus, A select, B close</small>
      </form>
    </div>}
  </section>;
}
function Group({ group, self, busy, action, players }: { group: MmoGroup3D; self?: string; busy: boolean; action: (operation: Parameters<MmoCommunicationModel3D['social']>[0]) => Promise<void>; players: MmoPlayer3D[] }) {
  const manages = group.role === 'owner' || group.role === 'officer';
  return <div style={{ marginTop: 9 }}><strong>{group.name}</strong> · {group.kind} · {group.role} <button type="button" style={button} disabled={busy} onClick={() => void action({ action: 'leave', kind: group.kind, group: group.id })}>Leave</button>
    {group.members.map(member => <div key={member.id} style={{ marginTop: 4 }}>{member.name} · {member.role}{manages && member.id !== self && member.role !== 'owner' && <><button type="button" style={button} disabled={busy} onClick={() => void action({ action: 'kick', kind: group.kind, group: group.id, target: member.id })}>Kick</button>{group.role === 'owner' && <select aria-label={`Role for ${member.name}`} style={field} value={member.role} disabled={busy} onChange={event => void action({ action: 'role', kind: group.kind, group: group.id, target: member.id, role: event.target.value as MmoRole3D })}><option value="member">Member</option><option value="officer">Officer</option></select>}</>}</div>)}
    {group.my_permissions.invite && <form style={{ display: 'flex', gap: 4, marginTop: 4 }} onSubmit={event => { event.preventDefault(); const target = String(new FormData(event.currentTarget).get('invite') ?? ''); if (target) void action({ action: 'invite', kind: group.kind, group: group.id, target }); }}><select name="invite" aria-label={`Invite nearby player to ${group.kind}`} required style={{ ...field, flex: 1 }} defaultValue=""><option value="" disabled>Invite nearby player</option>{players.filter(peer => !group.members.some(member => member.id === peer.id)).map(peer => <option key={peer.id} value={peer.id}>{peer.name}</option>)}</select><button type="submit" style={button} disabled={busy}>Invite</button></form>}
    {group.kind === 'guild' && group.role === 'owner' && <details style={{ marginTop: 5 }}><summary>Guild role permissions</summary>{(['officer', 'member'] as const).map(role => <fieldset key={role} style={{ border: '1px solid #ffffff20' }}><legend>{label(role)}</legend>{(['read', 'write', 'invite'] as const).map(permission => <label key={permission} style={{ marginRight: 8 }}><input type="checkbox" checked={group.permissions[role][permission]} disabled={busy} onChange={event => void action({ action: 'permissions', kind: 'guild', group: group.id, permissions: { ...group.permissions, [role]: { ...group.permissions[role], [permission]: event.target.checked } } })} />{permission}</label>)}</fieldset>)}</details>}
  </div>;
}
