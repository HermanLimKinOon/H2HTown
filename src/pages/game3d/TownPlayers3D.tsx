import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import FarmerModel3D from './FarmerModel3D';
import MirrorHumanPreview3D from './MirrorHumanPreview3D';
import { interpolateTownPose3D,isTownPeerMoving3D,type TownPeer3D,type TownPeers3D } from './townMultiplayer3D';
import { isCameraDrag3D } from './cameraControls3D';

function TownPlayer3D({peer,onSelect,hasNewMessage}:{peer:TownPeer3D;onSelect:(id:string)=>void;hasNewMessage:boolean}) {
  const group=useRef<Group>(null);
  const current=useRef({x:peer.x,y:peer.y,z:peer.z,yaw:peer.yaw});
  const movement=useRef({moving:false,running:false});
  useFrame((_,delta)=>{
    current.current=interpolateTownPose3D(current.current,peer,delta);
    if(group.current){group.current.position.set(current.current.x,current.current.y,current.current.z);group.current.rotation.y=current.current.yaw;}
    const moving=isTownPeerMoving3D(peer,Date.now());
    movement.current={moving,running:moving&&peer.running};
  });
  return <group ref={group} position={[peer.x,peer.y,peer.z]} onClick={event=>{event.stopPropagation();if(event.button===0&&!isCameraDrag3D(event.delta))onSelect(peer.clientId);}}>
    <mesh position={[0,1.1,0]}><capsuleGeometry args={[.4,1.4,4,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {peer.choice.model==='farmer'
      ? <FarmerModel3D appearance={peer.appearance} movement={movement} selectedTool={null} action="hoe" actionUntil={0}/>
      : <MirrorHumanPreview3D appearance={peer.choice.customLook} movement={movement}/>}
    <Html position={[0,2.65,0]} center>
      <button type="button" aria-label={`Chat with ${peer.name}`} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onSelect(peer.clientId);}} className="whitespace-nowrap rounded-full border border-white/70 bg-teal-950/80 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800">{peer.name} · {hasNewMessage?'New message':'Chat'}</button>
    </Html>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]} raycast={()=>{}}>
      <circleGeometry args={[.5,20]}/><meshBasicMaterial color="#315b59" transparent opacity={.2}/>
    </mesh>
  </group>;
}

export default function TownPlayers3D({peers,onSelect,recentSenders=new Set<string>()}:{peers:TownPeers3D;onSelect:(id:string)=>void;recentSenders?:ReadonlySet<string>}) {
  return <>{Object.values(peers).map(peer=><TownPlayer3D key={peer.clientId} peer={peer} onSelect={onSelect} hasNewMessage={recentSenders.has(peer.clientId)}/>)}</>;
}
