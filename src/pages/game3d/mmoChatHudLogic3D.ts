import type { MmoChannel3D, MmoMessage3D } from './mmoCommunicationTypes3D';

export const MMO_PREVIEW_MS_3D = 6500;
export function mmoHudPreview3D(messages: MmoMessage3D[], now: number): MmoMessage3D[] {
  return messages.filter(message => typeof message.receivedAt === 'number' && now >= message.receivedAt && now - message.receivedAt < MMO_PREVIEW_MS_3D).slice(-4);
}
export function mmoHudConversation3D(messages: MmoMessage3D[], channel: MmoChannel3D, selfId?: string, target?: string): MmoMessage3D[] {
  return messages.filter(message => message.channel === channel && (channel !== 'private' || Boolean(target && ((message.sender_id === target && message.recipient_id === selfId) || (message.sender_id === selfId && message.recipient_id === target)))))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || (a.id.length - b.id.length) || a.id.localeCompare(b.id));
}
export function mmoHudButtonEdges3D(current: readonly boolean[], previous: readonly boolean[]): number[] {
  return current.flatMap((pressed, index) => pressed && !previous[index] ? [index] : []);
}
