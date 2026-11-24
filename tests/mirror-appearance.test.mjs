import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/pages/game3d/mirrorAppearance3D.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { DEFAULT_MIRROR_LOOK: defaults, normalizeMirrorLook, mirrorMorphWeights, MIRROR_FACE_CONTROLS, MIRROR_LOOK_KEY } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('mirror settings survive serialization without using the world appearance key', () => {
  const look = { ...defaults, noseWidth: 1.1, hairstyle: 'bald', jacket: '#aabbcc', clothesTint: true };
  assert.deepEqual(normalizeMirrorLook(JSON.parse(JSON.stringify(look))), look);
  assert.notEqual(MIRROR_LOOK_KEY, 'h2h-game-3d-save-v1');
  assert.deepEqual(normalizeMirrorLook(null), defaults);
});

test('invalid mirror settings are bounded and do not accept unknown assets or colours', () => {
  const look = normalizeMirrorLook({ faceWidth: 999, jawWidth: -1, height: NaN, hairstyle: 'unknown', skin: 'red', clothesTint: 'true' });
  assert.equal(look.faceWidth, 1.15);
  assert.equal(look.jawWidth, 0.85);
  assert.equal(look.height, 1);
  assert.equal(look.hairstyle, defaults.hairstyle);
  assert.equal(look.skin, defaults.skin);
  assert.equal(look.clothesTint, false);
});

