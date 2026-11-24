export const gameItemIds = ['hoe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'axe', 'wood'] as const;

export type GameItemId = typeof gameItemIds[number];
export type HotbarSlots = [
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
  GameItemId | null,
];

export const defaultHotbar: HotbarSlots = ['hoe', 'wateringCan', 'seeds', 'carrot', 'petFood', 'axe', 'wood', null];

const isGameItemId = (value: unknown): value is GameItemId =>
  typeof value === 'string' && (gameItemIds as readonly string[]).includes(value);

export function normalizeHotbar(value: unknown): HotbarSlots {
  if (!Array.isArray(value) || value.length !== 8) return [...defaultHotbar];
  if (!value.every(item => item === null || isGameItemId(item))) return [...defaultHotbar];
  const assigned = value.filter(isGameItemId);
  if (new Set(assigned).size !== assigned.length) return [...defaultHotbar];
  return [...value] as HotbarSlots;
}

export function assignHotbarItem(slots: HotbarSlots, targetIndex: number, itemId: GameItemId): HotbarSlots {
  if (targetIndex < 0 || targetIndex >= slots.length) return [...slots];
  const next = [...slots] as HotbarSlots;
  const previousIndex = next.indexOf(itemId);
  const displaced = next[targetIndex];
  next[targetIndex] = itemId;
  if (previousIndex >= 0 && previousIndex !== targetIndex) next[previousIndex] = displaced;
  return next;
}

export function clearHotbarSlot(slots: HotbarSlots, targetIndex: number): HotbarSlots {
  if (targetIndex < 0 || targetIndex >= slots.length) return [...slots];
  const next = [...slots] as HotbarSlots;
  next[targetIndex] = null;
  return next;
}

export function buildInventorySlots<T>(items: readonly T[], slotCount = 24): (T | null)[] {
  return Array.from({ length: Math.max(slotCount, items.length) }, (_, index) => items[index] ?? null);
}
