import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TownLocalPose3D } from './townMultiplayer3D';
import type { MmoCommunicationModel3D, MmoPresence3D } from './mmoCommunicationTypes3D';
import { createMmoCommunicationClient3D } from './mmoCommunicationClient3D';

type Options = { client: SupabaseClient | null; userId: string | null; name: string; world: 'farm' | 'town' | 'house' | `farm:${string}`; pose: MutableRefObject<TownLocalPose3D>; onCorrection: (presence: MmoPresence3D) => void; identityStatus: 'connecting' | 'ready' | 'offline' | 'error'; identityError: string; retryIdentity: () => void; movementOwned?:()=>boolean };
const empty: MmoCommunicationModel3D = { status: 'connecting', error: '', state: null, messages: [], loadingHistory: false, hasMore: false, send: async () => false, loadHistory: async () => {}, markRead: async () => {}, social: async () => false, findPlayers: async () => [], retry: () => {}, clearError: () => {} };
export function useMmoCommunication3D({ client, userId, name, world, pose, onCorrection, identityStatus, identityError, retryIdentity,movementOwned }: Options): MmoCommunicationModel3D {
  const [model, setModel] = useState<MmoCommunicationModel3D>(empty);
  const movementOwner=useRef(movementOwned);movementOwner.current=movementOwned;
  const correction = useRef(onCorrection); correction.current = onCorrection;
  const connection = useRef<ReturnType<typeof createMmoCommunicationClient3D> | null>(null);
  const closed = useRef<Promise<void>>(Promise.resolve());
  const owner = useRef<{ userId: string; world: string } | null>(null);
  useEffect(() => {
    if (!client || !userId || identityStatus !== 'ready') { connection.current = null; owner.current = null; setModel({ ...empty, status: identityStatus === 'ready' ? 'offline' : identityStatus, error: identityError }); return; }
    let disposed = false;
    const service = createMmoCommunicationClient3D({ client, userId, name, world, getPose: () => pose.current,movementOwned:()=>Boolean(movementOwner.current?.()), onCorrection: presence => correction.current(presence), onChange: next => { if (!disposed) setModel(next); } });
    connection.current = service; owner.current = { userId, world }; setModel(service.snapshot());
    void closed.current.then(() => { if (!disposed) return service.start(); });
    return () => { disposed = true; if (connection.current === service) { connection.current = null; owner.current = null; } closed.current = Promise.all([closed.current, service.stop()]).then(() => {}); };
  }, [client, userId, name, world, pose, identityStatus, identityError]);
  // Mask a previous account/world immediately, before effect cleanup runs.
  if (identityStatus !== 'ready' || !client || !userId) return { ...empty, status: identityStatus === 'ready' ? 'offline' : identityStatus, error: identityError, retry: retryIdentity };
  if (owner.current?.userId !== userId || owner.current.world !== world) return { ...empty, retry: retryIdentity };
  return { ...model, retry: () => { if (connection.current) connection.current.snapshot().retry(); else retryIdentity(); } };
}
