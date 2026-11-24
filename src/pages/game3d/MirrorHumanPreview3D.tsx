import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { mirrorMorphWeights, type MirrorLook3D } from './mirrorAppearance3D';
import { createMirrorWalkPlayback, prepareMirrorPreviewPose } from './mirrorWalk3D';
import { createCustomCharacterActions } from './customCharacterActions3D';
import CustomCharacterItem3D from './CustomCharacterItem3D';
import type { ToolId3D } from './game3d';
import type { FarmerAction3D } from './FarmerModel3D';

// Shared custom model for the mirror and the selectable world character.
// Source and licenses: public/game3d/mirror-sculpted.LICENSE.md.
export default function MirrorHumanPreview3D({ appearance, walking = false, movement, selectedTool=null, action='hoe', actionUntil=0, assetPath='/game3d/mirror-sculpted.glb' }: { appearance: MirrorLook3D; walking?: boolean; movement?: React.MutableRefObject<{moving:boolean;running:boolean}>; selectedTool?:ToolId3D|null;action?:FarmerAction3D;actionUntil?:number;assetPath?:string }) {
  const { scene } = useGLTF(assetPath);
  const reference = assetPath.startsWith('/game3d/blender-reference');
  const { model, scale, offset, parts } = useMemo(() => {
    const model = cloneSkeleton(scene);
    const parts: { mesh: THREE.Mesh; role: string; materials: THREE.MeshStandardMaterial[] }[] = [];
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      let owner: THREE.Object3D | null = object;
      while (owner && !owner.userData.mirrorRole) owner = owner.parent;
      const role = String(owner?.userData.mirrorRole || 'other');
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(source => {
        const material = source.clone() as THREE.MeshStandardMaterial;
        // MPFB's GameEngine materials export BLEND even for opaque skin/clothes.
        // Use depth-writing surfaces and cutout hair to prevent sorting through the face.
        material.transparent = false;
        material.depthWrite = true;
        material.alphaTest = role === 'hair' || role === 'lashes' ? 0.35 : 0;
        if (role === 'eyes' && !reference) material.roughness = 0.4;
        if (role === 'skin') { material.color.setRGB(1, 1, 1); material.roughness = reference ? 0.58 : 0.72; }
        const uniforms = {
          mirrorTop: { value: new THREE.Color() }, mirrorBottom: { value: new THREE.Color() },
          mirrorStrength: { value: 0 }, mirrorSplit: { value: 0 }, mirrorReference: { value: 0.4 },
          mirrorPreservePrint: { value: material.name.includes('Mountain_Graphic') ? 1 : 0 },
        };
        material.userData.mirrorUniforms = uniforms;
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = 'varying float vMirrorY;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMirrorY = position.y;');
          shader.fragmentShader = 'varying float vMirrorY;\nuniform vec3 mirrorTop;\nuniform vec3 mirrorBottom;\nuniform float mirrorStrength;\nuniform float mirrorSplit;\nuniform float mirrorReference;\nuniform float mirrorPreservePrint;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
            float brightness = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 tint = mix(mirrorBottom, mirrorTop, smoothstep(mirrorSplit - 0.015, mirrorSplit + 0.015, vMirrorY));
            float chroma = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) - min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
            float cotton = 1.0 - mirrorPreservePrint * smoothstep(0.08, 0.22, chroma);
            diffuseColor.rgb = mix(diffuseColor.rgb, tint * clamp(brightness / mirrorReference, 0.15, 1.5), mirrorStrength * cotton);`);
        };
        material.customProgramCacheKey = () => 'mirror-reference-tint-v1';
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      object.castShadow = true;
      parts.push({ mesh: object, role, materials });
    });
    model.updateMatrixWorld(true);
    // The shared skeleton moves the body and every fitted outfit together.
    prepareMirrorPreviewPose(model, reference ? .28 : .09);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.85 / Math.max(size.y, 0.001);
    return { model, scale, offset: new THREE.Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale), parts };
  }, [scene, reference]);

  const animation = useMemo(() => createMirrorWalkPlayback(model), [model]);
  const actions = useMemo(() => createCustomCharacterActions(model), [model]);
  const movingBefore = useRef(false);
  const hand = useMemo(() => {
    const bone=model.getObjectByName('hand_r')!;
    model.updateMatrixWorld(true);
    return { bone, rotation:bone.getWorldQuaternion(new THREE.Quaternion()).invert() };
  },[model]);
  useEffect(() => {
    if (!movement) animation.setWalking(walking);
  }, [walking, animation, movement]);
  useFrame((_, delta) => {
    actions.restore();
    const active=Boolean(movement)&&Date.now()<actionUntil;
    if(movement) {
      const moving=movement.current.moving&&!active;
      if(moving!==movingBefore.current) { animation.setWalking(moving);movingBefore.current=moving; }
      animation.setSpeed(movement.current.running?1.6:1);
    }
    animation.update(Math.min(delta,.1));
    if(active) actions.apply(action,1-(actionUntil-Date.now())/900);
  });
  useEffect(() => () => {
    animation.dispose();
  }, [animation]);

  useLayoutEffect(() => {
    const weights = mirrorMorphWeights(appearance);
    model.traverse(object => {
      if (object.name.startsWith('Hair_')) object.visible = object.name === `Hair_${appearance.hairstyle}` || object.name.startsWith(`Hair_${appearance.hairstyle}_`);
      if (object.name.startsWith('Outfit_')) object.visible = object.name === `Outfit_${appearance.outfit}`;
    });
    for (const { mesh, role, materials } of parts) {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
          mesh.morphTargetInfluences[index] = weights[name] ?? 0;
        }
      }
      for (const material of materials) {
        const uniforms = material.userData.mirrorUniforms;
        if (material.name === 'Sculpted_Brown_Iris' || material.name === 'Sculpted_Iris_Gold') {
          material.color.set(appearance.eyeColor || '#614024');
          if (material.name === 'Sculpted_Iris_Gold') material.color.lerp(new THREE.Color('#c39650'), 0.18);
        }
        const skin = role === 'skin';
        const hair = role === 'hair';
        const outfit = role === 'outfit';
        const shoes = role === 'shoes';
        const referenceDenim = material.name.startsWith('Mirror_outfit_Outfit_reference');
        const referenceShirt = material.name.startsWith('Reference_') && outfit;
        const top = skin ? appearance.skin : hair ? appearance.hair : shoes ? appearance.shoes : referenceDenim ? appearance.trousers : appearance.jacket;
        uniforms.mirrorTop.value.set(top);
        uniforms.mirrorBottom.value.set(outfit && !referenceShirt ? appearance.trousers : top);
        uniforms.mirrorSplit.value = outfit ? 0.85 : 0;
        uniforms.mirrorReference.value = skin ? 0.55 : hair ? (material.map ? 0.006 : 0.12) : 0.2;
        uniforms.mirrorStrength.value = skin ? Number(appearance.skinTint) * 0.85 : hair ? Number(appearance.hairTint) * 0.95 : outfit || shoes ? Number(appearance.clothesTint) * 0.9 : 0;
      }
    }
  }, [appearance, parts, model]);

  useEffect(() => () => {
    for (const { materials } of parts) {
      materials.forEach(material => material.dispose());
    }
  }, [parts]);
  return <group scale={[appearance.build, appearance.height, appearance.build]} dispose={null}>
    <group position={offset} scale={scale}><primitive object={model} />{movement&&createPortal(<group position={[0,.055,0]} quaternion={hand.rotation}><CustomCharacterItem3D tool={selectedTool} harvestUntil={action==='harvest'?actionUntil:0} /></group>,hand.bone)}</group>
    {!movement&&<mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.43, 48]} />
      <meshBasicMaterial color="#94ada4" transparent opacity={0.2} />
    </mesh>}
  </group>;
}
