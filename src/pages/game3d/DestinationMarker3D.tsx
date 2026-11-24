import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ObjectWalk3D } from './objectWalk3D';

export default function DestinationMarker3D({ walk }: { walk: React.MutableRefObject<ObjectWalk3D | null> }) {
  const marker = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!marker.current) return;
    const route = walk.current;
    const destination = route && route.index < route.path.length ? route.path.at(-1) : null;
    marker.current.visible = !!destination;
    if (!destination) return;
    marker.current.position.set(destination.x, 0.1, destination.z);
    marker.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.06);
  });

  return <group ref={marker} visible={false}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
      <ringGeometry args={[0.27, 0.35, 32]} />
      <meshBasicMaterial color="#fff1a8" toneMapped={false} transparent opacity={0.95} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
      <circleGeometry args={[0.065, 16]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} depthWrite={false} />
    </mesh>
  </group>;
}
