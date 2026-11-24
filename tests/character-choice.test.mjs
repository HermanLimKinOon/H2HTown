import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const lookSource=await readFile(new URL('../src/pages/game3d/mirrorAppearance3D.ts',import.meta.url),'utf8');
const lookUrl=`data:text/javascript;base64,${Buffer.from(compile(lookSource)).toString('base64')}`;
const source=await readFile(new URL('../src/pages/game3d/characterChoice3D.ts',import.meta.url),'utf8');
const js=compile(source).replaceAll("'./mirrorAppearance3D'",JSON.stringify(lookUrl));
const {normalizeCharacterChoice3D,selectCharacter3D,CHARACTER_CHOICE_KEY}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('new character defaults to the saved mirror look without touching the farm save',()=>{
  const choice=normalizeCharacterChoice3D(null,{name:'Alex',outfit:'work',eyeSize:1.1});
  assert.equal(choice.model,'custom');
  assert.equal(choice.customLook.name,'Alex');
  assert.equal(choice.customLook.outfit,'work');
  assert.equal(choice.customLook.eyeSize,1.1);
  assert.notEqual(CHARACTER_CHOICE_KEY,'h2h-game-3d-save-v1');
  assert.notEqual(CHARACTER_CHOICE_KEY,'h2h-mirror-sculpted-v3');
});

test('switching to the original farmer and back preserves the custom character',()=>{
  const custom=normalizeCharacterChoice3D({model:'custom',customLook:{hair:'#345678',outfit:'work',noseWidth:1.1}});
  const old=selectCharacter3D(custom,'farmer');
  assert.equal(old.model,'farmer');
  assert.deepEqual(old.customLook,custom.customLook);
  const restored=selectCharacter3D(normalizeCharacterChoice3D(JSON.parse(JSON.stringify(old))),'custom');
  assert.deepEqual(restored,custom);
  assert.equal(custom.model,'custom','switching does not mutate the previous choice');
});

test('invalid selections are normalized while the original farmer choice survives reload',()=>{
  const old=normalizeCharacterChoice3D({model:'farmer',customLook:{height:900,hair:'bad'}});
  assert.equal(old.model,'farmer');
  assert.equal(old.customLook.height,1.15);
  assert.match(old.customLook.hair,/^#[0-9a-f]{6}$/i);
  assert.equal(normalizeCharacterChoice3D({model:'missing'}).model,'custom');
});
