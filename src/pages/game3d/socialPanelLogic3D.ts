import type { PlayerProfile3D, SocialState3D } from './socialFarmTypes3D';

export function activeSocialInvitations3D<T extends { expires_at: string }>(items: T[], now = Date.now()): T[] {
  return items.filter(item => Number.isFinite(Date.parse(item.expires_at)) && Date.parse(item.expires_at) > now);
}
export function socialPendingCount3D(state: SocialState3D | null, now = Date.now()): number {
  return (state?.incoming.length ?? 0) + activeSocialInvitations3D(state?.farm_invitations ?? [], now).length;
}
export function socialProfileActions3D(friendship: PlayerProfile3D['friendship']): ('request' | 'accept' | 'decline' | 'cancel' | 'remove')[] {
  if (friendship === 'none') return ['request'];
  if (friendship === 'incoming') return ['accept', 'decline'];
  if (friendship === 'outgoing') return ['cancel'];
  if (friendship === 'friend') return ['remove'];
  return [];
}
