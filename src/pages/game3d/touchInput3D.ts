export type MobileInput3D={right:number;forward:number;jump:boolean};
type MobileControlState3D=MobileInput3D&{knobX:number;knobY:number};
const empty=():MobileControlState3D=>({right:0,forward:0,jump:false,knobX:0,knobY:0});
export function joystickVector3D(dx:number,dy:number,radius=40,deadZone=.15){
 const result={right:0,forward:0,knobX:0,knobY:0};
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(radius)||radius<=0)return result;
 const length=Math.hypot(dx,dy);if(!length)return result;
 const zone=Number.isFinite(deadZone)?Math.max(0,Math.min(.5,deadZone)):.15;
 const fraction=Math.min(1,length/radius),strength=Math.max(0,(fraction-zone)/(1-zone));
 return{right:strength?dx/length*strength:0,forward:strength?-dy/length*strength:0,knobX:dx/length*fraction*radius,knobY:dy/length*fraction*radius};
}
/** Separate pointer ownership lets a second finger jump without interrupting movement. */
export function createMobileControls3D(onChange:(state:MobileControlState3D)=>void,options:{radius?:()=>number;deadZone?:number}={}){
 let stick:number|null=null,jump:number|null=null,state=empty();
 const emit=()=>onChange({...state});
 return{
  startStick(id:number,dx:number,dy:number){if(stick!==null||id===jump)return false;stick=id;state={...state,...joystickVector3D(dx,dy,options.radius?.()??40,options.deadZone??.15)};emit();return true;},
  moveStick(id:number,dx:number,dy:number){if(id!==stick)return;state={...state,...joystickVector3D(dx,dy,options.radius?.()??40,options.deadZone??.15)};emit();},
  startJump(id:number){if(jump!==null||id===stick)return false;jump=id;state.jump=true;emit();return true;},
  end(id:number){if(id!==stick&&id!==jump)return;if(id===stick){stick=null;state={...state,right:0,forward:0,knobX:0,knobY:0};}if(id===jump){jump=null;state.jump=false;}emit();},
  reset(){stick=null;jump=null;state=empty();emit();},
 };
}
