import { DEFAULT_MIRROR_LOOK, normalizeMirrorLook, type MirrorLook3D } from './mirrorAppearance3D';
import type { CharacterModel3D } from './characterChoice3D';

export const BLENDER_REFERENCE_ASSET = '/game3d/blender-reference-v2.glb';
export const BLENDER_REFERENCE_LOOK_KEY = 'h2h-blender-reference-preview-v2';
export const DEFAULT_BLENDER_REFERENCE_LOOK: MirrorLook3D = {
  ...DEFAULT_MIRROR_LOOK, name: 'Portrait study', hairTint: false, skinTint: false, clothesTint: false,
};
export type MirrorEditorModel3D = CharacterModel3D | 'reference';
export function canApplyMirrorModel(model: MirrorEditorModel3D): model is CharacterModel3D {
  return model === 'custom' || model === 'farmer';
}
export function normalizeBlenderReferenceLook(value: unknown): MirrorLook3D {
  return normalizeMirrorLook({ ...DEFAULT_BLENDER_REFERENCE_LOOK, ...(value && typeof value === 'object' ? value : {}) });
}
