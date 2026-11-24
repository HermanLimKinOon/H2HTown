import { normalizeMirrorLook, type MirrorLook3D } from './mirrorAppearance3D';

// Keep the original farmer appearance and all farm progress in their existing save.
export const CHARACTER_CHOICE_KEY = 'h2h-character-selection-v1';
export type CharacterModel3D = 'custom' | 'farmer';
export type CharacterChoice3D = { model: CharacterModel3D; customLook: MirrorLook3D };

export function normalizeCharacterChoice3D(value: unknown, mirrorLook?: unknown): CharacterChoice3D {
  const input = value && typeof value === 'object' ? value as Partial<CharacterChoice3D> : {};
  return { model: input.model === 'farmer' ? 'farmer' : 'custom', customLook: normalizeMirrorLook(input.customLook ?? mirrorLook) };
}

export function selectCharacter3D(current: CharacterChoice3D, model: CharacterModel3D, look?: MirrorLook3D): CharacterChoice3D {
  return normalizeCharacterChoice3D({ model, customLook: look ?? current.customLook });
}
