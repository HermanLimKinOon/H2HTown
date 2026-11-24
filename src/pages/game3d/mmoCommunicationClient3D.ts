import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { mergeMmoMessages3D, parseMmoMessage3D, mmoErrorText3D } from './mmoCommunication3D';
import type { MmoChannel3D, MmoCommunicationModel3D, MmoMessage3D, MmoPlayer3D, MmoPresence3D, MmoSocialAction3D, MmoState3D } from './mmoCommunicationTypes3D';

type HistoryChannel = MmoChannel3D | 'system';
type Thread = { channel: HistoryChannel; target?: string; hasMore: boolean; loading: boolean; version: number; cursor?: { id: string; created_at: string } };
type Options = { client: SupabaseClient; userId: string; name: string; world: 'farm' | 'town' | 'house' | `farm:${string}`; getPose: () => { x: number; z: number }; movementOwned?:()=>boolean; onCorrection: (presence: MmoPresence3D) => void; onChange: (model: MmoCommunicationModel3D) => void };
const PAGE = 30;
const threadKey = (channel: HistoryChannel, target?: string) => `${channel}:${target ?? ''}`;
export function createMmoCommunicationClient3D(options: Options) {
  const { client, userId } = options;
  let stopped = false, generation = 0, lease: string | null = null;
  let channel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let tickTimer: ReturnType<typeof setTimeout> | undefined;
  let stateTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0, seq = 0, activeKey = 'local:';
  let status: MmoCommunicationModel3D['status'] = 'connecting', error = '';
  let state: MmoState3D | null = null, messages: MmoMessage3D[] = [];
  // Keep one bounded older browsing window separately from the recent live cache.
  let olderWindow: { key: string; messages: MmoMessage3D[] } | null = null;
  let refreshRunning: Promise<void> | null = null;
  let pendingConnect: Promise<void> = Promise.resolve();
  let closedChannel: Promise<void> = Promise.resolve();
  let stateVersion = 0;
  const threads = new Map<string, Thread>();
  const failedNonces = new Map<string, string>();
  const valid = (token: number) => !stopped && generation === token;
  const getThread = (c: HistoryChannel, target?: string) => { const key = threadKey(c, target); let thread = threads.get(key); if (!thread) { thread = { channel: c, target, hasMore: true, loading: false, version: 0 }; threads.set(key, thread); } return thread; };
  const belongs = (message: MmoMessage3D, c: HistoryChannel, target?: string) => message.channel === c && (c !== 'private' || message.sender_id === target && message.recipient_id === userId || message.sender_id === userId && message.recipient_id === target);
  const permitted = (message: MmoMessage3D) => {
    if (!state) return false;
    if (message.channel === 'party' || message.channel === 'guild') return state.groups.some(group => group.id === message.group_id && group.kind === message.channel && group.my_permissions.read);
    if (message.channel === 'private') { const peer = message.sender_id === userId ? message.recipient_id : message.sender_id; return Boolean(peer && (message.sender_id === userId || message.recipient_id === userId) && !state.blocked.some(item => item.id === peer)); }
    return true;
  };
  const emit = () => { if (!stopped) options.onChange(snapshot()); };
  const applyState = (next: MmoState3D) => {
    if (!next || next.profile?.id !== userId || !Array.isArray(next.groups) || !Array.isArray(next.conversations) || !Array.isArray(next.blocked)) throw new Error('Invalid communication state.');
    state = next; messages = messages.filter(permitted); if (olderWindow) olderWindow.messages = olderWindow.messages.filter(permitted); emit();
  };
  const add = (incoming: MmoMessage3D[]) => { const confirmed = new Set(incoming.filter(message => !message.pending && !message.failed && message.nonce).map(message => `${message.sender_id}:${message.nonce}`)); for (const [signature, nonce] of failedNonces) if (confirmed.has(`${userId}:${nonce}`)) failedNonces.delete(signature); messages = messages.filter(message => !((message.failed || message.pending) && message.nonce && confirmed.has(`${message.sender_id}:${message.nonce}`))); messages = mergeMmoMessages3D(messages, incoming.filter(permitted)); emit(); };
  const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => { const response = await client.rpc(name, args); if (response.error) throw response.error; return response.data as T; };
  const setError = (reason: unknown) => { error = mmoErrorText3D(reason); emit(); };
  const leave = (old: string | null): Promise<void> => old ? rpc('mmo_leave', { p_client: old }).then(() => {}, () => {}) : Promise.resolve();
  const unsubscribe = () => { const old = channel; channel = null; if (old) closedChannel = Promise.all([closedChannel, client.removeChannel(old).catch(() => {})]).then(() => {}); };
  const clearTimers = () => { clearTimeout(tickTimer); clearTimeout(stateTimer); clearTimeout(refreshTimer); };
  const refreshState = (): Promise<void> => {
    if (refreshRunning) return refreshRunning;
    const token = generation, version = ++stateVersion;
    const run = rpc<MmoState3D>('mmo_state').then(next => { if (valid(token) && version === stateVersion) applyState(next); });
    refreshRunning = run.finally(() => { if (refreshRunning === tracked) refreshRunning = null; });
    const tracked = refreshRunning;
    return tracked;
  };
  const deferState = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { if (!stopped) void refreshState().catch(setError); }, 180); };
  const history = async (c: HistoryChannel, target?: string, older = false, activate = true) => {
    if (stopped || !state || (c === 'private' && !target)) return;
    if ((c === 'party' || c === 'guild') && !state.groups.some(group => group.kind === c && group.my_permissions.read)) return;
    const key = threadKey(c, target), thread = getThread(c, target);
    if (activate) { if (activeKey !== key || !older) olderWindow = null; activeKey = key; emit(); }
    if (thread.loading) return;
    const token = generation, version = ++thread.version;
    // Page from the last contiguous server page, never the oldest cached message: reconnect may leave a gap between cached history and the newest page.
    const oldest = older ? thread.cursor : undefined;
    thread.loading = true; emit();
    try {
      const data = await rpc<unknown[]>('mmo_history', { p_channel: c, p_target: target ?? null, p_before: oldest?.created_at ?? null, p_before_id: oldest?.id ?? null, p_limit: PAGE });
      if (!valid(token) || version !== thread.version) return;
      const parsed = (Array.isArray(data) ? data : []).flatMap(value => { const message = parseMmoMessage3D(value); return message && belongs(message, c, target) ? [message] : []; });
      if (older && activate) {
        const previous = olderWindow?.key === key ? olderWindow.messages : messages.filter(message => !message.pending && !message.failed && belongs(message, c, target));
        olderWindow = { key, messages: mergeMmoMessages3D(previous, parsed.filter(permitted), previous.length + parsed.length).slice(0, 600) };
      }
      thread.hasMore = parsed.length === PAGE;
      if (parsed.length) thread.cursor = mergeMmoMessages3D([], parsed).at(0);
      else if (!older) thread.cursor = undefined;
      add(parsed);
    } catch (reason) { if (valid(token)) setError(reason); }
    finally { if (valid(token) && version === thread.version) { thread.loading = false; emit(); } }
  };
  const bootstrap = async (token: number) => {
    if (!state) return;
    const requests: [HistoryChannel, string?][] = [['local'], ['world'], ['system'], ...state.groups.filter(group => group.my_permissions.read).map(group => [group.kind] as [HistoryChannel]), ...state.conversations.slice(0, 12).map(peer => ['private', peer.peer_id] as [HistoryChannel, string])];
    const active = threads.get(activeKey);
    if (active && !requests.some(([c, target]) => threadKey(c, target) === activeKey)) requests.push([active.channel, active.target]);
    // Bound catch-up concurrency to keep reconnect from flooding a busy server.
    for (let index = 0; index < requests.length && valid(token); index += 3) await Promise.all(requests.slice(index, index + 3).map(([c, target]) => history(c, target, false, false)));
  };
  const reconnect = (reason?: unknown) => {
    if (stopped || retryTimer) return;
    generation++; stateVersion++; clearTimers(); unsubscribe();
    messages = messages.map(message => {
      if (!message.pending || !message.nonce) return message;
      failedNonces.set(JSON.stringify([message.channel, message.recipient_id ?? null, message.kind, message.body]), message.nonce);
      return { ...message, pending: false, failed: true };
    });
    while (failedNonces.size > 64) failedNonces.delete(failedNonces.keys().next().value!);
    const old = lease; lease = null; leave(old);
    for (const thread of threads.values()) { thread.loading = false; thread.version++; }
    refreshRunning = null;
    status = 'offline'; if (reason) error = mmoErrorText3D(reason); emit();
    const delay = Math.min(15000, 500 * 2 ** Math.min(failures++, 5));
    retryTimer = setTimeout(() => { retryTimer = undefined; pendingConnect = connect(); }, delay);
  };
  const tick = async (token: number, ownLease: string) => {
    if (!valid(token) || status !== 'online') return;
    if(options.movementOwned?.()){tickTimer=setTimeout(()=>{void tick(token,ownLease);},250);return;}
    try {
      const position = options.getPose();
      const next = await rpc<MmoPresence3D>('mmo_tick', { p_client: ownLease, p_seq: ++seq, p_x: position.x, p_z: position.z });
      if (!valid(token)) return;
      seq = Math.max(seq, next.seq);
      if (next.accepted === false&&!options.movementOwned?.()) options.onCorrection(next);
    } catch (reason) { if (valid(token)&&!options.movementOwned?.()) {reconnect(reason);return;} }
    if (valid(token)) tickTimer = setTimeout(() => { void tick(token, ownLease); }, 250);
  };
  const periodic = (token: number) => {
    stateTimer = setTimeout(() => { if (!valid(token)) return; void refreshState().catch(reason => { if (valid(token)) setError(reason); }).finally(() => { if (valid(token)) periodic(token); }); }, 15000);
  };
  const connect = async () => {
    if (stopped) return;
    const token = ++generation, ownLease = crypto.randomUUID(); lease = ownLease;
    status = 'connecting'; error = ''; emit();
    try {
      await closedChannel; if (!valid(token)) return;
      const connected = await rpc<MmoState3D & { presence: MmoPresence3D }>('mmo_connect', { p_client: ownLease, p_name: options.name, p_world: options.world, p_server: 'local-1' });
      if (!valid(token)) { await leave(ownLease); return; }
      applyState(connected); seq = connected.presence.seq; options.onCorrection(connected.presence);
      const inbox = client.channel(`mmo:inbox:${userId}`, { config: { private: true, broadcast: { self: false } } });
      channel = inbox;
      let subscribed = false;
      inbox.on('broadcast', { event: 'communication' }, packet => {
        if (!valid(token)) return;
        const payload = packet.payload;
        if (payload?.type === 'message') { const message = parseMmoMessage3D(payload.message, true); if (message) { add([message]); if (message.channel === 'private') deferState(); } }
        else if (payload?.type === 'social') void refreshState().catch(reason => { if (valid(token)) setError(reason); });
      }).subscribe(next => {
        if (!valid(token)) return;
        if (next === 'SUBSCRIBED' && !subscribed) { subscribed = true; status = 'online'; failures = 0; error = ''; emit(); clearTimeout(tickTimer); void tick(token, ownLease); clearTimeout(stateTimer); periodic(token); void bootstrap(token); }
        else if (next === 'CHANNEL_ERROR' || next === 'TIMED_OUT' || next === 'CLOSED') reconnect(new Error('Connection interrupted. Reconnecting…'));
      });
    } catch (reason) { if (valid(token)) reconnect(reason); else await leave(ownLease); }
  };
  const send = async (c: MmoChannel3D, body: string, target?: string, kind: 'text' | 'emote' = 'text', suppliedNonce?: string): Promise<boolean> => {
    if (stopped || status !== 'online' || !state) { setError(new Error('Connection interrupted. Please reconnect.')); return false; }
    const text = body.trim(), signature = JSON.stringify([c, target ?? null, kind, text]);
    if (!text || Array.from(text).length > state.config.max_length) { setError(new Error('Invalid message length')); return false; }
    const nonce = suppliedNonce ?? failedNonces.get(signature) ?? crypto.randomUUID();
    const optimistic: MmoMessage3D = { id: `pending-${nonce}`, channel: c, sender_id: userId, sender_name: state.profile.name, body: text, kind, created_at: new Date().toISOString(), group_id: state.groups.find(group => group.kind === c)?.id ?? null, recipient_id: target ?? null, world_id: state.profile.world_id ?? options.world, server_id: 'local-1', origin: null, nonce, pending: true };
    messages = messages.filter(message => message.id !== optimistic.id); add([optimistic]);
    const token = generation;
    try {
      const raw = await rpc<unknown>('mmo_send', { p_channel: c, p_body: text, p_nonce: nonce, p_target: target ?? null, p_kind: kind });
      const accepted = parseMmoMessage3D(raw, true);
      if (!accepted) throw new Error('Invalid message response.');
      failedNonces.delete(signature);
      if (valid(token)) { add([accepted]); error = ''; emit(); if (c === 'private') deferState(); }
      return true;
    } catch (reason) {
      if (valid(token) && messages.some(message => !message.pending && !message.failed && message.sender_id === userId && message.nonce === nonce)) return true;
      if (valid(token)) { failedNonces.set(signature, nonce); if (failedNonces.size > 64) failedNonces.delete(failedNonces.keys().next().value!); messages = messages.map(message => message.id === optimistic.id ? { ...message, pending: false, failed: true } : message); setError(reason); }
      return false;
    }
  };
  const markRead = async (c: MmoChannel3D, target?: string, through?: string) => {
    if (stopped || !through || !/^\d+$/.test(through) || !displayMessages().some(message => message.id === through && belongs(message, c, target) && permitted(message))) return;
    const token = generation;
    try { await rpc('mmo_read', { p_channel: c, p_target: target ?? null, p_through: through }); if (valid(token)) await refreshState(); }
    catch (reason) { if (valid(token)) setError(reason); throw reason; }
  };
  const social = async (operation: MmoSocialAction3D) => {
    if (stopped || status !== 'online') return false;
    const token = generation, version = ++stateVersion;
    try {
      const next = await rpc<MmoState3D>('mmo_social', { p_action: operation.action, p_kind: operation.kind ?? 'party', p_target: operation.target ?? null, p_name: operation.name ?? null, p_group: operation.group ?? null, p_role: operation.role ?? null, p_permissions: operation.permissions ?? null });
      if (valid(token) && version === stateVersion) { applyState(next); error = ''; emit(); }
      return true;
    } catch (reason) { if (valid(token)) setError(reason); return false; }
  };
  const findPlayers = async (query: string): Promise<MmoPlayer3D[]> => {
    if (stopped || query.trim().length < 2) return [];
    const token = generation;
    try { const players = await rpc<MmoPlayer3D[]>('mmo_find_players', { p_search: query.trim().slice(0, 60), p_limit: 12 }); return valid(token) && Array.isArray(players) ? players.filter(player => typeof player.id === 'string' && typeof player.name === 'string' && player.id !== userId) : []; }
    catch (reason) { if (valid(token)) setError(reason); return []; }
  };
  const retry = () => { if (stopped) return; clearTimeout(retryTimer); retryTimer = undefined; reconnect(); };
  const clearError = () => { error = ''; emit(); };
  const loadHistory: MmoCommunicationModel3D['loadHistory'] = (c, target, older) => history(c, target, older);
  function displayMessages(): MmoMessage3D[] { return olderWindow?.key === activeKey ? mergeMmoMessages3D(messages, olderWindow.messages, 1200) : messages; }
  function snapshot(): MmoCommunicationModel3D { const thread = threads.get(activeKey) ?? getThread('local'); return { status, error, state, messages: displayMessages(), loadingHistory: thread.loading, hasMore: thread.hasMore, send, loadHistory, markRead, social, findPlayers, retry, clearError }; }
  return { start: () => { if (!stopped) pendingConnect = connect(); return pendingConnect; }, snapshot, stop: (): Promise<void> => { if (stopped) return pendingConnect; stopped = true; generation++; stateVersion++; clearTimeout(retryTimer); clearTimers(); unsubscribe(); const old = lease; lease = null; threads.clear(); failedNonces.clear(); olderWindow = null; return Promise.all([pendingConnect.then(() => leave(old)), closedChannel]).then(() => {}); } };
}
