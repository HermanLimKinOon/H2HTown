import { useState } from 'react';
import type { Game3DSave } from './game3d';
import { houseLayoutFor3D,editHouseFurniture3D,moveHouseObject3D,moveHouseCat3D,deleteHouseFurniture3D,type HouseLayout3D,type HouseFurnitureKind3D } from './houseCustomization3D';
import { placeCat3D,freshCatBrain3D,type OwnedCat3D } from './cats3D';
type Draft={layout:HouseLayout3D;cats:OwnedCat3D[]};
export function useHouseEditor3D(save:Game3DSave,onStart:()=>void,onEnd:(draft:Draft|null)=>void,preserveUnloadedCats=false) {
  const [draft,setDraft]=useState<Draft|null>(null),[history,setHistory]=useState<Draft[]>([]),[tool,setTool]=useState<'select'|HouseFurnitureKind3D|'cats'>('select'),[selected,setSelected]=useState<string|null>(null),[moving,setMoving]=useState(false),[tile,setTile]=useState<string|null>(null),[hover,setHover]=useState<string|null>(null),[rotation,setRotation]=useState(0),[message,setMessage]=useState('Choose furniture or a cat to place.');
  const active=draft!==null,layout=draft?.layout??houseLayoutFor3D(save),cats=draft?.cats??save.cats;
  const cat=selected?cats.find(cat=>cat.id===selected):undefined;
  const furniture=selected?layout.furniture[selected]:undefined;
  const changes=(next:Draft)=>{if(draft)setHistory(old=>[...old.slice(-29),draft]);setDraft(next);};
  const resultFor=(key:string)=>{
    if(!draft)return null;
    if(selected&&moving)return cat?moveHouseCat3D(layout,selected,key,rotation):moveHouseObject3D(layout,selected,key,rotation);
    if(tool!=='select'&&tool!=='cats')return editHouseFurniture3D(layout,tool,key,rotation);
    return null;
  };
  const finish=()=>{setDraft(null);setSelected(null);setMoving(false);setTile(null);setHover(null);setHistory([]);};
  return {active,layout,cats,tool,selected,moving,tile,hover,rotation,message,history,cat,furniture,discard:finish,
    preview:tile?resultFor(tile):null,
    start:(focusId?:string,moveNow=false)=>{onStart();let initial=houseLayoutFor3D(save);const placed=save.cats.filter(cat=>cat.houseId===save.interiorHouseId);if(!preserveUnloadedCats)initial={...initial,catPositions:Object.fromEntries(Object.entries(initial.catPositions).filter(([id])=>placed.some(cat=>cat.id===id)))};for(const cat of placed){if(initial.catPositions[cat.id])continue;const brain=freshCatBrain3D(Number(cat.id.split('-')[1]));const candidates=[`${Math.round(brain.x)},${Math.round(brain.z)}`];for(let x=-4;x<=4;x++)for(let z=-4;z<=3;z++)candidates.push(`${x},${z}`);for(const key of candidates){const result=moveHouseCat3D(initial,cat.id,key,0);if(result.changed){initial=result.layout;break;}}}setDraft({layout:initial,cats:save.cats});setHistory([]);setTool('select');setSelected(focusId??null);setMoving(Boolean(focusId&&moveNow));setRotation(focusId?(initial.furniture[focusId]?.rotation??initial.catPositions[focusId]?.rotation??0):0);setTile(null);setHover(null);setMessage(focusId&&moveNow?'Click a clear floor tile to move the object.':'Select furniture or a cat, or choose an item to place.');},
    cancel:()=>{finish();onEnd(null);},save:()=>{if(draft){finish();onEnd(draft);}},
    undo:()=>{const last=history.at(-1);if(last){setDraft(last);setHistory(history.slice(0,-1));setSelected(null);setMoving(false);setMessage('Last house edit undone.');}},
    choose:(value:typeof tool)=>{setTool(value);setSelected(null);setMoving(false);setHover(null);setMessage(value==='cats'?'Choose an owned cat, then click a clear floor tile.':value==='select'?'Select an object in the room, or choose an item below.':'Click a floor tile to place. Press R to rotate.');},
    select:(id:string)=>{if(!active||moving||tool!=='select')return;setSelected(id);setRotation(layout.furniture[id]?.rotation??layout.catPositions[id]?.rotation??0);setMessage(layout.furniture[id]?'Choose Move or Delete. Press R to rotate.':'Choose Move, then click a clear destination. Press R to rotate.');},
    selectCat:(id:string)=>{if(!active)return;setSelected(id);setMoving(true);setTool('cats');setRotation(layout.catPositions[id]?.rotation??0);setHover(null);setMessage('Click a clear floor tile to place this cat.');},
    move:()=>{setMoving(true);setHover(null);setTile(null);setMessage('Click a clear floor tile to move. Press R to rotate.');},
    deselect:()=>{setSelected(null);setHover(null);},
    remove:()=>{if(!draft||!selected||moving)return;const result=deleteHouseFurniture3D(layout,selected);if(result.changed){changes({...draft,layout:result.layout});setSelected(null);setHover(null);setTile(null);}setMessage(result.message);},
    setTile,setHover,
    rotate:()=>{
      const angle=(rotation+1)%4;setRotation(angle);
      if(draft&&selected&&!moving){const item=layout.furniture[selected]??layout.catPositions[selected];if(item){const result=cat?moveHouseCat3D(layout,selected,`${item.x},${item.z}`,angle):moveHouseObject3D(layout,selected,`${item.x},${item.z}`,angle);if(result.changed)changes({...draft,layout:result.layout});setMessage(result.message);}}
    },
    ground:(key:string)=>{
      if(!draft)return;
      if(tool==='select'&&!moving){setSelected(null);return;}
      const result=resultFor(key);if(!result){setMessage('Choose furniture or a cat to place.');return;}
      if(result.changed){
        let nextCats=cats;
        if(cat&&cat.houseId===null){const placed=placeCat3D({...save,cats},cat.id);if(!placed.changed){setMessage(placed.message);return;}nextCats=placed.state.cats;}
        changes({layout:result.layout,cats:nextCats});
        if(moving){setMoving(false);setTool('select');}
      }
      setMessage(result.message);
    },
  };
}
export type HouseEditorState3D=ReturnType<typeof useHouseEditor3D>;
