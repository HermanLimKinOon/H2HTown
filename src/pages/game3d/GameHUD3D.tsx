import GameCart3D from './GameCart3D';
import {useCart} from '@/hooks/useCart';
import {useGamePanel3D} from './useGamePanel3D';
import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
type Props={world:string;name:string;role:string;coins:number;saveLabel:string;hint:string;navigation:ReactNode;friends:ReactNode;chat:ReactNode;hotbar:ReactNode;touch:ReactNode;connection:ReactNode;announcements:string[];shopAlert?:{id:string;text:string};notifications?:ReactNode;unreadNotices?:number;onSignOut:()=>void;onFocusChange:(open:boolean)=>void;showBack:boolean;editing:boolean};
export default function GameHUD3D(p:Props){
 const onFocusChange=p.onFocusChange,cart=useCart();
 const [cartOpen,setCartOpen]=useState(false),[menu,setMenu]=useState(false),[notices,setNotices]=useState(false),[help,setHelp]=useState(false),[toast,setToast]=useState(true),[showShopAlert,setShowShopAlert]=useState(false);
 const hidePanels=useCallback(()=>{setMenu(false);setNotices(false);setHelp(false);setCartOpen(false);},[]);
 useGamePanel3D('navigation',menu||notices||help||cartOpen,hidePanels);
 useEffect(()=>{setShowShopAlert(!!p.shopAlert?.id);const timer=setTimeout(()=>setShowShopAlert(false),8000);return()=>clearTimeout(timer);},[p.shopAlert?.id]);
 useEffect(()=>{setToast(true);const timer=setTimeout(()=>setToast(false),6500);return()=>clearTimeout(timer);},[p.hint]);
 useEffect(()=>{onFocusChange(menu||notices||help||cartOpen);return()=>onFocusChange(false);},[menu,notices,help,cartOpen,onFocusChange]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);setNotices(false);setHelp(false);setCartOpen(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 return <div className="game-hud" aria-label="Game interface">
  <header className="game-topbar game-surface">
   <div className="game-player-card"><span className="game-avatar" aria-hidden="true">{p.name.slice(0,1).toUpperCase()}</span><div><strong>{p.world}</strong><span>{p.name} <span className="game-role">{p.role}</span></span></div><span className="game-coins" aria-label={`${p.coins} coins`}>◉ {p.coins}</span></div>
   <div className="game-navigation" data-open={menu}><nav aria-label="Game navigation" onClick={e=>{if((e.target as HTMLElement).closest('button:not(:disabled),a'))setMenu(false);}}>{p.navigation}</nav><div className="game-account-actions"><button onClick={()=>{setHelp(true);setMenu(false);setCartOpen(false);}}>Controls & help</button>{p.showBack&&<Link to="/game">Back to 2D game</Link>}<button onClick={p.onSignOut}>Sign out</button></div></div>
   <div className="game-header-actions">{p.friends}<button className="game-icon-button" aria-label="Shopping cart" aria-expanded={cartOpen} onClick={()=>{setCartOpen(v=>!v);setMenu(false);setNotices(false);setHelp(false);}}><i className="ri-shopping-cart-2-line" aria-hidden="true"/>{cart.count>0&&<span className="game-notice-count" aria-label={`${cart.count} items in cart`}>{cart.count>99?'99+':cart.count}</span>}</button><button className="game-icon-button" aria-label="Notifications" aria-expanded={notices} onClick={()=>{setNotices(v=>!v);setMenu(false);setHelp(false);setCartOpen(false);}}><i className="ri-notification-3-line" aria-hidden="true"/>{!!p.unreadNotices&&<span className="game-notice-count" aria-label={`${p.unreadNotices} unread shop notifications`}>{p.unreadNotices>99?'99+':p.unreadNotices}</span>}</button><button className="game-icon-button" aria-label="Player menu" aria-expanded={menu} onClick={()=>{setMenu(v=>!v);setNotices(false);setHelp(false);setCartOpen(false);}}><i className={menu?'ri-close-line':'ri-menu-line'} aria-hidden="true"/></button></div>
  </header>
  <div className="game-hud-body"><div className="game-connection-slot">{p.connection}</div>
   {cartOpen&&<GameCart3D onClose={()=>setCartOpen(false)}/>}
   {notices&&<aside className="game-popover game-notices game-surface" aria-label="Notifications panel"><header><h2>Notifications</h2><button className="game-icon-button" aria-label="Close notifications" onClick={()=>setNotices(false)}>×</button></header>{p.notifications}<p>{p.hint}</p>{p.announcements.map((text,i)=><p key={i}>{text}</p>)}<small>{p.saveLabel}</small></aside>}
   {help&&<aside className="game-popover game-help game-surface" aria-label="Game controls"><header><h2>Controls</h2><button className="game-icon-button" aria-label="Close controls" onClick={()=>setHelp(false)}>×</button></header><dl><dt>Move / run</dt><dd>W A S D / Shift</dd><dt>Jump</dt><dd>Space</dd><dt>Inventory</dt><dd>I or Bag</dd><dt>Chat</dt><dd>Enter · Escape to close</dd><dt>Zoom</dt><dd>Mouse wheel</dd><dt>Interact</dt><dd>Click a character, object or ground</dd></dl><p>On touch screens, drag the joystick to move. Use Interact for nearby objects and Action for your selected tool. Tap the world to choose a destination.</p></aside>}
   {(toast||showShopAlert)&&!p.editing&&<div className="game-toast" role="status">{showShopAlert&&p.shopAlert?<>{p.shopAlert.text} · Check Notifications for details.</>:p.hint}</div>}
  </div>
  {p.editing&&<div className="game-edit-chat">{p.chat}</div>}
  {!p.editing&&<footer className="game-bottom-dock"><div className="game-chat-slot">{p.chat}</div><div className="game-hotbar-slot">{p.hotbar}</div><div className="game-touch-slot">{p.touch}</div><div className="game-dock-help"><button onClick={()=>{setHelp(v=>!v);setCartOpen(false);setNotices(false);}} className="game-surface">? <span>Controls</span></button><small>{p.saveLabel}</small></div></footer>}
 </div>;
}
