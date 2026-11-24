import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const lookSource=await readFile(new URL('../src/pages/game3d/mirrorAppearance3D.ts',import.meta.url),'utf8');
const lookUrl=`data:text/javascript;base64,${Buffer.from(compile(lookSource)).toString('base64')}`;
const source=await readFile(new URL('../src/pages/game3d/blenderReference3D.ts',import.meta.url),'utf8');
const js=compile(source).replaceAll("'./mirrorAppearance3D'",JSON.stringify(lookUrl));
const {canApplyMirrorModel,BLENDER_REFERENCE_LOOK_KEY,DEFAULT_BLENDER_REFERENCE_LOOK,normalizeBlenderReferenceLook}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('Blender study is mirror-only and its draft cannot alter existing character storage',()=>{
  assert.equal(canApplyMirrorModel('reference'),false);
  assert.equal(canApplyMirrorModel('custom'),true);assert.equal(canApplyMirrorModel('farmer'),true);
  for(const key of ['h2h-blender-reference-preview-v1','h2h-character-selection-v1','h2h-mirror-sculpted-v3','h2h-game-3d-save-v1']) assert.notEqual(BLENDER_REFERENCE_LOOK_KEY,key);
  assert.equal(DEFAULT_BLENDER_REFERENCE_LOOK.hairTint,false);
  assert.equal(DEFAULT_BLENDER_REFERENCE_LOOK.skinTint,false);
  assert.deepEqual(normalizeBlenderReferenceLook(null),DEFAULT_BLENDER_REFERENCE_LOOK);
  const edited=normalizeBlenderReferenceLook({...DEFAULT_BLENDER_REFERENCE_LOOK,noseWidth:1.1,shoulders:1.12,eyeColor:'#52774a'});
  assert.deepEqual(normalizeBlenderReferenceLook(JSON.parse(JSON.stringify(edited))),edited);
  assert.equal(DEFAULT_BLENDER_REFERENCE_LOOK.noseWidth,1);
});

test('local likeness is a separate skinned 3D asset with retained facial/physique controls',async()=>{
  const bytes=await readFile(new URL('../public/game3d/blender-reference-v2.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const name of ['Body','Hair_swept','Eyebrows_sculpted','Outfit_reference','Shoes','Eyes_Sculpted_L','Eyes_Iris_1']) {
    const node=gltf.nodes.find(n=>n.name===name);assert.ok(node,name);assert.equal(typeof node.skin,'number');
    const mesh=gltf.meshes[node.mesh];
    for(const target of ['faceWidthPlus','eyeTiltMinus','chinAnglePlus','earSizePlus','noseTipHeightMinus','jawAnglePlus','shouldersMinus','bodyFatPlus']) assert.ok(mesh.extras.targetNames.includes(target),name+' supports '+target);
  }
  const body=gltf.nodes.find(n=>n.name==='Body');
  assert.equal(body.extras.mirrorFaceProfile,'anatomical-portrait-v2');
  assert.equal(body.extras.mirrorPreviewOnly,true);
  assert.equal(body.extras.projectedFaceTexture,false);
  assert.ok(gltf.meshes[body.mesh].primitives.every(p=>p.attributes.COLOR_0!==undefined));
  const hair=gltf.nodes.find(n=>n.name==='Hair_swept');
  assert.equal(hair.extras.continuousHairSculpt,true);
  assert.equal(hair.extras.gameSurfaceReduced,true);
  assert.equal(gltf.nodes.find(n=>n.name==='Hair_swept').extras.mirrorHairProfile,'portrait-layered-curls-v2');
  assert.ok(gltf.skins[0].joints.length>20);
  assert.ok(gltf.materials.some(m=>m.name==='Reference_Mountain_Graphic'));
  assert.ok(gltf.materials.some(m=>m.name==='Portrait_Sneaker_Green'));
  assert.ok(!gltf.nodes.some(n=>n.name.startsWith('Old_')));
});
