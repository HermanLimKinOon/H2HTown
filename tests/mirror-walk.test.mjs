import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';

const source = await readFile(new URL('../src/pages/game3d/mirrorWalk3D.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`);
const { createMirrorWalkClip, prepareMirrorPreviewPose, createMirrorWalkPlayback } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const actionSource=await readFile(new URL('../src/pages/game3d/customCharacterActions3D.ts',import.meta.url),'utf8');
const actionJs=ts.transpileModule(actionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("from 'three'",`from '${import.meta.resolve('three')}'`);
const {createCustomCharacterActions}=await import(`data:text/javascript;base64,${Buffer.from(actionJs).toString('base64')}`);
const bytes = await readFile(new URL('../public/game3d/mirror-sculpted.glb', import.meta.url));
const gltf = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
function skeleton() {
  const objects=gltf.nodes.map(node => {
    const obj=new THREE.Object3D(); obj.name=node.name;
    if(node.translation) obj.position.fromArray(node.translation);
    if(node.rotation) obj.quaternion.fromArray(node.rotation);
    if(node.scale) obj.scale.fromArray(node.scale);
    return obj;
  });
  gltf.nodes.forEach((node,i)=>node.children?.forEach(child=>objects[i].add(objects[child])));
  const model=new THREE.Group();
  gltf.scenes[gltf.scene].nodes.forEach(i=>model.add(objects[i]));
  model.updateMatrixWorld(true);
  return model;
}

test('walk binds to the actual mirror skeleton and loops without a pose jump',()=>{
  const model=skeleton(); const clip=createMirrorWalkClip(model);
  assert.ok(clip.duration>0.8&&clip.duration<1.5);
  const mixer=new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play(); mixer.setTime(0);
  const start=model.getObjectByName('thigh_l').quaternion.clone();
  model.updateMatrixWorld(true);
  const front=model.getObjectByName('foot_l').getWorldPosition(new THREE.Vector3()).z;
  mixer.setTime(clip.duration);
  assert.ok(start.angleTo(model.getObjectByName('thigh_l').quaternion)<1e-5);
  mixer.setTime(clip.duration*.5);
  model.updateMatrixWorld(true);
  assert.ok(front-model.getObjectByName('foot_l').getWorldPosition(new THREE.Vector3()).z>.3,'feet take distinct forward and backward steps');
  for(const track of clip.tracks) assert.ok(Array.from(track.values).every(Number.isFinite));
});

test('walk bends the knees, stays in place and restores the fitting pose on stop',()=>{
  const model=skeleton(); const pelvis=model.getObjectByName('pelvis');
  const position=pelvis.position.clone(); const thigh=model.getObjectByName('thigh_l');
  const rest=thigh.quaternion.clone(); const knee=model.getObjectByName('calf_l');
  const kneeRest=knee.quaternion.clone();
  const mixer=new THREE.AnimationMixer(model); const clip=createMirrorWalkClip(model);
  const action=mixer.clipAction(clip).play();mixer.setTime(clip.duration*.75);
  assert.ok(kneeRest.angleTo(knee.quaternion)>.3,'swing leg bends at the knee');
  assert.ok(Math.abs(pelvis.position.x-position.x)<.02,'weight shift remains subtle');
  assert.ok(Math.abs(pelvis.position.y-position.y)<1e-6);
  assert.ok(Math.abs(pelvis.position.z-position.z)<.04,'body bob is small');
  action.stop(); mixer.update(0);
  assert.ok(rest.angleTo(thigh.quaternion)<1e-5);
  assert.ok(position.distanceTo(pelvis.position)<1e-6);
});

test('relaxed arms hang beside the body instead of holding the hands forward',()=>{
  const model=skeleton();prepareMirrorPreviewPose(model);
  for(const side of ['l','r']) {
    const shoulder=model.getObjectByName(`upperarm_${side}`).getWorldPosition(new THREE.Vector3());
    const hand=model.getObjectByName(`hand_${side}`).getWorldPosition(new THREE.Vector3());
    assert.ok(shoulder.y-hand.y>.48);
    assert.ok(Math.abs(hand.z-shoulder.z)<.07);
  }
});

test('support foot rolls on the floor and the returning foot clears it',()=>{
  const model=skeleton(); const foot=model.getObjectByName('foot_l');
  const restQ=foot.getWorldQuaternion(new THREE.Quaternion());
  const height=foot.getWorldPosition(new THREE.Vector3()).y;
  const mixer=new THREE.AnimationMixer(model); const clip=createMirrorWalkClip(model);
  mixer.clipAction(clip).play();
  function soleAt(phase) {
    mixer.setTime(phase*clip.duration);model.updateMatrixWorld(true);
    const ankle=foot.getWorldPosition(new THREE.Vector3());
    const delta=foot.getWorldQuaternion(new THREE.Quaternion()).multiply(restQ.clone().invert());
    return Math.min(...[-.04,.16].map(z=>new THREE.Vector3(0,-height,z).applyQuaternion(delta).add(ankle).y));
  }
  for(const phase of [0,.10,.25,.40,.55]) {
    assert.ok(Math.abs(soleAt(phase))<.004,`support sole contacts the floor at ${phase}`);
  }
  assert.ok(soleAt(.8)>.04,'swing foot lifts rather than scraping the floor');
});

test('preview playback survives React cleanup and setup without stale mixer bindings',()=>{
  const model=skeleton(); const playback=createMirrorWalkPlayback(model);
  playback.setWalking(false);playback.dispose();
  assert.doesNotThrow(()=>{playback.setWalking(true);playback.update(.3);});
  playback.setWalking(false);playback.update(.3);
  playback.dispose();
});

test('custom character farming actions move the rig and restore it without moving the player root',()=>{
  const model=skeleton();prepareMirrorPreviewPose(model);
  const shoulder=model.getObjectByName('upperarm_r');const baseline=shoulder.quaternion.clone();
  const rootPosition=model.position.clone(),rootRotation=model.quaternion.clone();
  const actions=createCustomCharacterActions(model);
  for(const action of ['hoe','axe','wateringCan','seeds','harvest']) {
    actions.apply(action,.45);
    assert.ok(shoulder.quaternion.angleTo(baseline)>.1,`${action} moves the arm`);
    assert.ok(model.position.distanceTo(rootPosition)<1e-8);
    assert.ok(model.quaternion.angleTo(rootRotation)<1e-8);
    actions.restore();
    assert.ok(shoulder.quaternion.angleTo(baseline)<1e-6,`${action} returns to idle`);
  }
});

test('farming poses follow the character facing direction',()=>{
  const front=skeleton(),east=skeleton();prepareMirrorPreviewPose(front);prepareMirrorPreviewPose(east);
  east.rotation.y=Math.PI/2;east.updateMatrixWorld(true);
  const frontAction=createCustomCharacterActions(front),eastAction=createCustomCharacterActions(east);
  for(const action of ['hoe','axe','wateringCan','seeds','harvest']) {
    frontAction.apply(action,.45);eastAction.apply(action,.45);
    const a=front.getObjectByName('upperarm_r').quaternion,b=east.getObjectByName('upperarm_r').quaternion;
    assert.ok(a.clone().normalize().angleTo(b.clone().normalize())<1e-5,`${action} remains character-relative`);
    frontAction.restore();eastAction.restore();
  }
});
