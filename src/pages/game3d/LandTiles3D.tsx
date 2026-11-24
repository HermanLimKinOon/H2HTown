import { useLayoutEffect, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { FarmLayout3D } from './farmCustomization3D';
import { LAND_TILES_3D, LAND_TILE_SIZE_3D } from './worldLayout';

// Individual tile transforms and colours share one geometry and material.
export default function LandTiles3D({ onSelect, terrain, onHover, onPaint }: {
  terrain: FarmLayout3D['terrain'];
  onHover?: (key: string | null) => void;
  onPaint?: (key: string, buttons: number) => void;
  onSelect: (event: ThreeEvent<MouseEvent>, button: number) => void;
}) {
  const tiles = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = tiles.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const colour = new THREE.Color();
    LAND_TILES_3D.forEach((tile, index) => {
      transform.position.set(tile.x, -0.09, tile.z);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      const variation = ((tile.x * 17 + tile.z * 31) % 7 + 7) % 7;
      colour.set((terrain[tile.key] ?? tile.terrain) === 'path' ? '#d8bb80' : '#80bd54');
      colour.multiplyScalar(0.96 + variation * 0.012);
      mesh.setColorAt(index, colour);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [terrain]);

  return <group>
    <mesh position={[0, -0.19, 0]} receiveShadow>
      <boxGeometry args={[49, 0.18, 49]} />
      <meshStandardMaterial color="#54783c" roughness={1} />
    </mesh>
    <instancedMesh ref={tiles} args={[undefined, undefined, LAND_TILES_3D.length]} receiveShadow
      onPointerDown={event => { if(event.button===0)onPaint?.(`${Math.round(event.point.x)},${Math.round(event.point.z)}`,event.buttons); }}
      onPointerMove={event => { const key=`${Math.round(event.point.x)},${Math.round(event.point.z)}`;onHover?.(key);onPaint?.(key,event.buttons); }}
      onPointerOut={() => onHover?.(null)}
      onClick={event => { if (event.nativeEvent.button === 0) onSelect(event, 0); }}
      onContextMenu={event => onSelect(event, 2)}>
      <boxGeometry args={[LAND_TILE_SIZE_3D - 0.018, 0.18, LAND_TILE_SIZE_3D - 0.018]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  </group>;
}
