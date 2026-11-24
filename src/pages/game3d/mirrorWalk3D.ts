import * as THREE from 'three';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const position = (bone: THREE.Object3D) => bone.getWorldPosition(new THREE.Vector3());
const orientation = (bone: THREE.Object3D) => bone.getWorldQuaternion(new THREE.Quaternion());

function setWorldRotation(bone: THREE.Object3D, world: THREE.Quaternion) {
  bone.quaternion.copy(orientation(bone.parent!).invert().multiply(world));
  bone.updateWorldMatrix(false, true);
}

function aim(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
  const origin = position(bone);
  const from = position(child).sub(origin).normalize();
  const to = target.clone().sub(origin).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(from, to);
  setWorldRotation(bone, delta.multiply(orientation(bone)));
}

// Correct the imported bent-elbow A-pose before capturing the animation baseline.
export function prepareMirrorPreviewPose(model: THREE.Object3D, armSpread = .09) {
  model.updateMatrixWorld(true);
  for (const [side, sign] of [['l', 1], ['r', -1]] as const) {
    const upper = model.getObjectByName(`upperarm_${side}`)!;
    const lower = model.getObjectByName(`lowerarm_${side}`)!;
    const hand = model.getObjectByName(`hand_${side}`)!;
    aim(upper, lower, position(upper).add(new THREE.Vector3(sign * armSpread, -1, -.035)));
    aim(lower, hand, position(lower).add(new THREE.Vector3(sign * .025, -1, .12)));
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const hermite = (t: number, a: number, b: number, tangent: number) =>
  (2*t*t*t-3*t*t+1)*a + (t*t*t-2*t*t+t)*tangent + (-2*t*t*t+3*t*t)*b + (t*t*t-t*t)*tangent;

// Stance is 60% of the cycle, followed by a shorter, lifted recovery step.
// Heel/toe markers determine ankle height, keeping the sole above the ground.
function footPath(phase: number, ankleHeight: number) {
  const stance = .60;
  const stride = .46;
  const swing = phase >= stance;
  const t = swing ? (phase-stance)/(1-stance) : phase/stance;
  const forward = swing ? hermite(t, -stride/2, stride/2, -stride*(1-stance)/stance) : stride/2-stride*t;
  const pitch = swing ? THREE.MathUtils.lerp(.32, -.16, smooth(Math.min(1, t*1.6)))
    : t < .16 ? THREE.MathUtils.lerp(-.16, 0, smooth(t/.16))
    : t > .72 ? .32*smooth((t-.72)/.28) : 0;
  const rotation = new THREE.Quaternion().setFromAxisAngle(X, pitch);
  const minSole = Math.min(...[-.04,.16].map(z => new THREE.Vector3(0,-ankleHeight,z).applyQuaternion(rotation).y));
  const lift = swing ? .095*Math.sin(Math.PI*t)**2 : 0;
  return { forward, height: -minSole+lift, rotation };
}

function solveLeg(hip: THREE.Object3D, knee: THREE.Object3D, foot: THREE.Object3D, target: THREE.Vector3) {
  const origin = position(hip);
  const upper = position(knee).distanceTo(origin);
  const lower = position(foot).distanceTo(position(knee));
  const direction = target.clone().sub(origin);
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(upper-lower)+.00001, upper+lower-.00001);
  direction.normalize();
  const along = (upper*upper-lower*lower+distance*distance)/(2*distance);
  const bend = Math.sqrt(Math.max(0,upper*upper-along*along));
  const forward = Z.clone().addScaledVector(direction,-Z.dot(direction)).normalize();
  const kneeTarget = origin.clone().addScaledVector(direction,along).addScaledVector(forward,bend);
  aim(hip,knee,kneeTarget);
  aim(knee,foot,target);
}

// Baked quaternion tracks on the existing skeleton; no game state or world asset writes.
export function createMirrorWalkClip(model: THREE.Object3D): THREE.AnimationClip {
  model.updateMatrixWorld(true);
  const duration = 1.16;
  const frames = 120;
  const names = ['pelvis','spine_01','spine_03','head',
    ...['l','r'].flatMap(side=>['thigh','calf','foot','upperarm','lowerarm'].map(name=>`${name}_${side}`))];
  const bones = names.map(name => {
    const bone = model.getObjectByName(name);
    if (!bone?.parent) throw new Error(`Mirror walk requires ${name}`);
    return { bone, quaternion: bone.quaternion.clone(), position: bone.position.clone(), world: orientation(bone), values: [] as number[] };
  });
  const find = (name: string) => bones.find(entry=>entry.bone.name===name)!;
  const reset = () => {
    for(const entry of bones) { entry.bone.quaternion.copy(entry.quaternion); entry.bone.position.copy(entry.position); }
    model.updateMatrixWorld(true);
  };
  const turn = (name: string, axis: THREE.Vector3, angle: number) => {
    const entry = find(name);
    const local = axis.clone().applyQuaternion(orientation(entry.bone.parent!).invert());
    entry.bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(local,angle));
    entry.bone.updateWorldMatrix(false,true);
  };
  const pelvis = find('pelvis');
  const footRest = ['l','r'].map(side=>{
    const entry=find(`foot_${side}`);
    return { height: position(entry.bone).y, world: entry.world.clone() };
  });
  const times: number[] = [];
  const pelvisPositions: number[] = [];
  for(let i=0;i<=frames;i++) {
    reset();
    const cycle = i===frames?0:i/frames;
    const phase=cycle*Math.PI*2;
    times.push(i*duration/frames);
    const offset = new THREE.Vector3(Math.sin(phase)*.013,-.021*(1+Math.cos(phase*2))/2,0);
    offset.applyQuaternion(orientation(pelvis.bone.parent!).invert());
    pelvis.bone.position.add(offset);
    model.updateMatrixWorld(true);
    turn('pelvis',Z,Math.sin(phase)*.022);
    turn('pelvis',Y,Math.cos(phase)*.035);
    turn('spine_01',Y,-Math.cos(phase)*.065);
    turn('spine_03',Z,-Math.sin(phase)*.018);
    turn('head',Y,Math.cos(phase)*.025);
    for(const [side,index] of [['l',0],['r',1]] as const) {
      const step=(cycle+index*.5)%1;
      const path=footPath(step,footRest[index].height);
      const hip=find(`thigh_${side}`).bone;
      const knee=find(`calf_${side}`).bone;
      const foot=find(`foot_${side}`).bone;
      solveLeg(hip,knee,foot,new THREE.Vector3(index===0?.135:-.135,path.height,path.forward));
      setWorldRotation(foot,path.rotation.multiply(footRest[index].world));
      const armPhase=phase+index*Math.PI;
      turn(`upperarm_${side}`,X,Math.cos(armPhase-.12)*.23);
      turn(`lowerarm_${side}`,X,-.045-.075*(1+Math.cos(armPhase-.4))/2);
    }
    for(const entry of bones) entry.bone.quaternion.toArray(entry.values,i*4);
    pelvis.bone.position.toArray(pelvisPositions,i*3);
  }
  reset();
  const tracks: THREE.KeyframeTrack[]=bones.map(entry=>new THREE.QuaternionKeyframeTrack(`${entry.bone.name}.quaternion`,times,entry.values));
  tracks.push(new THREE.VectorKeyframeTrack('pelvis.position',times,pelvisPositions));
  return new THREE.AnimationClip('Mirror_Walk',duration,tracks);
}

export function createMirrorWalkPlayback(model: THREE.Object3D) {
  const mixer = new THREE.AnimationMixer(model);
  const clip = createMirrorWalkClip(model);
  return {
    setWalking(walking: boolean) {
      // StrictMode can clean up and restart the same effect. Reacquire the action
      // after uncacheRoot rather than retaining an action with discarded bindings.
      const action = mixer.clipAction(clip);
      if (walking) action.reset().fadeIn(.2).play();
      else action.fadeOut(.2);
    },
    update(delta: number) { mixer.update(delta); },
    setSpeed(speed: number) { mixer.timeScale = speed; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}
