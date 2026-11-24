import { useMemo, useRef, type MutableRefObject } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { MmoMessage3D } from './mmoCommunicationTypes3D';
import type { TownPeers3D } from './townMultiplayer3D';
import { interpolateTownPose3D } from './townMultiplayer3D';
import { activeMmoBubbles3D, layoutMmoBubbles3D, mmoBubbleLifetime3D, mmoBubbleOnscreen3D, mmoBubbleText3D, type MmoBubbleRect3D } from './mmoSpeechBubbleLayout3D';

type Props={messages:MmoMessage3D[];selfId:string|null;localPose:MutableRefObject<{x:number;y:number;z:number}>;peers:TownPeers3D;enabled?:boolean};

/** Mount inside the active R3F Canvas. DOM positions follow its active camera. */
export default function MMOSpeechBubbles3D({messages,selfId,localPose,peers,enabled=true}:Props){
  const elements=useRef(new Map<string,HTMLDivElement>());
  const smoothed=useRef(new Map<string,{x:number;y:number;z:number;yaw:number}>());
  const scratch=useMemo(()=>({world:new Vector3(),view:new Vector3(),ndc:new Vector3()}),[]);
  const candidates=useMemo(()=>activeMmoBubbles3D(messages,Date.now()),[messages]);
  useFrame(({camera,size},delta)=>{
    camera.updateMatrixWorld();
    const now=Date.now();
    const rects:MmoBubbleRect3D[]=[];
    const byUser=new Map(Object.values(peers).map(peer=>[peer.userId,peer]));
    for(const id of smoothed.current.keys())if(!byUser.has(id))smoothed.current.delete(id);
    for(const message of candidates){
      const element=elements.current.get(message.id);
      if(!element)continue;
      element.style.visibility='hidden';
      if(!enabled||now-message.receivedAt!>=mmoBubbleLifetime3D(mmoBubbleText3D(message.body)))continue;
      let pose: {x:number;y:number;z:number}|undefined;
      if(message.sender_id===selfId)pose=localPose.current;
      else {
        const peer=message.sender_id?byUser.get(message.sender_id):undefined;
        if(peer){
          const current=interpolateTownPose3D(smoothed.current.get(peer.userId)??peer,peer,delta);
          smoothed.current.set(peer.userId,current);pose=current;
        }
      }
      if(!pose||![pose.x,pose.y,pose.z].every(Number.isFinite))continue;
      scratch.world.set(pose.x,pose.y+3.15,pose.z);
      scratch.view.copy(scratch.world).applyMatrix4(camera.matrixWorldInverse);
      scratch.ndc.copy(scratch.world).project(camera);
      if(!mmoBubbleOnscreen3D(scratch.ndc,scratch.view.z))continue;
      rects.push({id:message.id,x:(scratch.ndc.x+1)*size.width/2,y:(1-scratch.ndc.y)*size.height/2,width:element.offsetWidth,height:element.offsetHeight});
    }
    for(const rect of layoutMmoBubbles3D(rects,size.width,size.height)){
      const element=elements.current.get(rect.id)!;
      element.style.transform=`translate3d(${Math.round(rect.x)}px,${Math.round(rect.y)}px,0)`;
      element.style.visibility='visible';
    }
  });
  if(!enabled||candidates.length===0)return null;
  return <Html fullscreen calculatePosition={(_,__,size)=>[size.width/2,size.height/2]} zIndexRange={[18000000,18000000]} onOcclude={()=>{}} style={{pointerEvents:'none'}}>
    <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
      {candidates.map(message=><div key={message.id} ref={element=>{if(element)elements.current.set(message.id,element);else elements.current.delete(message.id);}} style={{position:'absolute',top:0,left:0,visibility:'hidden',pointerEvents:'none',maxWidth:'min(220px, calc(100% - 16px))',width:'max-content',boxSizing:'border-box',padding:'7px 10px',borderRadius:12,border:'1px solid rgba(255,255,255,.55)',background:'rgba(15,35,39,.91)',boxShadow:'0 2px 8px rgba(0,0,0,.2)',color:'#fff',fontSize:12,lineHeight:'17px',overflowWrap:'anywhere',whiteSpace:'normal',textAlign:'center'}}>{mmoBubbleText3D(message.body)}</div>)}
    </div>
  </Html>;
}
