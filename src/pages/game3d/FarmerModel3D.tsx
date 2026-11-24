import { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ToolId3D } from './game3d';
import { DEFAULT_FARMER_APPEARANCE_3D, type FarmerAppearance3D } from './game3d';

export type FarmerAction3D = 'hoe' | 'seeds' | 'wateringCan' | 'axe' | 'harvest' | 'feedPet' | 'pet';

export default function FarmerModel3D({ movement, selectedTool, action, actionUntil, appearance = DEFAULT_FARMER_APPEARANCE_3D }: {
  movement: React.MutableRefObject<{ moving: boolean; running: boolean }>;
  selectedTool: ToolId3D | null;
  action: FarmerAction3D;
  actionUntil: number;
  appearance?: FarmerAppearance3D;
}) {
  const { scene } = useGLTF('/game3d/farmer.glb');
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
        object.castShadow = true;
      }
    });
    return copy;
  }, [scene]);
  const parts = useMemo(() => ({
    leftArm: model.getObjectByName('Left_Arm_Pivot')!,
    rightArm: model.getObjectByName('Right_Arm_Pivot')!,
    leftLeg: model.getObjectByName('Left_Leg_Pivot')!,
    rightLeg: model.getObjectByName('Right_Leg_Pivot')!,
    socket: model.getObjectByName('Right_Tool_Socket')!,
    head: model.getObjectByName('Head_Pivot')!,
  }), [model]);
  useEffect(() => {
    const colours = { skin: appearance.skin, shirt: appearance.shirt, denim: appearance.denim, darkDenim: appearance.denim, leather: appearance.boots, straw: appearance.hatColor, hair: appearance.hair };
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial && colours[material.name]) material.color.set(colours[material.name]);
      }
      if (/^(Straw_Hat|Hat_Brown)/.test(object.name)) object.visible = appearance.hat;
    });
  }, [appearance, model]);
  const effects = useRef<THREE.Group>(null);
  const harvesting = action === 'harvest' && Date.now() < actionUntil;

  useFrame(({ clock }) => {
    const { moving, running } = movement.current;
    const swing = moving ? Math.sin(clock.elapsedTime * (running ? 16 : 11)) * 0.65 : 0;
    const active = Date.now() < actionUntil;
    const progress = THREE.MathUtils.clamp(1 - (actionUntil - Date.now()) / 900, 0, 1);
    const reach = active ? Math.sin(progress * Math.PI) : 0;
    parts.leftArm.rotation.x = swing;
    parts.rightArm.rotation.x = -swing;
    parts.leftArm.rotation.z = -0.15;
    parts.rightArm.rotation.z = 0.15;
    parts.leftArm.rotation.y = 0;
    parts.rightArm.rotation.y = 0;
    parts.leftLeg.rotation.x = -swing;
    parts.rightLeg.rotation.x = swing;
    model.rotation.x = 0;
    model.rotation.y = 0;
    if (active) {
      if (action === 'axe') {
        // Wind up, strike at 500 ms, then ease back into the idle pose.
        const windup = THREE.MathUtils.smoothstep(progress, 0, 0.3);
        const strike = THREE.MathUtils.smoothstep(progress, 0.3, 0.56);
        const recover = THREE.MathUtils.smoothstep(progress, 0.62, 1);
        const pose = 1 - recover;
        model.rotation.y = (0.5 * windup - 0.9 * strike) * pose;
        model.rotation.x = 0.12 * strike * pose;
        parts.rightArm.rotation.x = (-0.9 * windup - 0.4 * strike) * pose;
        parts.rightArm.rotation.y = (0.7 * windup - 1.6 * strike) * pose;
        parts.rightArm.rotation.z = 0.15 + (0.8 * windup - 1.25 * strike) * pose;
        parts.leftArm.rotation.x = -1.05 * windup * pose;
        parts.leftArm.rotation.y = -0.5 * strike * pose;
        parts.leftArm.rotation.z = -0.15 - 0.25 * windup * pose;
      } else if (action === 'hoe') {
        parts.rightArm.rotation.x = -Math.sin(progress * Math.PI * 1.5) * 1.9;
        parts.leftArm.rotation.x = parts.rightArm.rotation.x * 0.55;
        model.rotation.x = reach * 0.18;
      } else if (action === 'wateringCan') {
        parts.rightArm.rotation.x = -reach * 0.8;
        parts.rightArm.rotation.z = 0.15 - reach * 0.55;
      } else {
        model.rotation.x = reach * 0.5;
        parts.rightArm.rotation.x = -reach * 1.1;
        parts.leftArm.rotation.x = -reach * 0.55;
      }
    }
    if (effects.current) {
      effects.current.visible = active && action!=='pet' && action!=='feedPet' && (action !== 'axe' || progress >= 0.56);
      effects.current.children.forEach((child, i) => {
        if (action === 'axe') {
          const burst = Math.max(0, (progress - 0.56) / 0.44);
          const angle = i * 2.4;
          child.position.set(Math.cos(angle) * burst * 0.7, 0.65 + Math.sin(burst * Math.PI) * 0.4 - burst * 0.5, 0.95 + Math.sin(angle) * burst * 0.5);
          child.rotation.set(burst * 8 + i, i, burst * 5);
          child.scale.set(0.08 * (1 - burst), 0.035 * (1 - burst), 0.045 * (1 - burst));
          return;
        }
        const phase = (progress * 2 + i / 8) % 1;
        child.position.set((i % 3 - 1) * 0.16, action === 'wateringCan' ? 0.75 * (1 - phase) : Math.sin(phase * Math.PI) * 0.35, 0.65 + phase * 0.65);
        child.scale.setScalar(action === 'seeds' ? 0.035 : action === 'wateringCan' ? 0.045 : 0.065);
      });
    }
  });

  const tool = selectedTool === 'hoe' || selectedTool === 'axe' || selectedTool === 'wateringCan';
  return <>
    <group scale={[appearance.build, appearance.height, appearance.build]}>
    <primitive object={model} />
    {createPortal(<group>
      {appearance.hairStyle !== 'bald' && <mesh position={[0, 0.12, -0.015]} scale={[1, appearance.hairStyle === 'bob' ? 1.15 : 0.7, 1]}>
        <sphereGeometry args={[0.282, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={appearance.hair} roughness={1} />
      </mesh>}
      {appearance.hairStyle === 'bob' && [-1, 1].map(side => <mesh key={side} position={[side * 0.24, -0.02, -0.06]}><boxGeometry args={[0.09, 0.35, 0.28]} /><meshStandardMaterial color={appearance.hair} /></mesh>)}
      {appearance.hairStyle === 'curly' && Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 0.21, 0.19 + (i % 2) * 0.035, Math.sin(i * Math.PI / 4) * 0.19]}><sphereGeometry args={[0.1, 7, 5]} /><meshStandardMaterial color={appearance.hair} /></mesh>)}
    </group>, parts.head)}
    {createPortal(<group rotation={[0.1, 0, -0.2]}>
      {tool && !harvesting && (selectedTool === 'wateringCan' ? <group>
        <mesh><boxGeometry args={[0.28, 0.25, 0.23]} /><meshStandardMaterial color="#62c8cf" /></mesh>
        <mesh position={[0, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.055, 0.3, 8]} /><meshStandardMaterial color="#62c8cf" /></mesh>
      </group> : <group>
        <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.025, 0.025, 0.8, 8]} /><meshStandardMaterial color="#81532e" /></mesh>
        <mesh position={[0, -0.56, 0.06]}><boxGeometry args={selectedTool === 'axe' ? [0.3, 0.22, 0.05] : [0.08, 0.13, 0.27]} /><meshStandardMaterial color="#a9b3b8" /></mesh>
      </group>)}
      {harvesting && <group>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.09, 0.3, 8]} /><meshStandardMaterial color="#f1842f" /></mesh>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.12, 0.14, 0.04]} /><meshStandardMaterial color="#4b9e46" /></mesh>
      </group>}
    </group>, parts.socket)}
    </group>
    <group ref={effects} visible={false}>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} raycast={() => {}}>
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial color={action === 'axe' ? '#d8ab70' : action === 'wateringCan' ? '#67d8ff' : action === 'seeds' ? '#eed291' : action === 'harvest' ? '#85c751' : '#80593b'} />
      </mesh>)}
    </group>
  </>;
}
