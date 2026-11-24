import {useEffect} from 'react';
/** Scope the browser scroll lock and safe-area viewport to the 3D route only. */
export function useGameViewport3D(){
 useEffect(()=>{
  const meta=document.querySelector<HTMLMetaElement>('meta[name="viewport"]'),previous=meta?.content;
  if(meta)meta.content='width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content';
  document.body.classList.add('game-route-3d');
  const resize=()=>{const height=window.visualViewport?.height??window.innerHeight;document.documentElement.style.setProperty('--game-viewport-height',`${height}px`);document.body.classList.toggle('game-keyboard-3d',height<window.innerHeight*.78);};
  resize();window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
  return()=>{document.body.classList.remove('game-route-3d','game-keyboard-3d');document.documentElement.style.removeProperty('--game-viewport-height');if(meta&&previous!==undefined)meta.content=previous;window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);};
 },[]);
}
