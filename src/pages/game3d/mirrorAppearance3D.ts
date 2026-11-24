// Editor draft settings. Applying a character stores a separate normalized copy.
export const MIRROR_LOOK_KEY = 'h2h-mirror-sculpted-v3';
export const MIRROR_FACE_CONTROLS = ['faceWidth', 'jawWidth', 'noseWidth', 'eyeSpacing', 'mouthWidth', 'chinHeight', 'noseLength', 'eyeSize', 'cheekFullness', 'browHeight'] as const;
export const MIRROR_ANGLE_CONTROLS = ['eyeTilt', 'chinAngle'] as const;
export const MIRROR_DETAIL_CONTROLS = ['cheekSize', 'lowerFaceWidth', 'faceLength', 'underneck', 'earSize', 'browThickness', 'browArch', 'browRotate', 'browOrbit', 'foreheadDepth', 'eyeWidth', 'outerEyeHeight', 'eyeDepth', 'eyeHeight', 'orbitHeight', 'noseSize', 'nostrilWidth', 'noseHeight', 'noseTipTurn', 'noseTipHeight', 'mouthHeight', 'mouthCorner', 'lipThickness', 'upperLipPinch', 'lowerLipPinch', 'chinDepth', 'chinPoint', 'jawDepth', 'jawAngle'] as const;
export type MirrorDetailControl = typeof MIRROR_DETAIL_CONTROLS[number];
export type MirrorFaceControl = MirrorDetailControl | typeof MIRROR_FACE_CONTROLS[number] | typeof MIRROR_ANGLE_CONTROLS[number];
export const MIRROR_PHYSIQUE_CONTROLS = ['bodyFat', 'muscle', 'shoulders', 'chest', 'waist', 'hips', 'arms', 'legs'] as const;
export type MirrorPhysiqueControl = typeof MIRROR_PHYSIQUE_CONTROLS[number];
export type MirrorLook3D = {
  name: string; height: number; build: number;
  bodyFat: number; muscle: number; shoulders: number; chest: number; waist: number; hips: number; arms: number; legs: number;
  eyeTilt: number; chinAngle: number;
  faceWidth: number; jawWidth: number; noseWidth: number; eyeSpacing: number;
  mouthWidth: number; chinHeight: number; noseLength: number; eyeSize: number; cheekFullness: number; browHeight: number;
  hairstyle: 'swept' | 'short' | 'bob' | 'curly' | 'bald';
  outfit: 'reference' | 'casual' | 'work';
  eyeColor: string; skin: string; hair: string; jacket: string; trousers: string; shoes: string;
  skinTint: boolean; hairTint: boolean; clothesTint: boolean;
} & Record<MirrorDetailControl, number>;
export const DEFAULT_MIRROR_LOOK: MirrorLook3D = {
  name: 'Farmer', height: 1, build: 1,
  ...Object.fromEntries(MIRROR_DETAIL_CONTROLS.map(key => [key, 1])) as Record<MirrorDetailControl, number>,
  eyeColor: '#614024',
  bodyFat: 1, muscle: 1, shoulders: 1, chest: 1, waist: 1, hips: 1, arms: 1, legs: 1,
  eyeTilt: 1, chinAngle: 1,
  faceWidth: 1, jawWidth: 1, noseWidth: 1, eyeSpacing: 1,
  mouthWidth: 1, chinHeight: 1, noseLength: 1, eyeSize: 1, cheekFullness: 1, browHeight: 1,
  outfit: 'reference',
  hairstyle: 'swept', skin: '#d9b398', hair: '#704a33',
  jacket: '#475547', trousers: '#52799a', shoes: '#91613e',
  skinTint: false, hairTint: true, clothesTint: false,
};
export function normalizeMirrorLook(value: unknown): MirrorLook3D {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_MIRROR_LOOK };
  if (typeof input.name === 'string' && input.name.trim()) result.name = input.name.trim().slice(0, 32);
  for (const key of [...MIRROR_FACE_CONTROLS, ...MIRROR_ANGLE_CONTROLS, ...MIRROR_DETAIL_CONTROLS, ...MIRROR_PHYSIQUE_CONTROLS, 'height', 'build'] as const) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.max(0.85, Math.min(1.15, value));
  }
  for (const key of ['skin', 'hair', 'jacket', 'trousers', 'shoes', 'eyeColor'] as const) {
    if (typeof input[key] === 'string' && /^#[0-9a-f]{6}$/i.test(input[key])) result[key] = input[key];
  }
  for (const key of ['skinTint', 'hairTint', 'clothesTint'] as const) {
    if (typeof input[key] === 'boolean') result[key] = input[key];
  }
  if (['swept', 'short', 'bob', 'curly', 'bald'].includes(String(input.hairstyle))) result.hairstyle = input.hairstyle as MirrorLook3D['hairstyle'];
  if (input.outfit === 'reference' || input.outfit === 'casual' || input.outfit === 'work') result.outfit = input.outfit;
  return result;
}

