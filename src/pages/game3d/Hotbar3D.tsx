import {useRef,type PointerEvent} from 'react';
import { assetUrl } from '../game/assets';
import type { Game3DSave, ToolId3D } from './game3d';
import { toolDetails3D } from './toolDetails3D';

export default function Hotbar3D({ save, inventoryOpen, onSelect, onToggleInventory }: {
  save: Game3DSave;
  inventoryOpen: boolean;
  onSelect: (slot: number | 'cursor') => void;
  onToggleInventory: () => void;
}) {
  const drag=useRef<{id:number;x:number;left:number;moved:boolean}|null>(null),suppressClick=useRef(0);
  const endDrag=(e:PointerEvent<HTMLDivElement>)=>{if(drag.current?.id!==e.pointerId)return;if(drag.current.moved)suppressClick.current=Date.now()+250;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
  const quantity = (item: ToolId3D) => item === 'seeds' ? '∞' : item === 'carrot' ? save.inventory.carrot : item === 'wood' ? save.inventory.wood : item === 'petFood' ? save.inventory.petFood : item === 'chicken' || item === 'chickenFeed' || item === 'egg' ? save.inventory[item] : undefined;
  const selectedItem = save.selectedSlot === 'cursor' ? null : save.hotbar[save.selectedSlot];
  return <div className="game-hotbar" aria-label="Inventory dock">
    <div className="game-hotbar-meta"><span>{save.selectedSlot==='cursor'?'Empty hands':selectedItem?toolDetails3D[selectedItem].name:'Empty slot'}</span><button type="button" aria-label="Open inventory" aria-haspopup="dialog" aria-expanded={inventoryOpen} onClick={onToggleInventory}><i className="ri-briefcase-4-line" aria-hidden="true"/><span>Bag <kbd>I</kbd></span></button></div>
    <div role="group" aria-label="3D item hotbar" className="game-hotbar-items"
     onPointerDown={e=>{if(drag.current||e.button!==0||e.pointerType==='mouse')return;drag.current={id:e.pointerId,x:e.clientX,left:e.currentTarget.scrollLeft,moved:false};}}
     onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const delta=e.clientX-d.x;if(Math.abs(delta)>6||d.moved){e.preventDefault();d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.scrollLeft=d.left-delta;}}}
     onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
     onClickCapture={e=>{if(Date.now()<suppressClick.current){e.preventDefault();e.stopPropagation();}}}>
      <button type="button" aria-label="3D cursor: empty hands" aria-pressed={save.selectedSlot==='cursor'} onClick={()=>onSelect('cursor')}><span className="game-slot-key">0</span><i className="ri-cursor-line" aria-hidden="true"/></button>
      {save.hotbar.map((item,index)=><button type="button" key={index} aria-label={`3D slot ${index+1}: ${item?toolDetails3D[item].name:'Empty'}`} aria-pressed={save.selectedSlot===index} onClick={()=>onSelect(index)}><span className="game-slot-key">{index+1}</span>{item&&<img src={assetUrl(toolDetails3D[item].image)} alt="" draggable={false}/>} {item&&quantity(item)!==undefined&&<span className="game-slot-count">{quantity(item)}</span>}</button>)}
    </div>
  </div>;
}
