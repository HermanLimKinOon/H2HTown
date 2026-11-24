import {useEffect,useRef,useState,type MutableRefObject,type PointerEvent} from 'react';
import {createMobileControls3D,type MobileInput3D} from './touchInput3D';

export default function MobileControls3D({input,disabled,onAction,onInteract}:{onAction?:()=>void;onInteract?:()=>void;input:MutableRefObject<MobileInput3D>;disabled:boolean}){
 const [visible,setVisible]=useState(false);
 const [jumping,setJumping]=useState(false);
 const knob=useRef<HTMLSpanElement>(null),radius=useRef(32),jumpHeld=useRef(false);
 const center=useRef({x:0,y:0});
 const [controller]=useState(()=>createMobileControls3D(state=>{input.current={right:state.right,forward:state.forward,jump:state.jump};if(knob.current)knob.current.style.transform=`translate(${state.knobX}px, ${state.knobY}px)`;if(jumpHeld.current!==state.jump){jumpHeld.current=state.jump;setJumping(state.jump);}}, {radius:()=>radius.current,deadZone:.08}));
 useEffect(()=>{
  const media=window.matchMedia('(any-pointer: coarse), (max-width: 1000px)');
  const update=()=>{setVisible(media.matches);controller.reset();};
  const reset=()=>controller.reset();let width=window.innerWidth;const resize=()=>{if(Math.abs(window.innerWidth-width)>1){width=window.innerWidth;reset();}};const visibility=()=>{if(document.hidden)reset();};
  update();media.addEventListener('change',update);window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',update);window.removeEventListener('blur',reset);window.removeEventListener('pagehide',reset);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);input.current={right:0,forward:0,jump:false};};
 },[controller,input]);
 useEffect(()=>{if(disabled)controller.reset();},[controller,disabled]);
 const end=(event:PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();controller.end(event.pointerId);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
 if(!visible||disabled)return null;
 return <div role="group" aria-label="3D touch controls" className="game-touch-controls" onClick={event=>{event.stopPropagation();}}>
  <button type="button" aria-label="Movement joystick" aria-description="Drag to move. Release to stop. Use your other thumb to jump." className="game-joystick"
   onPointerDown={event=>{event.preventDefault();event.stopPropagation();const box=event.currentTarget.getBoundingClientRect();const origin={x:box.left+box.width/2,y:box.top+box.height/2};radius.current=Math.max(12,(box.width-(knob.current?.offsetWidth??48))/2);if(controller.startStick(event.pointerId,event.clientX-origin.x,event.clientY-origin.y)){center.current=origin;event.currentTarget.setPointerCapture(event.pointerId);}}}
   onPointerMove={event=>{event.preventDefault();event.stopPropagation();const latest=event.nativeEvent.getCoalescedEvents?.().at(-1)??event;controller.moveStick(event.pointerId,latest.clientX-center.current.x,latest.clientY-center.current.y);}}
   onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   <span aria-hidden="true" >MOVE</span>
   <span aria-hidden="true" ref={knob} className="game-joystick-knob" style={{transform:'translate(0px, 0px)'}}/>
  </button>
  <div className="game-touch-actions">{onInteract&&<button type="button" aria-label="Interact with nearby object" onClick={onInteract}><i className="ri-hand" aria-hidden="true"/>Interact</button>}{onAction&&<button type="button" aria-label="Use selected tool" onClick={onAction}><i className="ri-hammer-line" aria-hidden="true"/>Action</button>}
  <button type="button" aria-label="Jump" aria-pressed={jumping} className="game-jump"
   onPointerDown={event=>{event.preventDefault();event.stopPropagation();if(controller.startJump(event.pointerId))event.currentTarget.setPointerCapture(event.pointerId);}}
   onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   <span aria-hidden="true" className="text-2xl leading-none">↑</span><span className="mt-1 text-xs">JUMP</span>
  </button></div>
 </div>;
}