// Map each slider to two authored MPFB targets, including matching asset morphs.
export function mirrorMorphWeights(look: MirrorLook3D): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const key of [...MIRROR_FACE_CONTROLS, ...MIRROR_ANGLE_CONTROLS, ...MIRROR_DETAIL_CONTROLS, ...MIRROR_PHYSIQUE_CONTROLS]) {
    const delta = Math.max(-1, Math.min(1, ((look[key] ?? 1) - 1) / 0.15)) * (([...MIRROR_FACE_CONTROLS, ...MIRROR_ANGLE_CONTROLS, ...MIRROR_DETAIL_CONTROLS] as readonly string[]).includes(key) ? 1.4 : 1.8);
    weights[key + 'Minus'] = Math.max(0, -delta);
    weights[key + 'Plus'] = Math.max(0, delta);
  }
  return weights;
}

export const MIRROR_PHYSIQUE_PRESETS: { name: string; values: Partial<MirrorLook3D> }[] = [
  { name: 'Balanced', values: {} },
  { name: 'Lean', values: { bodyFat: 0.88, muscle: 0.96, chest: 0.96, waist: 0.93, arms: 0.96, legs: 0.96 } },
  { name: 'Athletic', values: { bodyFat: 0.93, muscle: 1.12, shoulders: 1.08, chest: 1.06, waist: 0.95, arms: 1.07, legs: 1.05 } },
  { name: 'Broad', values: { shoulders: 1.13, chest: 1.10, waist: 1.06, hips: 1.07, arms: 1.08, legs: 1.08 } },
  { name: 'Soft', values: { bodyFat: 1.13, muscle: 0.95, waist: 1.08, hips: 1.06 } },
];
export const MIRROR_FACE_PRESETS: { name: string; values: Partial<MirrorLook3D> }[] = [
  { name: 'Balanced', values: {} },
  { name: 'Soft', values: { jawWidth: 0.94, cheekFullness: 1.10, chinHeight: 0.96, eyeSize: 1.05 } },
  { name: 'Defined', values: { jawWidth: 1.10, cheekFullness: 0.94, chinHeight: 1.05, noseWidth: 0.96 } },
  { name: 'Wide', values: { faceWidth: 1.09, jawWidth: 1.05, eyeSpacing: 1.06, mouthWidth: 1.05 } },
];
export function applyMirrorPreset(look: MirrorLook3D, category: 'face' | 'physique', name: string): MirrorLook3D {
  const presets = category === 'face' ? MIRROR_FACE_PRESETS : MIRROR_PHYSIQUE_PRESETS;
  const preset = presets.find(preset => preset.name === name);
  if (!preset) return { ...look };
  const controls = category === 'face' ? [...MIRROR_FACE_CONTROLS, ...MIRROR_ANGLE_CONTROLS, ...MIRROR_DETAIL_CONTROLS] : MIRROR_PHYSIQUE_CONTROLS;
  return normalizeMirrorLook({ ...look, ...Object.fromEntries(controls.map(key => [key, 1])), ...preset.values });
}

