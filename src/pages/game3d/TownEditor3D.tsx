import MerchantCenter3D from './MerchantCenter3D';
import ShopProductsEditor3D,{type ShopRequest3D} from './ShopProductsEditor3D';
import {isWorldShop3D,worldShopCatalogueId3D,type WorldShopId3D} from './worldShop3D';
import {useEffect,useLayoutEffect,useRef,useState,type MutableRefObject} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import TownWorld3D from './TownWorld3D';
import TownObjectVisual3D from './TownObjectVisual3D';
import FarmCameraControls3D from './FarmCameraControls3D';
import {freshFarmCamera3D,adjustFarmCamera3D,panFarmCamera3D,rotateFarmCamera3D,zoomFarmCamera3D,type FarmCamera3D} from './farmCamera3D';
import {normalizeTownLayout3D,getTownObject3D,moveTownObject3D,deleteTownObject3D,placeTownBuilding3D,renameTownShop3D,TOWN_BUILDING_CATALOG_3D,type TownLayout3D,type TownEditObject3D,type TownBuildingStyle3D} from './townCustomization3D';
import type {WorldEditRecord3D} from './useWorldEditing3D';
const button='rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40';
function EditorCamera({view,keys}:{view:MutableRefObject<FarmCamera3D>;keys:MutableRefObject<Set<string>>}){
 useFrame(({camera,size},dt)=>{
  const k=keys.current;view.current=panFarmCamera3D(view.current,Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('arrowleft')),Number(k.has('w')||k.has('arrowup'))-Number(k.has('s')||k.has('arrowdown')),dt);
  if(k.has('q')||k.has('e'))view.current=rotateFarmCamera3D(view.current,(Number(k.has('q'))-Number(k.has('e')))*Math.min(dt,.1));
  const v=view.current,pitch=Math.atan(1/Math.sqrt(2)),distance=80;
  camera.position.set(v.x-Math.sin(v.yaw)*distance*Math.cos(pitch),-12/v.zoom+distance*Math.sin(pitch),v.z-Math.cos(v.yaw)*distance*Math.cos(pitch));
  camera.lookAt(v.x,-12/v.zoom,v.z);
  if(camera instanceof THREE.OrthographicCamera){const zoom=Math.min(size.width/76,size.height/76)*v.zoom;if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}}
 });return null;
}
function Border({object,color='#a7eaff'}:{object:TownEditObject3D;color?:string}){
 return <group position={[object.x,.07,object.z]} rotation={[0,object.rotation*Math.PI/2,0]}>{[-1,1].flatMap(side=>[
  <mesh key={`x${side}`} position={[side*object.width/2,0,0]} raycast={()=>null}><boxGeometry args={[.06,.04,object.depth]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>,
  <mesh key={`z${side}`} position={[0,0,side*object.depth/2]} raycast={()=>null}><boxGeometry args={[object.width,.04,.06]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>,
 ])}</group>;
}
function Ghost({object,valid}:{object:TownEditObject3D;valid:boolean}){
 const group=useRef<THREE.Group>(null);
 useLayoutEffect(()=>{group.current?.traverse(node=>{node.raycast=()=>{};if(node instanceof THREE.Mesh){node.castShadow=false;for(const material of Array.isArray(node.material)?node.material:[node.material]){material.transparent=true;material.opacity=.42;material.depthWrite=false;}}});},[object.kind,object.style,object.id]);
 return <><group position={[object.x,.02,object.z]} rotation={[0,object.rotation*Math.PI/2,0]} ref={group}><TownObjectVisual3D object={object}/></group><Border object={object} color={valid?'#5ce7b1':'#f87878'}/></>;
}
export default function TownEditor3D({record,save,close,request}:{record:WorldEditRecord3D;save:(data:TownLayout3D)=>void;close:()=>void;request:ShopRequest3D}){
 const [draft,setDraft]=useState(()=>normalizeTownLayout3D(record.data)),[history,setHistory]=useState<TownLayout3D[]>([]),[tool,setTool]=useState<'select'|'building'>('select'),[style,setStyle]=useState<TownBuildingStyle3D>('cottage'),[selected,setSelected]=useState<string|null>(null),[hovered,setHovered]=useState<string|null>(null),[moving,setMoving]=useState(false),[angle,setAngle]=useState(0),[tile,setTile]=useState<{x:number;z:number}|null>(null),[message,setMessage]=useState('Click an object to move, rotate or delete it, or choose Buildings to create one.');
 const [shopName,setShopName]=useState('');
 const [reviewPlot,setReviewPlot]=useState<string|null>(null);
 const [productShop,setProductShop]=useState<WorldShopId3D|null>(null);
 const view=useRef(freshFarmCamera3D()),keys=useRef(new Set<string>()),surface=useRef<HTMLDivElement>(null),drag=useRef<{id:number;x:number}|null>(null);
 const object=selected?getTownObject3D(draft,selected):null,placing=tool==='building'||moving;
 const apply=(result:ReturnType<typeof moveTownObject3D>)=>{if(result.changed){setHistory(old=>[...old.slice(-29),draft]);setDraft(result.layout);}setMessage(result.message);return result.changed;};
 const undo=()=>{const last=history.at(-1);if(last){setDraft(last);setHistory(history.slice(0,-1));setSelected(null);setMoving(false);setMessage('Last edit undone.');}};
 const rotate=()=>{if(object&&!moving&&tool==='select')apply(moveTownObject3D(draft,object.id,object,(object.rotation+1)%4));else setAngle(a=>(a+1)%4);};
 const cancel=()=>{if(placing){setMoving(false);setTool('select');setTile(null);setMessage('Placement cancelled.');}else if(selected)setSelected(null);else close();};
 const events=useRef({rotate,cancel,undo,disabled:false});events.current={rotate,cancel,undo,disabled:productShop!==null||reviewPlot!==null};
 useEffect(()=>{
  const heldKeys=keys.current;
  const down=(e:KeyboardEvent)=>{if(events.current.disabled)return;if(e.target instanceof HTMLElement&&(e.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','q','e'].includes(key)){e.preventDefault();keys.current.add(key);}else if(key==='r'&&!e.repeat){e.preventDefault();events.current.rotate();}else if(key==='escape'){e.preventDefault();events.current.cancel();}else if(key==='z'&&(e.ctrlKey||e.metaKey)){e.preventDefault();events.current.undo();}};
  const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase()),blur=()=>keys.current.clear();
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  const node=surface.current,wheel=(e:WheelEvent)=>{e.preventDefault();view.current=zoomFarmCamera3D(view.current,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?200:1));};node?.addEventListener('wheel',wheel,{passive:false});
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);node?.removeEventListener('wheel',wheel);heldKeys.clear();};
 },[]);
 const point=(p:{x:number;z:number})=>({x:Math.round(p.x),z:Math.round(p.z)});
 const commit=(p:{x:number;z:number})=>{if(drag.current)return;const target=point(p);if(tool==='building'){if(apply(placeTownBuilding3D(draft,style,target,angle)))setTile(null);}else if(moving&&object){if(apply(moveTownObject3D(draft,object.id,target,angle)))setMoving(false);}else{setSelected(null);setHovered(null);}};
 const choose=(id:string)=>{if(placing){const item=getTownObject3D(draft,id);if(item)commit(item);return;}setSelected(id);setShopName(getTownObject3D(draft,id)?.name??'');setAngle(getTownObject3D(draft,id)?.rotation??0);setMessage('Move follows your cursor. R rotates by 90 degrees.');};
 const previewResult=tile&&placing?(moving&&object?moveTownObject3D(draft,object.id,tile,angle):placeTownBuilding3D(draft,style,tile,angle)):null;
 const preview=tile&&placing?(moving&&object?{...object,...tile,rotation:angle}:getTownObject3D({...draft,buildings:{...draft.buildings,'building-preview':{...tile,rotation:angle,style}}},'building-preview')):null;
 const highlight=!placing?(hovered?getTownObject3D(draft,hovered):object):null;
 const endDrag=(event:React.PointerEvent<HTMLDivElement>)=>{if(drag.current?.id===event.pointerId){drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}};
 return <>
  <div ref={surface} className="absolute inset-0 touch-none" onContextMenu={e=>e.preventDefault()} onPointerDownCapture={e=>{if(e.button===2){e.preventDefault();drag.current={id:e.pointerId,x:e.clientX};e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMoveCapture={e=>{if(drag.current?.id===e.pointerId){view.current=rotateFarmCamera3D(view.current,-(e.clientX-drag.current.x)*.006);drag.current.x=e.clientX;}}} onPointerUpCapture={endDrag} onPointerCancel={endDrag} onLostPointerCapture={()=>{drag.current=null;}}>
   <Canvas orthographic shadows camera={{position:[30,30,30],zoom:12,near:.1,far:200}}>
    <TownWorld3D layout={draft} hiddenObject={moving&&preview?selected:null} onSelect={choose} onHover={p=>setTile(p?point(p):null)} onObjectHover={id=>{if(!placing)setHovered(id);}} onGround={commit} onShop={()=>{}} onTalk={()=>{}} onTravel={()=>{}}/>
    <EditorCamera view={view} keys={keys}/>
    {highlight&&<Border object={highlight}/>}{preview&&<Ghost object={preview} valid={previewResult?.changed??false}/>}
    {object&&!placing&&<Html position={[object.x,Math.min(object.height,5)+.4,object.z]} center zIndexRange={[35,20]}><div role="dialog" aria-label="Town object actions" className="w-60 rounded-xl border border-teal-200 bg-white p-3 text-slate-800 shadow-xl" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">{object.name}</h3><button aria-label="Deselect Town object" onClick={()=>setSelected(null)}>×</button></div><div className="flex gap-1"><button className={`${button} bg-teal-700 text-white`} onClick={()=>{setMoving(true);setAngle(object.rotation);setTile(null);setMessage('Click a clear tile to place the faded preview. R rotates it.');}}>Move</button><button className={`${button} bg-teal-50 text-teal-800`} onClick={rotate}>Rotate</button>{object.canDelete&&<button className={`${button} bg-red-50 text-red-700`} onClick={()=>{apply(deleteTownObject3D(draft,object.id));setSelected(null);setHovered(null);}}>Delete</button>}</div>{object.kind==='building'&&(isWorldShop3D(object)||object.style==='plot')&&<div className="mt-3"><label className="text-xs font-semibold">{object.style==='plot'?'Plot name':'Shop name'}<input aria-label="Shop name" maxLength={60} value={shopName} onChange={e=>setShopName(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><button className={`${button} mt-1 bg-teal-50`} onClick={()=>apply(renameTownShop3D(draft,object.id,shopName))}>Apply name</button></div>}{object.style==='plot'&&<button className={`${button} mt-2 w-full bg-violet-700 text-white`} onClick={()=>{if(!normalizeTownLayout3D(record.data).buildings[object.id]){setMessage('Save Town first, then click this plot to review applications.');return;}keys.current.clear();setReviewPlot(object.id);}}>View applications</button>}{isWorldShop3D(object)&&<button className={`${button} mt-2 w-full bg-violet-700 text-white`} onClick={()=>{if(draft.buildings[object.id]&&!normalizeTownLayout3D(record.data).buildings[object.id]){setMessage('Save Town first, then select the shop to manage its products.');return;}keys.current.clear();setProductShop(worldShopCatalogueId3D(object));}}>Manage products</button>}</div></Html>}
   </Canvas>
  </div>
  {reviewPlot&&<MerchantCenter3D initialPlot={reviewPlot} request={request} admin onClose={()=>{setReviewPlot(null);setMessage('After approving a shop, reload the property before making more town edits.');}}/>}
  {productShop&&<ShopProductsEditor3D shop={productShop} request={request} onClose={()=>setProductShop(null)}/>}
  <FarmCameraControls3D indoor onAction={action=>{view.current=adjustFarmCamera3D(view.current,action);}}/>
  <aside aria-label="Customize shared Town" className="game-editor-panel absolute bottom-4 left-1/2 z-40 w-[min(96vw,760px)] -translate-x-1/2 rounded-2xl border border-white/80 bg-[#fafbf6]/95 p-4 text-slate-800 shadow-xl backdrop-blur-md">
   <div className="flex items-center justify-between"><div><h2 className="font-bold">Build H2H Town</h2><p className="text-xs text-slate-600">Shared world · Admin only · Your character stays still</p></div><span className="text-xs text-teal-800">{history.length?'Unsaved changes':'Town editor'}</span></div>
   <div className="mt-3 flex gap-2">{(['select','building'] as const).map(value=><button aria-pressed={tool===value} key={value} onClick={()=>{setTool(value);setMoving(false);setSelected(null);setHovered(null);setTile(null);setMessage(value==='building'?'Choose a building, then click clear land. R rotates the preview.':'Click an object in Town to move, rotate or delete it.');}} className={`${button} ${tool===value?'bg-teal-700 text-white':'border bg-white'}`}><span aria-hidden="true">{value==='select'?'↖':'⌂'}</span> {value==='select'?'Select':'Buildings'}</button>)}</div>
   {tool==='building'&&<div role="group" aria-label="Town building styles" className="mt-3 flex flex-wrap gap-2">{TOWN_BUILDING_CATALOG_3D.filter(spec=>spec.id!=='h2h').map(spec=><button key={spec.id} aria-pressed={style===spec.id} onClick={()=>setStyle(spec.id)} className={`flex items-center gap-2 rounded-xl border bg-white p-2 text-xs font-semibold ${style===spec.id?'border-teal-700 text-teal-900':'border-slate-200'}`}><img src={spec.preview} alt={`${spec.name} preview`} width={72} height={54} className="h-14 w-18 object-contain"/>{spec.name}</button>)}</div>}
   <p role="status" className="my-3 text-xs text-slate-600">{previewResult&&!previewResult.changed?previewResult.message:message}</p>
   <div className="flex justify-end gap-2"><button disabled={!history.length} className={`${button} bg-slate-100`} onClick={undo}>Undo</button><button className={`${button} bg-slate-100`} onClick={close}>Cancel</button><button className={`${button} bg-teal-700 text-white`} onClick={()=>save(draft)}>Save Town</button></div>
  </aside>
 </>;
}
