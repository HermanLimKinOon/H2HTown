import {useGamePanel3D} from './useGamePanel3D';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { MmoPlayer3D } from './mmoCommunicationTypes3D';
import type { PlayerProfile3D, SocialFarmModel3D } from './socialFarmTypes3D';
import { activeSocialInvitations3D, socialPendingCount3D, socialProfileActions3D } from './socialPanelLogic3D';

type Props = { model: SocialFarmModel3D; selectedPlayer: MmoPlayer3D | null; onSelectPlayer: (peer: MmoPlayer3D | null) => void; onPrivateChat: (peer: MmoPlayer3D) => void; onFocusChange: (focused: boolean) => void };
type Run = (operation: () => Promise<boolean | void>, failure?: string) => Promise<void>;
type ListProps = { model: SocialFarmModel3D; disabled: boolean; run: Run; onSelectPlayer: (peer: MmoPlayer3D) => void };
const button: CSSProperties = { border: '1px solid #ffffff26', borderRadius: 7, padding: '6px 9px', background: '#ffffff0c', color: 'inherit', font: 'inherit', cursor: 'pointer' };
const field: CSSProperties = { ...button, background: '#020617b3', minWidth: 0, boxSizing: 'border-box' };
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ffffff12' };
const actionNames = { request: 'Add friend', accept: 'Accept friend request', decline: 'Decline friend request', cancel: 'Cancel friend request', remove: 'Remove friend' };
function PlayerName({ peer, onSelectPlayer }: { peer: MmoPlayer3D; onSelectPlayer: (peer: MmoPlayer3D) => void }) {
  return <button type="button" style={{ ...button, flex: '1 1 120px', textAlign: 'left', background: 'transparent' }} onClick={() => onSelectPlayer(peer)} aria-label={`View ${peer.name}'s profile`}><span aria-hidden="true" style={{ color: peer.online ? '#86efac' : '#94a3b8', marginRight: 5 }}>●</span>{peer.name}<small style={{ display: 'block', color: '#94a3b8', paddingLeft: 13 }}>{peer.online === true ? 'Online' : peer.online === false ? 'Offline' : 'View profile'}</small></button>;
}
export function SocialRequests3D({ model, disabled, run, onSelectPlayer }: ListProps) {
  return <><h3 style={{ margin: '5px 0' }}>Received requests</h3>{!model.state?.incoming.length && <p style={{ color: '#94a3b8' }}>No friend requests waiting.</p>}{model.state?.incoming.map(peer => <div style={row} key={peer.id}><PlayerName peer={peer} onSelectPlayer={onSelectPlayer} /><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.friend('accept', peer.id))}>Accept</button><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.friend('decline', peer.id))}>Decline</button></div>)}<h3 style={{ margin: '14px 0 5px' }}>Sent requests</h3>{!model.state?.outgoing.length && <p style={{ color: '#94a3b8' }}>No pending sent requests.</p>}{model.state?.outgoing.map(peer => <div style={row} key={peer.id}><PlayerName peer={peer} onSelectPlayer={onSelectPlayer} /><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.friend('cancel', peer.id))}>Cancel request</button></div>)}</>;
}
export function SocialInvitations3D({ model, disabled, run, onSelectPlayer, now = Date.now() }: ListProps & { now?: number }) {
  const invitations = activeSocialInvitations3D(model.state?.farm_invitations ?? [], now);
  const sent = activeSocialInvitations3D(model.state?.sent_invitations ?? [], now);
  const visitors = activeSocialInvitations3D(model.state?.visitors ?? [], now);
  return <><h3 style={{ margin: '5px 0' }}>Farm invitations</h3><p style={{ color: '#94a3b8', marginTop: 5 }}>Accept to travel to your friend's farm. Your own farm stays saved.</p>{!invitations.length && <p>No farm invitations waiting.</p>}{invitations.map(invite => <div key={invite.id} style={row}><div style={{ flex: '1 1 120px' }}><button type="button" style={{ ...button, textAlign: 'left' }} onClick={() => onSelectPlayer({ id: invite.owner_id, name: invite.owner_name })}>{invite.owner_name}'s farm</button><small style={{ display: 'block', color: '#94a3b8', marginTop: 4 }}>Expires {new Date(invite.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.respond(invite.id, true), 'Could not travel to this farm. The invitation may have expired.')}>Accept & travel</button><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.respond(invite.id, false))}>Decline</button></div>)}
    <h3 style={{ margin: '14px 0 5px' }}>Your guests</h3>{!visitors.length && <p style={{ color: '#94a3b8' }}>No active farm visitors.</p>}{visitors.map(visitor => <div key={visitor.id} style={row}><PlayerName peer={visitor} onSelectPlayer={onSelectPlayer} /><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.revoke(visitor.id))}>Revoke access</button></div>)}
    <h3 style={{ margin: '14px 0 5px' }}>Sent invitations</h3>{!sent.length && <p style={{ color: '#94a3b8' }}>No pending farm invitations.</p>}{sent.map(invite => <div key={invite.id} style={row}><PlayerName peer={{ id: invite.target_id, name: invite.target_name }} onSelectPlayer={onSelectPlayer} /><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.revoke(invite.target_id))}>Revoke invitation</button></div>)}</>;
}
export function SocialProfileCard3D({ profile, model, disabled, run, onPrivateChat, onClose }: { profile: PlayerProfile3D; model: SocialFarmModel3D; disabled: boolean; run: Run; onPrivateChat: (peer: MmoPlayer3D) => void; onClose: () => void }) {
  const [bio, setBio] = useState(profile.bio);
  const self = profile.friendship === 'self' && profile.id === model.selfId;
  const online = profile.online;
  const submit = (event: FormEvent) => { event.preventDefault(); void run(() => model.saveProfile(bio), 'Profile could not be saved.'); };
  return <article aria-label={`${profile.name}'s profile`} style={{ border: '1px solid #ffffff25', background: '#ffffff06', borderRadius: 9, padding: 11, marginBottom: 12 }}>
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, color: '#bbf7d0', background: '#14532d99', fontSize: 18 }}>{Array.from(profile.name.trim())[0] ?? '?'}</span><div style={{ flex: 1, minWidth: 0 }}><h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{profile.name}{self ? ' (you)' : ''}</h3><small style={{ color: online ? '#86efac' : '#94a3b8' }}>{online === true ? 'Online' : online === false ? 'Offline' : 'Status unavailable'}{profile.friendship === 'friend' ? ' · Friend' : profile.friendship === 'blocked' ? ' · Blocked' : ''}</small></div><button type="button" style={button} onClick={onClose} aria-label="Close player profile">×</button></div>
    {self ? <form onSubmit={submit}><label style={{ display: 'block', marginTop: 10 }} htmlFor="social-profile-bio">Your bio</label><textarea id="social-profile-bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={240} rows={3} placeholder="Tell other players a little about yourself" style={{ ...field, width: '100%', marginTop: 5, resize: 'vertical' }} disabled={disabled} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}><small style={{ color: '#94a3b8' }}>{bio.length}/240</small><button type="submit" style={button} disabled={disabled || bio === profile.bio}>Save bio</button></div></form> : <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: profile.bio ? '#e2e8f0' : '#94a3b8', margin: '10px 0' }}>{profile.bio || 'No bio yet.'}</p>}
    {!self && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>{profile.friendship !== 'blocked' && <button type="button" style={button} disabled={disabled} onClick={() => onPrivateChat(profile)}>Private chat</button>}{socialProfileActions3D(profile.friendship).map(action => <button type="button" key={action} style={{ ...button, color: action === 'remove' || action === 'decline' ? '#fecaca' : '#e2e8f0' }} disabled={disabled} onClick={() => void run(() => model.friend(action, profile.id))}>{actionNames[action]}</button>)}{profile.friendship === 'friend' && <button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.invite(profile.id), 'Farm invitation could not be sent. Please return home and try again.')}>Invite to my farm</button>}</div>}
  </article>;
}
export default function SocialPanel3D({ model, selectedPlayer, onSelectPlayer, onPrivateChat, onFocusChange }: Props) {
  const [expanded, setExpanded] = useState(Boolean(selectedPlayer));
  const [tab, setTab] = useState<'friends' | 'requests' | 'invitations'>('friends');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MmoPlayer3D[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const busy = useRef(false), request = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const { findPlayers, loadProfile, selfId } = model;
  const disabled = model.busy || localBusy || model.status !== 'online';
  const selectedId = selectedPlayer?.id;
  const profile = model.profile?.id === selectedId ? model.profile : null;
  const count = socialPendingCount3D(model.state, now);
  const open = useCallback(() => { setExpanded(true); requestAnimationFrame(() => panel.current?.focus()); }, []);
  const close = useCallback(() => { setExpanded(false); onSelectPlayer(null); onFocusChange(false); requestAnimationFrame(() => launcher.current?.focus()); }, [onSelectPlayer, onFocusChange]);
  useGamePanel3D('friends',expanded,close);
  const select = (peer: MmoPlayer3D) => { onSelectPlayer(peer); open(); };
  const chat = (peer: MmoPlayer3D) => { close(); onPrivateChat(peer); };
  const run: Run = async (operation, failure = 'The action could not be completed. Please try again.') => {
    if (busy.current || model.busy || localBusy) return;
    busy.current = true; setLocalBusy(true); setLocalError('');
    try { if (await operation() === false) setLocalError(failure); }
    catch { setLocalError(failure); }
    finally { busy.current = false; setLocalBusy(false); }
  };
  useEffect(() => { onFocusChange(expanded); return () => onFocusChange(false); }, [expanded, onFocusChange]);
  useEffect(() => { if (selectedId) open(); }, [selectedId, open]);
  useEffect(() => {
    if (!selectedId || !expanded || !selfId) return;
    let current = true;
    void loadProfile(selectedId).catch(() => { if (current) setLocalError('This profile could not be loaded.'); });
    return () => { current = false; };
  }, [selectedId, expanded, selfId, loadProfile]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 10000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const token = ++request.current; let current = true;
    if (!expanded || query.trim().length < 2 || model.status !== 'online') { setResults([]); setSearching(false); setSearched(false); return; }
    setSearching(true); setSearched(false); setResults([]);
    const timer = window.setTimeout(() => { void findPlayers(query.trim()).then(players => { if (current && request.current === token) { setResults(players.filter(peer => peer.id !== selfId)); setSearched(true); } }).catch(() => { if (current && request.current === token) setLocalError('Player search is unavailable. Please try again.'); }).finally(() => { if (current && request.current === token) setSearching(false); }); }, 250);
    return () => { window.clearTimeout(timer); current = false; };
  }, [query, expanded, model.status, selfId, findPlayers]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
    window.addEventListener('keydown', escape, true); return () => window.removeEventListener('keydown', escape, true);
  }, [expanded, close]);
  const listProps: ListProps = { model, disabled, run, onSelectPlayer: select };
  return <section className="social-panel-3d" aria-label="Friends and farm visits" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>

    {<div style={{ display: 'flex', justifyContent: 'flex-end' }}><button ref={launcher} type="button" style={{ ...button, background: '#0f172aeb', borderRadius: 18, boxShadow: '0 4px 12px #0004' }} aria-expanded={expanded} aria-label={`Open friends${count ? `, ${count} pending requests and invitations` : ''}`} onClick={expanded?close:open}>♧ Friends{count > 0 && <span style={{ marginLeft: 6, borderRadius: 12, background: '#15803d', padding: '1px 6px' }}>{count}</span>}</button></div>}
    {model.visiting && <div className="social-visit-banner" role="status" style={{ background: '#14532de8', border: '1px solid #86efac66', borderRadius: 8, padding: 8, marginTop: expanded ? 0 : 7, marginBottom: expanded ? 7 : 0, maxWidth: 350 }}>Visiting {model.visiting.name}'s farm <button type="button" style={{ ...button, marginLeft: 5 }} disabled={model.busy || localBusy} onClick={() => void run(() => model.leave(), 'Could not return home. Please try again.')}>Return home</button></div>}
    {expanded && <div ref={panel} tabIndex={-1} className="social-dialog" role="dialog" aria-label="Friends, profiles and farm invitations" aria-modal="false" style={{ width: 'min(370px, calc(100vw - 24px - env(safe-area-inset-right, 0px) - env(safe-area-inset-left, 0px)))', display: 'flex', flexDirection: 'column', maxHeight: 'min(620px,70dvh)', background: '#0b1220f5', border: '1px solid #64748b66', borderRadius: 11, boxShadow: '0 8px 28px #0006', overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 5, padding: 9 }}><strong style={{ flex: 1 }}>Friends <small style={{ color: model.status === 'online' ? '#86efac' : '#fbbf24', fontWeight: 400 }}>{model.status}</small></strong><button type="button" style={button} disabled={!selfId} onClick={() => { if (selfId) select({ id: selfId, name: 'My profile' }); }}>My profile</button><button type="button" style={button} onClick={close} aria-label="Close friends panel">×</button></header>
      <div role="tablist" aria-label="Social pages" style={{ display: 'flex', gap: 4, padding: '0 9px 9px' }}>{(['friends', 'requests', 'invitations'] as const).map((name, index, tabs) => <button type="button" role="tab" key={name} id={`social-tab-${name}`} aria-selected={tab === name} aria-controls={`social-page-${name}`} style={{ ...button, flex: 1, background: tab === name ? '#16653499' : 'transparent' }} onClick={() => setTab(name)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1)! : tabs[(index + (event.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length]; setTab(next); document.getElementById(`social-tab-${next}`)?.focus(); } }}>{name[0].toUpperCase() + name.slice(1)}{name === 'requests' && model.state?.incoming.length ? ` ${model.state.incoming.length}` : name === 'invitations' && activeSocialInvitations3D(model.state?.farm_invitations ?? [], now).length ? ` ${activeSocialInvitations3D(model.state?.farm_invitations ?? [], now).length}` : ''}</button>)}</div>
      <div style={{ padding: '0 10px 10px', overflowY: 'auto', overflowWrap: 'anywhere' }}>
        {(localError || model.error) && <div role="alert" style={{ color: '#fecaca', marginBottom: 8 }}>{localError || model.error} <button type="button" style={button} onClick={() => { setLocalError(''); model.clearError(); }}>Dismiss</button></div>}
        {model.status !== 'online' && <p role="status" style={{ color: '#fbbf24' }}>Social features are {model.status}. <button type="button" style={button} disabled={model.busy || localBusy} onClick={() => { setLocalError(''); void model.refresh().catch(() => setLocalError('Could not reconnect. Please try again.')); }}>Retry</button></p>}
        {selectedPlayer && (profile ? <SocialProfileCard3D key={`${profile.id}:${selfId}`} profile={profile} model={model} disabled={disabled} run={run} onPrivateChat={chat} onClose={() => onSelectPlayer(null)} /> : <div role="status" style={{ padding: 10, marginBottom: 10 }}>Loading {selectedPlayer.name}'s profile… <button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.loadProfile(selectedPlayer.id), 'This profile could not be loaded.')}>Retry profile</button></div>)}
        <div role="tabpanel" id={`social-page-${tab}`} aria-labelledby={`social-tab-${tab}`}>
          {tab === 'friends' ? <><label htmlFor="social-player-search" style={{ display: 'block', color: '#cbd5e1', marginBottom: 5 }}>Find a player</label><input id="social-player-search" type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={60} placeholder="Search names (2+ letters)" disabled={model.status !== 'online'} style={{ ...field, width: '100%' }} />{searching && <p role="status">Searching…</p>}{searched && !results.length && <p role="status">No players found.</p>}{results.length > 0 && <div aria-label="Player search results">{results.map(peer => <div key={peer.id} style={row}><PlayerName peer={peer} onSelectPlayer={select} /></div>)}</div>}<h3 style={{ margin: '13px 0 5px' }}>Your friends ({model.state?.friends.length ?? 0})</h3>{!model.state?.friends.length && <p style={{ color: '#94a3b8' }}>Find a player to send your first friend request.</p>}{model.state?.friends.map(peer => <div key={peer.id} style={row}><PlayerName peer={peer} onSelectPlayer={select} /><button type="button" style={button} disabled={disabled} onClick={() => chat(peer)}>Chat</button><button type="button" style={button} disabled={disabled} onClick={() => void run(() => model.invite(peer.id), 'Farm invitation could not be sent. Please try again from your farm.')}>Invite to farm</button></div>)}</> : tab === 'requests' ? <SocialRequests3D {...listProps} /> : <SocialInvitations3D {...listProps} now={now} />}
        </div>
        {model.busy || localBusy ? <p role="status" style={{ color: '#94a3b8', marginBottom: 0 }}>Working…</p> : null}
      </div>
    </div>}
    {!expanded && localError && <p role="alert" style={{ background: '#0f172aef', borderRadius: 7, color: '#fecaca', padding: 7, maxWidth: 300 }}>{localError}</p>}
  </section>;
}