export type FaceSection3D = { id: string; name: string; controls: { key: MirrorFaceControl; label: string }[]; templates: { name: string; values: Partial<Record<MirrorFaceControl, number>> }[] };
export const FACE_SECTIONS: FaceSection3D[] = [
  {"id": "full", "name": "Full Face", "controls": [{"key": "faceWidth", "label": "Face width"}, {"key": "cheekFullness", "label": "Face gaunt\u2013plump"}, {"key": "cheekSize", "label": "Cheek size"}, {"key": "lowerFaceWidth", "label": "Lower face width"}, {"key": "faceLength", "label": "Face short\u2013long"}, {"key": "underneck", "label": "Underneck up\u2013down"}, {"key": "earSize", "label": "Ear size"}], "templates": [{"name": "Balanced", "values": {}}, {"name": "Soft", "values": {"cheekFullness": 1.09, "cheekSize": 1.07, "lowerFaceWidth": 0.96}}, {"name": "Long", "values": {"faceLength": 1.1, "faceWidth": 0.96, "cheekFullness": 0.96}}, {"name": "Broad", "values": {"faceWidth": 1.08, "lowerFaceWidth": 1.07, "earSize": 0.98}}]},
  {"id": "brow", "name": "Brow", "controls": [{"key": "browThickness", "label": "Brow thickness"}, {"key": "browHeight", "label": "Brow up\u2013down"}, {"key": "browArch", "label": "Brow arch"}, {"key": "browRotate", "label": "Brow rotate"}, {"key": "browOrbit", "label": "Brow orbit shape"}, {"key": "foreheadDepth", "label": "Forehead in\u2013out"}], "templates": [{"name": "Natural", "values": {}}, {"name": "Straight", "values": {"browArch": 0.9, "browThickness": 1.04}}, {"name": "Arched", "values": {"browArch": 1.11, "browHeight": 1.03}}, {"name": "Angled", "values": {"browRotate": 1.09, "browThickness": 1.06, "browOrbit": 1.03}}]},
  {"id": "eyes", "name": "Eyes", "controls": [{"key": "eyeSize", "label": "Eye size"}, {"key": "eyeWidth", "label": "Eye width"}, {"key": "outerEyeHeight", "label": "Outer eye up\u2013down"}, {"key": "eyeTilt", "label": "Eyes rotate"}, {"key": "eyeSpacing", "label": "Eye closeness"}, {"key": "eyeDepth", "label": "Eye deepness"}, {"key": "eyeHeight", "label": "Eyes up\u2013down"}, {"key": "orbitHeight", "label": "Orbit up\u2013down"}], "templates": [{"name": "Natural", "values": {}}, {"name": "Almond", "values": {"eyeWidth": 1.08, "eyeSize": 0.97, "eyeTilt": 1.04}}, {"name": "Round", "values": {"eyeSize": 1.09, "eyeWidth": 0.97}}, {"name": "Lifted", "values": {"outerEyeHeight": 1.09, "eyeTilt": 1.04, "orbitHeight": 1.02}}]},
  {"id": "nose", "name": "Nose", "controls": [{"key": "noseSize", "label": "Nose size"}, {"key": "noseWidth", "label": "Nose width"}, {"key": "nostrilWidth", "label": "Nostril width"}, {"key": "noseLength", "label": "Nose length"}, {"key": "noseHeight", "label": "Nose up\u2013down"}, {"key": "noseTipTurn", "label": "Nose tip turn"}, {"key": "noseTipHeight", "label": "Nose tip up\u2013down"}], "templates": [{"name": "Natural", "values": {}}, {"name": "Button", "values": {"noseSize": 0.94, "noseLength": 0.94, "noseTipTurn": 1.06}}, {"name": "Straight", "values": {"noseLength": 1.05, "noseTipTurn": 0.98, "noseWidth": 0.97}}, {"name": "Broad", "values": {"noseWidth": 1.08, "nostrilWidth": 1.07, "noseSize": 1.02}}]},
  {"id": "mouth", "name": "Mouth", "controls": [{"key": "mouthWidth", "label": "Mouth width"}, {"key": "mouthHeight", "label": "Mouth up\u2013down"}, {"key": "mouthCorner", "label": "Mouth corner down\u2013up"}, {"key": "lipThickness", "label": "Lip thickness"}, {"key": "upperLipPinch", "label": "Upper lip pinch"}, {"key": "lowerLipPinch", "label": "Lower lip pinch"}], "templates": [{"name": "Natural", "values": {}}, {"name": "Full", "values": {"lipThickness": 1.09, "mouthWidth": 1.02}}, {"name": "Delicate", "values": {"lipThickness": 0.94, "mouthWidth": 0.95, "upperLipPinch": 1.04}}, {"name": "Smile", "values": {"mouthCorner": 1.1, "mouthWidth": 1.04}}]},
  {"id": "jaw", "name": "Jaw & Chin", "controls": [{"key": "chinHeight", "label": "Chin up\u2013down"}, {"key": "chinDepth", "label": "Chin in\u2013out"}, {"key": "chinPoint", "label": "Chin point"}, {"key": "chinAngle", "label": "Chin angle"}, {"key": "jawDepth", "label": "Jaw in\u2013out"}, {"key": "jawAngle", "label": "Jaw squared\u2013angled"}, {"key": "jawWidth", "label": "Jaw width"}], "templates": [{"name": "Natural", "values": {}}, {"name": "Soft", "values": {"jawWidth": 0.96, "jawAngle": 0.94, "chinPoint": 0.97}}, {"name": "Square", "values": {"jawWidth": 1.09, "jawAngle": 1.1, "chinPoint": 0.94}}, {"name": "Tapered", "values": {"jawWidth": 0.95, "chinPoint": 1.09, "chinHeight": 1.03}}]},
 ];
export const EYE_COLOURS = [{name:'Brown',value:'#614024'},{name:'Light blue',value:'#70b2d5'},{name:'Dark blue',value:'#244c85'},{name:'Grey',value:'#7f898d'},{name:'Green',value:'#52774a'}] as const;
export function applyFaceSectionTemplate(look: MirrorLook3D, sectionId: string, templateName: string): MirrorLook3D {
  const section=FACE_SECTIONS.find(section=>section.id===sectionId);
  const template=section?.templates.find(template=>template.name===templateName);
  if(!section||!template)return {...look};
  return normalizeMirrorLook({...look,...Object.fromEntries(section.controls.map(control=>[control.key,1])),...template.values});
}
