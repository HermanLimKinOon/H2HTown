import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
// Resolve the two type-free catalogues for the isolated model test.
let src=await readFile(new URL('../src/pages/game3d/townCustomization3D.ts',import.meta.url),'utf8');
const catalog=await readFile(new URL('../src/pages/game3d/townLayout3D.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(catalog,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
src=src.replace("'./townLayout3D'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64')));
const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('player editing is limited to their own farm and house; unknown roles fail closed',()=>{
 for(const world of ['farm','house']){assert.equal(m.canEditWorld3D('player','me','me',world),true);assert.equal(m.canEditWorld3D('player','me','other',world),false);}
 assert.equal(m.canEditWorld3D('player','me','me','town'),false);
 assert.equal(m.canEditWorld3D(null,'me','me','farm'),false);
 for(const world of ['farm','house','town'])assert.equal(m.canEditWorld3D('admin','me','other',world),true);
});
test('town transforms change collision bounds and reject invalid or unknown objects',()=>{
 const layout=m.normalizeTownLayout3D({objects:{h2h:{x:10,z:7,rotation:1},fountain:null,portal:null,unknown:{x:0,z:0,rotation:0}}});
 assert.deepEqual(m.townObstacles3D(layout).find(x=>x.x===10),{kind:'box',x:10,z:7,width:4,depth:5});
 assert.equal(layout.objects.fountain,null);assert.ok(layout.objects.portal);assert.equal(layout.objects.unknown,undefined);
 assert.equal(m.normalizeTownLayout3D({objects:{h2h:{x:Infinity,z:0,rotation:0}}}).objects.h2h.x,7);
});
test('Town building creation, rotation and deletion preserve the global catalogue',()=>{
 const initial=m.freshTownLayout3D();
 const built=m.placeTownBuilding3D(initial,'cottage',{x:17,z:-5},0);
 assert.equal(built.changed,true);assert.equal(Object.keys(built.layout.buildings).length,1);
 const id=Object.keys(built.layout.buildings)[0];
 assert.equal(m.townObstacles3D(built.layout).some(o=>o.x===17&&o.z===-5),true);
 const rotated=m.moveTownObject3D(built.layout,id,{x:17,z:-5},1);assert.equal(rotated.changed,true);assert.equal(rotated.layout.buildings[id].rotation,1);
 const removed=m.deleteTownObject3D(rotated.layout,id);assert.equal(removed.changed,true);assert.equal(removed.layout.buildings[id],undefined);
 assert.deepEqual(Object.keys(removed.layout.objects),Object.keys(initial.objects));
});
test('Town editor rejects overlap, out of bounds and unknown styles, but allows deleting a shop',()=>{
 const initial=m.freshTownLayout3D();
 assert.equal(m.placeTownBuilding3D(initial,'cottage',{x:7,z:-4},0).changed,false);
 assert.equal(m.placeTownBuilding3D(initial,'cottage',{x:0,z:8},0).changed,false);
 assert.equal(m.placeTownBuilding3D(initial,'unknown',{x:17,z:-5},0).changed,false);
 assert.equal(m.moveTownObject3D(initial,'h2h',{x:24,z:0},0).changed,false);
 assert.equal(m.deleteTownObject3D(initial,'portal').changed,false);
 const deleted=m.deleteTownObject3D(initial,'h2h');assert.equal(deleted.changed,true);assert.equal(deleted.layout.objects.h2h,null);
 assert.equal(m.normalizeTownLayout3D(deleted.layout).objects.h2h,null);
});
