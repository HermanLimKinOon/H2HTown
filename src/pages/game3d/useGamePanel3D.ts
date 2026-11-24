import {useEffect} from 'react';
/** Keep transient HUD panels mutually exclusive without coupling their game models. */
export function useGamePanel3D(id:string,open:boolean,onHide:()=>void){
 useEffect(()=>{
  const hide=(event:Event)=>{if(open&&event instanceof CustomEvent&&event.detail!==id)onHide();};
  window.addEventListener('h2h:game-panel',hide);
  if(open)window.dispatchEvent(new CustomEvent('h2h:game-panel',{detail:id}));
  return()=>window.removeEventListener('h2h:game-panel',hide);
 },[id,open,onHide]);
}
