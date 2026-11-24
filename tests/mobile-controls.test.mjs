import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/pages/game3d/touchInput3D.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {joystickVector3D,createMobileControls3D}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('joystick dead zone stops drift, up moves forward, and diagonal input stays bounded',()=>{
 assert.equal(joystickVector3D(2,2).forward,0);
 assert.equal(joystickVector3D(0,-40).forward,1);
 assert.equal(joystickVector3D(-40,0).right,-1);
 const diagonal=joystickVector3D(400,-400);assert.ok(Math.abs(Math.hypot(diagonal.right,diagonal.forward)-1)<1e-8);
 assert.ok(Math.abs(Math.hypot(diagonal.knobX,diagonal.knobY)-40)<1e-8);
 const slow=joystickVector3D(20,0);assert.ok(slow.right>0&&slow.right<1);
 assert.equal(joystickVector3D(NaN,Infinity).right,0);
});
test('a second finger can jump while the joystick continues moving',()=>{
 let state;const control=createMobileControls3D(next=>state=next);
 control.startStick(1,0,-40);control.startJump(2);
 assert.equal(state.forward,1);assert.equal(state.jump,true);
 control.moveStick(2,40,0);assert.equal(state.forward,1,'jump finger cannot steer');
 control.end(2);assert.equal(state.jump,false);assert.equal(state.forward,1);
 control.end(1);assert.equal(state.forward,0);assert.equal(state.right,0);
});
test('cancelled fingers and reset stop all input without a stuck jump or walk',()=>{
 let state;const control=createMobileControls3D(next=>state=next);
 control.startStick(10,40,0);control.startStick(11,-40,0);assert.equal(state.right,1,'another finger cannot steal the stick');
 control.startJump(12);control.end(10);assert.equal(state.right,0);assert.equal(state.jump,true);
 control.reset();assert.deepEqual(state,{right:0,forward:0,jump:false,knobX:0,knobY:0});
 control.moveStick(10,40,0);assert.equal(state.right,0,'a cancelled drag cannot resume');
 control.startStick(13,-40,0);assert.equal(state.right,-1,'fresh drag works after reset');
});

test('responsive joystick reaches full movement at its actual visible travel radius',()=>{
 let state;let radius=32;const control=createMobileControls3D(next=>state=next,{radius:()=>radius,deadZone:.08});
 control.startStick(1,0,-radius);assert.equal(state.forward,1);assert.equal(state.knobY,-32);
 control.moveStick(1,0,-4);assert.ok(state.forward>.04,'small intentional drags should respond without a sticky start');
 control.end(1);radius=28;control.startStick(2,radius,0);assert.equal(state.right,1);assert.equal(state.knobX,28);
});
test('unrelated pointer releases do not re-emit or interrupt an active joystick',()=>{
 let events=0;let state;const control=createMobileControls3D(next=>{events++;state=next;});control.startStick(1,20,0);const before=events;control.end(88);assert.equal(events,before);assert.ok(state.right>0);control.end(1);assert.equal(state.right,0);
});
