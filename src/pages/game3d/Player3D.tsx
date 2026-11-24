import type {MobileInput3D} from './touchInput3D';
import type { TownLocalPose3D } from './townMultiplayer3D';
import type { ObjectWalk3D } from './objectWalk3D';
import DestinationMarker3D from './DestinationMarker3D';
import { panFarmCamera3D, type FarmCamera3D } from './farmCamera3D';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import FarmerModel3D, { type FarmerAction3D } from './FarmerModel3D';
import MirrorHumanPreview3D from './MirrorHumanPreview3D';
import type { CharacterChoice3D } from './characterChoice3D';
import { movePlayer, type FarmerAppearance3D, type Obstacle3, type Position3, type ToolId3D } from './game3d';
import { movementSpeed3D, movementVector3D, resolveCameraDistance3D, shouldStartJump3D, stepJump3D, turnToward3D, type CameraBlocker3D, type CameraControl3D, type JumpState3D } from './cameraControls3D';

export default function Player3D({ position, obstacles, cameraBlockers, mobileInput, controls, cameraControl, actionCenter, paused, editing = false, editCameraControl, selectedTool, swingUntil, action, actionTarget, appearance, characterChoice, onPositionChange, townPose, livePosition, objectWalk, onWalkComplete }: {
  townPose: React.MutableRefObject<TownLocalPose3D>;
  livePosition: React.MutableRefObject<Position3>;
  objectWalk: React.MutableRefObject<ObjectWalk3D | null>;
  onWalkComplete: () => void;
  position: Position3;
  obstacles: readonly Obstacle3[];
  cameraBlockers: readonly CameraBlocker3D[];
  controls: React.MutableRefObject<Set<string>>;
  mobileInput: React.MutableRefObject<MobileInput3D>;
  cameraControl: React.MutableRefObject<CameraControl3D>;
  actionCenter: React.MutableRefObject<{ x: number; z: number }>;
  paused: boolean;
  editing?: boolean;
  editCameraControl: React.MutableRefObject<FarmCamera3D>;
  selectedTool: ToolId3D | null;
  swingUntil: number;
  action: FarmerAction3D;
  actionTarget: { x: number; z: number } | null;
  appearance: FarmerAppearance3D;
  characterChoice: CharacterChoice3D;
  onPositionChange: (position: Position3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const animationMovement = useRef({ moving: false, running: false });
  const surroundingTiles = useRef<THREE.Group>(null);
  const current = useRef({ ...position });
  const jump = useRef<JumpState3D>({ y: 0, velocity: 0, grounded: true });
  const spaceWasHeld = useRef(false);
  const effectiveCameraDistance = useRef(cameraControl.current.distance);
  const lastUpdate = useRef(0);
  const facing = useRef(Math.PI);
  const speed = useRef(0);

  useEffect(() => { current.current = { ...position }; }, [position]);

  useFrame((frame, delta) => {
    livePosition.current=current.current;
    const keys = controls.current;
    if (editing) {
      editCameraControl.current = panFarmCamera3D(editCameraControl.current,
        Number(keys.has('d') || keys.has('ArrowRight')) - Number(keys.has('a') || keys.has('ArrowLeft')),
        Number(keys.has('w') || keys.has('ArrowUp')) - Number(keys.has('s') || keys.has('ArrowDown')), delta);
    }
    const chopping = (action === 'axe'||action==='pet'||action==='feedPet') && Date.now() < swingUntil;
    const right = paused || chopping ? 0 : Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a')) + mobileInput.current.right;
    const forward = paused || chopping ? 0 : Number(keys.has('ArrowUp') || keys.has('w')) - Number(keys.has('ArrowDown') || keys.has('s')) + mobileInput.current.forward;
    const movement = movementVector3D(right, forward, cameraControl.current.yaw);
    if(paused || right || forward || keys.has(' ') || mobileInput.current.jump)objectWalk.current=null;
    const route = !paused && !chopping ? objectWalk.current : null;
    if(route) {
      let waypoint=route.path[route.index];
      while(waypoint && Math.hypot(waypoint.x-current.current.x,waypoint.z-current.current.z)<.06){current.current={...current.current,...waypoint};waypoint=route.path[++route.index];}
      if(!waypoint) {
        objectWalk.current=null;
        actionCenter.current={x:Math.round(current.current.x),z:Math.round(current.current.z)};
        onPositionChange({...current.current});
        livePosition.current=current.current;
        onWalkComplete();
      } else {
        const dx=waypoint.x-current.current.x,dz=waypoint.z-current.current.z,length=Math.hypot(dx,dz);
        // Slow down at each waypoint so low frame rates cannot overshoot a turn.
        const magnitude=Math.min(1,length/(Math.max(delta,.001)*Math.max(speed.current,movementSpeed3D(false))));
        movement.x=dx/length*magnitude;movement.z=dz/length*magnitude;
      }
    }
    const moving = movement.x !== 0 || movement.z !== 0;
    const running = moving && !route && keys.has('Shift');
    const spaceHeld = !paused && (keys.has(' ') || mobileInput.current.jump);
    const jumpPressed = shouldStartJump3D(spaceHeld, spaceWasHeld.current, jump.current.grounded);
    spaceWasHeld.current = spaceHeld;
    if (!paused) jump.current = stepJump3D(jump.current, delta, jumpPressed);
    speed.current = THREE.MathUtils.lerp(speed.current, moving ? movementSpeed3D(running) : 0, Math.min(1, delta * 10));
    if (moving) {
      facing.current = turnToward3D(facing.current, Math.atan2(movement.x, movement.z), delta * 14);
      const next = movePlayer(current.current, { x: movement.x * delta * speed.current, y: 0, z: movement.z * delta * speed.current }, obstacles);
      current.current = next;
      if (frame.clock.elapsedTime - lastUpdate.current > 0.12) {
        lastUpdate.current = frame.clock.elapsedTime;
        onPositionChange({ ...next });
      }
    }

    const player = group.current;
    if (!player) return;
    if (!moving && actionTarget && Date.now() < swingUntil) {
      facing.current = turnToward3D(facing.current, Math.atan2(actionTarget.x - current.current.x, actionTarget.z - current.current.z), delta * 18);
    }
    player.position.set(current.current.x, jump.current.y, current.current.z);
    player.rotation.y = facing.current;
    livePosition.current=current.current;
    actionCenter.current = { x: Math.round(current.current.x), z: Math.round(current.current.z) };
    surroundingTiles.current?.position.set(Math.round(current.current.x), 0.065, Math.round(current.current.z));
    animationMovement.current = { moving, running };
    townPose.current={x:current.current.x,y:jump.current.y,z:current.current.z,yaw:facing.current,moving,running};


    const editorView = editCameraControl.current;
    const cameraYaw = editing ? editorView.yaw : cameraControl.current.yaw;
    const direction = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    const cameraTarget = editing ? new THREE.Vector3(editorView.x, -12 / editorView.zoom, editorView.z) : new THREE.Vector3(current.current.x, jump.current.y + 1.25, current.current.z);
    const orthographic = frame.camera instanceof THREE.OrthographicCamera;
    if (orthographic) {
      const zoom = editing ? Math.min(frame.size.width / 76, frame.size.height / 76) * editorView.zoom : 340 / cameraControl.current.distance;
      if (frame.camera.zoom !== zoom) { frame.camera.zoom = zoom; frame.camera.updateProjectionMatrix(); }
    }
    const requestedDistance = editing ? 80 : orthographic ? 30 : cameraControl.current.distance;
    const cameraOffset = (distance: number) => direction.clone()
      .multiplyScalar(-distance * Math.cos(cameraControl.current.pitch))
      .add(new THREE.Vector3(0, distance * Math.sin(cameraControl.current.pitch), 0));
    const requestedCamera = cameraTarget.clone().add(cameraOffset(requestedDistance));
    const safeDistance = orthographic ? requestedDistance : resolveCameraDistance3D(cameraTarget, requestedCamera, cameraBlockers);
    const blocked = safeDistance < requestedDistance - 0.001;
    effectiveCameraDistance.current = safeDistance < effectiveCameraDistance.current
      ? safeDistance
      : THREE.MathUtils.damp(effectiveCameraDistance.current, safeDistance, 4, delta);
    const desiredCamera = cameraTarget.clone().add(cameraOffset(effectiveCameraDistance.current));
    if (blocked) frame.camera.position.copy(desiredCamera);
    else frame.camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5));
    // A constant look direction preserves the isometric angle during follow smoothing.
    frame.camera.lookAt(orthographic
      ? frame.camera.position.clone().sub(cameraOffset(1))
      : cameraTarget);
  });

  return <>
    <DestinationMarker3D walk={objectWalk} />
    <group visible={!editing} ref={surroundingTiles} position={[Math.round(position.x), 0.065, Math.round(position.z)]}>
      {([-1.5, 1.5] as const).flatMap(offset => [
        <mesh key={`sx${offset}`} position={[offset, 0, 0]} raycast={() => {}}>
          <boxGeometry args={[0.045, 0.015, 3.045]} />
          <meshBasicMaterial color="#a7eaff" toneMapped={false} />
        </mesh>,
        <mesh key={`sz${offset}`} position={[0, 0, offset]} raycast={() => {}}>
          <boxGeometry args={[3.045, 0.015, 0.045]} />
          <meshBasicMaterial color="#a7eaff" toneMapped={false} />
        </mesh>,
      ])}
    </group>
    <group visible={!editing} ref={group} position={[position.x, 0, position.z]}>
      {characterChoice.model === 'farmer'
        ? <FarmerModel3D movement={animationMovement} selectedTool={selectedTool} action={action} actionUntil={swingUntil} appearance={appearance} />
        : <MirrorHumanPreview3D appearance={characterChoice.customLook} movement={animationMovement} selectedTool={selectedTool} action={action} actionUntil={swingUntil} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><circleGeometry args={[0.55, 20]} /><meshBasicMaterial color="#263b27" transparent opacity={0.22} /></mesh>
    </group>
  </>;
}
