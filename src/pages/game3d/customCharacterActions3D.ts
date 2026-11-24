import * as THREE from 'three';
import type { FarmerAction3D } from './FarmerModel3D';

export function createCustomCharacterActions(model: THREE.Object3D) {
  const names=['spine_01','spine_03','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r'];
  const bones=names.map(name=>{const bone=model.getObjectByName(name)!;return {bone,rest:bone.quaternion.clone()};});
  let posed=false;
  const restore=()=>{
    if (!posed) return;
    bones.forEach(({bone,rest})=>bone.quaternion.copy(rest));
    model.updateMatrixWorld(true);posed=false;
  };
  const rotate=(name:string,axis:THREE.Vector3,angle:number)=>{
    const bone=model.getObjectByName(name)!;
    const local=axis.clone().applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()))
      .applyQuaternion(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
    bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(local,angle)).normalize();
    bone.updateWorldMatrix(false,true);
  };
  const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
  return {restore,apply(action:FarmerAction3D,progress:number){
    bones.forEach(({bone,rest})=>bone.quaternion.copy(rest));model.updateMatrixWorld(true);
    const p=THREE.MathUtils.clamp(progress,0,1),reach=Math.sin(p*Math.PI);
    if(action==='axe') {
      const wind=THREE.MathUtils.smoothstep(p,0,.3),strike=THREE.MathUtils.smoothstep(p,.3,.56),recover=1-THREE.MathUtils.smoothstep(p,.62,1);
      rotate('spine_01',Y,(.35*wind-.65*strike)*recover);
      rotate('spine_03',X,.12*strike*recover);
      rotate('upperarm_r',X,(-1.1*wind-.35*strike)*recover);
      rotate('upperarm_r',Y,(.6*wind-1.4*strike)*recover);
      rotate('lowerarm_r',X,-.45*wind*recover);
      rotate('upperarm_l',X,-.8*wind*recover);
    } else if(action==='feedPet'||action==='pet') {
      rotate('spine_01',X,.6*reach);rotate('spine_03',X,.15*reach);
      rotate('upperarm_r',X,-.9*reach);rotate('lowerarm_r',X,-.25*reach);
      rotate('lowerarm_r',Z,(action==='feedPet'?-.65:Math.sin(p*Math.PI*4)*.2)*reach);
    } else if(action==='hoe') {
      rotate('spine_01',X,.27*reach);
      rotate('upperarm_r',X,-Math.sin(p*Math.PI*1.5)*1.25);
      rotate('lowerarm_r',X,-.5*reach);
      rotate('upperarm_l',X,-.65*reach);
    } else if(action==='wateringCan') {
      rotate('upperarm_r',X,-.65*reach);rotate('lowerarm_r',X,-.4*reach);
      rotate('lowerarm_r',Z,-.55*reach);
    } else {
      rotate('spine_01',X,.4*reach);rotate('upperarm_r',X,-.8*reach);rotate('upperarm_l',X,-.35*reach);
    }
    posed=true;
  }};
}