test('reference model retains customisation and includes the swept hair, graphic tee and sneakers', async () => {
  const bytes = await readFile(new URL('../public/game3d/mirror-reference.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const name of ['Hair_swept', 'Hair_swept_Locks', 'Outfit_reference', 'Shoes']) {
    const node = gltf.nodes.find(node => node.name === name);
    assert.ok(node, `${name} exists`);
    assert.equal(typeof node.skin, 'number');
    assert.ok(gltf.meshes[node.mesh].extras.targetNames.includes('faceWidthPlus'));
  }
  assert.ok(gltf.materials.some(material => material.name === 'Reference_Mountain_Graphic'));
  assert.equal(gltf.nodes.find(node => node.name === 'Body').extras.mirrorFaceProfile, 'reference-face-v2');
  assert.equal(gltf.nodes.find(node => node.name === 'Hair_swept_Locks').extras.mirrorHairProfile, 'swept-waves-v2');
  const crown = gltf.nodes.find(node => node.name === 'Hair_swept_Volume');
  assert.ok(crown, 'the swept waves have a fitted crown underneath');
  assert.ok(gltf.meshes[crown.mesh].extras.targetNames.includes('faceWidthPlus'));
  const brows = gltf.nodes.find(node => node.name === 'Eyebrows_sculpted');
  assert.ok(brows, 'solid sculpted brows are exported');
  assert.ok(gltf.meshes[brows.mesh].extras.targetNames.includes('browHeightPlus'), 'brows follow the facial controls');
  assert.equal(normalizeMirrorLook({ hairstyle: 'swept', outfit: 'reference' }).outfit, 'reference');
  assert.notEqual(MIRROR_LOOK_KEY, 'h2h-mirror-mpfb-v1');
  assert.notEqual(MIRROR_LOOK_KEY, 'h2h-mirror-reference-v1');
});

test('face sliders activate one authored morph direction and reset the opposing target', () => {
  const weights = mirrorMorphWeights({ ...defaults, faceWidth: 1.15, jawWidth: 0.85 });
  assert.ok(Math.abs(weights.faceWidthPlus - 1.4) < 1e-9);
  assert.equal(weights.faceWidthMinus, 0);
  assert.equal(weights.jawWidthPlus, 0);
  assert.ok(Math.abs(weights.jawWidthMinus - 1.4) < 1e-9);
  assert.ok(Object.values(mirrorMorphWeights(defaults)).every(value => value === 0));
});

test('custom mirror sculpt has rigged head, layered hair and brown eyes with all facial morphs', async () => {
  const bytes = await readFile(new URL('../public/game3d/mirror-sculpted.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(gltf.nodes.find(node => node.name === 'Body').extras.mirrorFaceProfile, 'custom-sculpt-v3');
  assert.equal(gltf.nodes.find(node => node.name === 'Hair_swept_Locks').extras.mirrorHairProfile, 'custom-layered-waves-v3');
  for (const name of ['Body', 'Hair_swept', 'Hair_swept_Locks', 'Eyebrows_sculpted', 'Eyes_Sculpted_L', 'Eyes_Sculpted_R', 'Eyes_Iris_-1', 'Eyes_Iris_1']) {
    const node = gltf.nodes.find(node => node.name === name);
    assert.ok(node, `${name} is exported`);
    assert.equal(typeof node.skin, 'number', `${name} follows the skeleton`);
    const mesh = gltf.meshes[node.mesh];
    for (const control of MIRROR_FACE_CONTROLS) {
      for (const direction of ['Minus', 'Plus']) {
        const target = mesh.extras.targetNames.indexOf(control + direction);
        assert.ok(target >= 0, `${name} supports ${control + direction}`);
        for (const primitive of mesh.primitives) {
          assert.equal(gltf.accessors[primitive.targets[target].POSITION].count, gltf.accessors[primitive.attributes.POSITION].count);
        }
      }
    }
  }
  const body = gltf.meshes[gltf.nodes.find(node => node.name === 'Body').mesh];
  assert.equal(typeof body.primitives[0].attributes.COLOR_0, 'number', 'painted skin is exported');
  assert.ok(gltf.materials.some(material => material.name === 'Sculpted_Brown_Iris'));
  assert.ok(!gltf.nodes.some(node => node.name.startsWith('Previous_')), 'retired meshes stay out of the game asset');
  assert.notEqual(MIRROR_LOOK_KEY, 'h2h-mirror-reference-v2');
});

test('MPFB export contains fitted assets, a skeleton and every facial morph used by the mirror', async () => {
  const bytes = await readFile(new URL('../public/game3d/mirror-mpfb.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.ok(gltf.asset.copyright.includes('CC0'));
  assert.ok(gltf.skins[0].joints.length > 20);
  for (const name of ['Body', 'Eyes', 'Hair_short', 'Hair_bob', 'Hair_curly', 'Outfit_casual', 'Outfit_work']) {
    const node = gltf.nodes.find(node => node.name === name);
    assert.ok(node, `${name} exists`);
    assert.equal(typeof node.skin, 'number', `${name} is rigged`);
    const mesh = gltf.meshes[node.mesh];
    for (const control of MIRROR_FACE_CONTROLS) {
      assert.ok(mesh.extras.targetNames.includes(control + 'Minus'));
      assert.ok(mesh.extras.targetNames.includes(control + 'Plus'));
      if (name === 'Body') {
        const i = mesh.extras.targetNames.indexOf(control + 'Plus');
        const delta = gltf.accessors[mesh.primitives[0].targets[i].POSITION];
        assert.ok([...delta.min, ...delta.max].some(value => Math.abs(value) > 1e-5), `${control} changes the body mesh`);
      }
    }
  }
  for (const material of gltf.materials.filter(material => /Mirror_(skin|outfit|eyes|shoes|teeth)_/.test(material.name))) {
    assert.notEqual(material.alphaMode, 'BLEND', `${material.name} must render as an opaque surface`);
  }
});

test('physique saves are bounded and old appearances retain their original proportions', () => {
  const old = normalizeMirrorLook({ name: 'Saved character', height: 1.08 });
  for (const key of ['bodyFat','muscle','shoulders','chest','waist','hips','arms','legs']) assert.equal(old[key],1);
  const edited=normalizeMirrorLook({...old,shoulders:1.12,waist:0.9,muscle:1.1});
  assert.deepEqual(normalizeMirrorLook(JSON.parse(JSON.stringify(edited))),edited);
  assert.equal(normalizeMirrorLook({shoulders:900,waist:-5,muscle:NaN}).shoulders,1.15);
  assert.equal(normalizeMirrorLook({waist:-5}).waist,.85);
  const weights=mirrorMorphWeights(edited);
  assert.ok(weights.shouldersPlus>.79);assert.equal(weights.shouldersMinus,0);
  assert.ok(weights.waistMinus>.66);assert.equal(weights.waistPlus,0);
});

test('physique shapes visibly deform the body and all fitted outfits',async()=>{
  const bytes=await readFile(new URL('../public/game3d/mirror-sculpted.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const name of ['Body','Outfit_reference','Outfit_casual','Outfit_work']) {
    const node=gltf.nodes.find(n=>n.name===name);const mesh=gltf.meshes[node.mesh];
    for(const key of ['bodyFat','muscle','shoulders','chest','waist','hips','arms','legs']) {
      for(const suffix of ['Minus','Plus']) {
        const index=mesh.extras.targetNames.indexOf(key+suffix);assert.ok(index>=0,name+' '+key+suffix);
        let changed=false;
        for(const primitive of mesh.primitives) {
          const delta=gltf.accessors[primitive.targets[index].POSITION];
          assert.equal(delta.count,gltf.accessors[primitive.attributes.POSITION].count);
          changed ||= [...delta.min,...delta.max].some(n=>Math.abs(n)>1e-5);
        }
        assert.ok(changed,name+' '+key+suffix+' changes the mesh');
      }
    }
  }
});

test('face and physique presets only change their respective shape controls',async()=>{
  const {applyMirrorPreset}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const initial={...defaults,hairstyle:'bob',outfit:'work',jawWidth:1.1,shoulders:1.12};
  const athletic=applyMirrorPreset(initial,'physique','Athletic');
  assert.equal(athletic.muscle,1.12);assert.equal(athletic.waist,.95);assert.equal(athletic.jawWidth,1.1);
  assert.equal(athletic.hairstyle,'bob');assert.equal(athletic.outfit,'work');
  const soft=applyMirrorPreset(athletic,'face','Soft');
  assert.equal(soft.jawWidth,.94);assert.equal(soft.muscle,1.12);
  const reset=applyMirrorPreset(soft,'physique','Balanced');
  assert.equal(reset.shoulders,1);assert.equal(reset.muscle,1);assert.equal(reset.jawWidth,.94);
  assert.equal(initial.shoulders,1.12);
});

test('physique controls leave the head independent from facial controls',async()=>{
  const bytes=await readFile(new URL('../public/game3d/mirror-sculpted.glb',import.meta.url));
  const jsonLength=bytes.readUInt32LE(12);
  const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  const binStart=28+jsonLength;
  function vectors(index) {
    const accessor=gltf.accessors[index];const result=new Float32Array(accessor.count*3);
    if(accessor.bufferView!==undefined) {
      const view=gltf.bufferViews[accessor.bufferView];const start=binStart+(view.byteOffset||0)+(accessor.byteOffset||0);
      for(let i=0;i<accessor.count;i++) for(let axis=0;axis<3;axis++) result[i*3+axis]=bytes.readFloatLE(start+i*(view.byteStride||12)+axis*4);
    }
    if(accessor.sparse) {
      const sparse=accessor.sparse;
      const indices=binStart+(gltf.bufferViews[sparse.indices.bufferView].byteOffset||0)+(sparse.indices.byteOffset||0);
      const values=binStart+(gltf.bufferViews[sparse.values.bufferView].byteOffset||0)+(sparse.values.byteOffset||0);
      const size={5121:1,5123:2,5125:4}[sparse.indices.componentType];
      for(let i=0;i<sparse.count;i++) {
        const n=bytes.readUIntLE(indices+i*size,size);
        for(let axis=0;axis<3;axis++) result[n*3+axis]=bytes.readFloatLE(values+i*12+axis*4);
      }
    }
    return result;
  }
  const mesh=gltf.meshes[gltf.nodes.find(n=>n.name==='Body').mesh];
  const primitive=mesh.primitives[0];const base=vectors(primitive.attributes.POSITION);
  let checked=0;
  for(const key of ['bodyFat','muscle','shoulders','chest','waist','hips','arms','legs']) for(const suffix of ['Minus','Plus']) {
    const index=mesh.extras.targetNames.indexOf(key+suffix);const delta=vectors(primitive.targets[index].POSITION);
    for(let i=0;i<base.length;i+=3) if(base[i+1]>=1.54) {
      for(let axis=0;axis<3;axis++) assert.ok(Math.abs(delta[i+axis])<1e-7,key+' must not reshape the head');
      checked++;
    }
  }
  assert.ok(checked>1000,'checked the actual head vertices');
});

test('shape sliders have stronger continuous response around the neutral point',()=>{
  const subtle=mirrorMorphWeights({...defaults,faceWidth:1.03,shoulders:1.03});
  const strong=mirrorMorphWeights({...defaults,faceWidth:1.15,shoulders:1.15});
  assert.ok(Math.abs(subtle.faceWidthPlus-.28)<1e-9);
  assert.ok(Math.abs(subtle.shouldersPlus-.36)<1e-9);
  assert.ok(Math.abs(strong.faceWidthPlus-1.4)<1e-9);
  assert.ok(Math.abs(strong.shouldersPlus-1.8)<1e-9);
  assert.equal(strong.shouldersMinus,0);
  assert.ok(Object.values(mirrorMorphWeights(defaults)).every(n=>n===0));
});

test('eye and chin angles save independently and drive opposing facial morphs',()=>{
  const look=normalizeMirrorLook({...defaults,eyeTilt:1.15,chinAngle:.85});
  assert.equal(normalizeMirrorLook({}).eyeTilt,1);
  assert.equal(normalizeMirrorLook({}).chinAngle,1);
  assert.deepEqual(normalizeMirrorLook(JSON.parse(JSON.stringify(look))),look);
  const weights=mirrorMorphWeights(look);
  assert.ok(Math.abs(weights.eyeTiltPlus-1.4)<1e-9);assert.equal(weights.eyeTiltMinus,0);
  assert.ok(Math.abs(weights.chinAngleMinus-1.4)<1e-9);assert.equal(weights.chinAnglePlus,0);
  assert.equal(mirrorMorphWeights(defaults).eyeTiltPlus,0);
});

test('angle controls are fitted facial geometry rather than camera rotations',async()=>{
  const bytes=await readFile(new URL('../public/game3d/mirror-sculpted.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const name of ['Body','Eyes_Sculpted_L','Eyes_Sculpted_R','Eyes_Iris_-1','Eyes_Iris_1','Eyebrows_sculpted','Teeth']) {
    const mesh=gltf.meshes[gltf.nodes.find(n=>n.name===name).mesh];
    for(const control of ['eyeTilt','chinAngle']) for(const suffix of ['Minus','Plus']) {
      const index=mesh.extras.targetNames.indexOf(control+suffix);assert.ok(index>=0,name+' '+control+suffix);
      if(name==='Body'||(name.startsWith('Eyes_')&&control==='eyeTilt')) {
        assert.ok(mesh.primitives.some(p=>{
          const a=gltf.accessors[p.targets[index].POSITION];
          return [...a.min,...a.max].some(n=>Math.abs(n)>1e-4);
        }),name+' visibly deforms for '+control);
      }
    }
  }
});

test('six face sections expose isolated selectable templates and all requested details',async()=>{
  const {FACE_SECTIONS,applyFaceSectionTemplate,EYE_COLOURS,MIRROR_DETAIL_CONTROLS}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.deepEqual(FACE_SECTIONS.map(s=>s.name),['Full Face','Brow','Eyes','Nose','Mouth','Jaw & Chin']);
  assert.equal(EYE_COLOURS.length,5);
  for(const section of FACE_SECTIONS) {
    assert.ok(section.templates.length>=4);
    const initial=normalizeMirrorLook({...defaults,bodyFat:1.1,eyeColor:'#52774a',hairstyle:'bob',jawWidth:1.12,noseWidth:1.1});
    const edited=applyFaceSectionTemplate(initial,section.id,section.templates[1].name);
    const keys=new Set(section.controls.map(c=>c.key));
    for(const key of Object.keys(initial)) if(!keys.has(key)) assert.equal(edited[key],initial[key],section.name+' preserves '+key);
    for(const control of section.controls) assert.equal(typeof edited[control.key],'number');
    assert.deepEqual(normalizeMirrorLook(JSON.parse(JSON.stringify(edited))),edited);
  }
  for(const key of MIRROR_DETAIL_CONTROLS) {
    assert.equal(normalizeMirrorLook({})[key],1);
    assert.ok(FACE_SECTIONS.some(s=>s.controls.some(c=>c.key===key)),key+' is available in the UI');
  }
  assert.equal(normalizeMirrorLook({eyeColor:'bad'}).eyeColor,defaults.eyeColor);
});

test('every facial detail has fitted targets and a visible deformation in its intended mesh',async()=>{
  const {MIRROR_DETAIL_CONTROLS}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const bytes=await readFile(new URL('../public/game3d/mirror-sculpted.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const key of MIRROR_DETAIL_CONTROLS) {
    const name=key==='browThickness'?'Eyebrows_sculpted':'Body';
    const mesh=gltf.meshes[gltf.nodes.find(n=>n.name===name).mesh];
    for(const suffix of ['Minus','Plus']) {
      const index=mesh.extras.targetNames.indexOf(key+suffix);assert.ok(index>=0,key+suffix);
      assert.ok(mesh.primitives.some(p=>{
        const a=gltf.accessors[p.targets[index].POSITION];
        return [...a.min,...a.max].some(n=>Math.abs(n)>1e-5);
      }),key+suffix+' visibly changes '+name);
    }
  }
});
