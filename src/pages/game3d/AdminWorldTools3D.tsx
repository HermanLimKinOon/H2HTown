import TownEditor3D from './TownEditor3D';
import {useEffect,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import World3D from './World3D';
import {TravelGate3D} from './TownWorld3D';
import PlayerHouse3D from './PlayerHouse3D';
import HouseEditScene3D from './HouseEditScene3D';
import HouseEditorPanel3D from './HouseEditorPanel3D';
import FarmEditor3D from './FarmEditor3D';
import FarmObjectMenu3D from './FarmObjectMenu3D';
import {useHouseEditor3D} from './useHouseEditor3D';
import {freshGame3DSave,normalizeGame3DSave} from './game3d';
import {normalizeHouseLayout3D} from './houseCustomization3D';
import {applyFarmEdit3D,moveFarmObject3D,rotateFarmObject3D,deleteFarmObject3D,getFarmObject3D,type FarmEditTool3D,type FarmHouseStyle3D} from './farmCustomization3D';
import type {WorldEditRecord3D} from './useWorldEditing3D';
type Request=(action:string,world?:string,data?:unknown,version?:number|null)=>Promise<any>;
type FarmEntry={owner:string;name:string;houses:string[]};
const nothing=()=>{};
const button='rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40';

function FarmTools({record,save,close}:{record:WorldEditRecord3D;save:(data:unknown)=>void;close:()=>void}){
 const [draft,setDraft]=useState(()=>({...normalizeGame3DSave({...freshGame3DSave(),...(record.data as object)}),farmPausedAt:Date.now()}));
 const [tool,setTool]=useState<FarmEditTool3D>('select'),[style,setStyle]=useState<FarmHouseStyle3D>('cottage'),[selected,setSelected]=useState<string|null>(null),[moving,setMoving]=useState(false),[angle,setAngle]=useState(0),[message,setMessage]=useState('Select an object or choose a building category.'),[history,setHistory]=useState<typeof draft[]>([]);
 const apply=(result:ReturnType<typeof applyFarmEdit3D>)=>{if(result.changed){setHistory(old=>[...old.slice(-29),draft]);setDraft(result.state);}setMessage(result.message);};
 const rotate=()=>{if(selected&&!moving)apply(rotateFarmObject3D(draft,selected));else setAngle(a=>(a+1)%4);};
 const rotation=useRef(rotate);rotation.current=rotate;
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==='r'&&!(e.target instanceof HTMLInputElement)){e.preventDefault();rotation.current();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const select=(id:string)=>{if(tool==='select'&&!moving){setSelected(id);setAngle(getFarmObject3D(draft.farmLayout,id)?.rotation??0);}};
 const ground=(key:string,mouse:number)=>{if(mouse!==0)return;if(moving&&selected){const result=moveFarmObject3D(draft,selected,key,angle);apply(result);if(result.changed)setMoving(false);}else if(tool!=='select')apply(applyFarmEdit3D(draft,tool,key,angle,style));};
 return <>
  <Canvas shadows camera={{position:[26,30,30],fov:48}}><World3D save={draft} now={Date.now()} editing onGroundSelect={ground} onTreeSelect={select} onObjectSelect={select} onHouseEnter={select} onShopSelect={nothing} onCoopSelect={select}/><TravelGate3D editing transform={draft.farmLayout.portal} onSelect={()=>select('portal')} onTravel={nothing}/><OrbitControls makeDefault maxPolarAngle={Math.PI*.47}/>
   {selected&&!moving&&<FarmObjectMenu3D selection={selected} layout={draft.farmLayout} onClose={()=>setSelected(null)} onMove={()=>setMoving(true)} onDelete={()=>{apply(deleteFarmObject3D(draft,selected));setSelected(null);}}/>}
  </Canvas>
  <div className="absolute left-3 top-3 rounded bg-white p-3 text-xs">Drag to orbit · Scroll to zoom · Right-drag to pan · R to rotate {selected&&<button className={button} onClick={rotate}>Rotate selection</button>}</div>
  <FarmEditor3D tool={tool} houseStyle={style} dirty canUndo={history.length>0} message={moving?'Click a clear destination tile.':message} onTool={value=>{setTool(value);setSelected(null);setMoving(false);}} onHouseStyle={setStyle} onUndo={()=>{const last=history.at(-1);if(last){setDraft(last);setHistory(history.slice(0,-1));}}} onSave={()=>save({farmLayout:draft.farmLayout})} onCancel={close}/>
 </>;
}
function HouseTools({record,save,close}:{record:WorldEditRecord3D;save:(data:unknown)=>void;close:()=>void}){
 const [base]=useState(()=>({...freshGame3DSave(),worldId:'house' as const,interiorHouseId:record.world.split(':')[2],houseLayouts:{[record.world.split(':')[2]]:normalizeHouseLayout3D(record.data)}}));
 const editor=useHouseEditor3D(base,nothing,nothing,true),started=useRef(false);
 useEffect(()=>{if(!started.current){started.current=true;editor.start();}},[editor]);
 const actions={...editor,save:()=>save(editor.layout),cancel:close};
 return <><Canvas shadows camera={{position:[12,14,14],fov:48}}><PlayerHouse3D layout={editor.layout} editor={actions} onGround={nothing} onExit={nothing} onMirror={nothing}/><HouseEditScene3D editor={actions}/><OrbitControls makeDefault maxPolarAngle={Math.PI*.47}/></Canvas><HouseEditorPanel3D editor={actions} houseId={base.interiorHouseId}/></>;
}
export default function AdminWorldTools3D({request,onClose}:{request:Request;onClose:()=>void}){
 const [farms,setFarms]=useState<FarmEntry[]>([]),[world,setWorld]=useState('town'),[record,setRecord]=useState<WorldEditRecord3D|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let stopped=false;void request('list').then(list=>{if(!stopped)setFarms(list);}).catch(e=>{if(!stopped)setError(e.message);});return()=>{stopped=true;};},[request]);
 useEffect(()=>{let stopped=false;setRecord(null);setError('');void request('read',world).then(next=>{if(!stopped)setRecord(next);}).catch(e=>{if(!stopped)setError(e.message);});return()=>{stopped=true;};},[request,world]);
 const persist=async(data:unknown)=>{if(busy||!record)return;setBusy(true);setError('');try{setRecord(await request('save',record.world,data,record.version));setError('Saved. Everyone will receive the updated layout.');}catch(e){setError(e instanceof Error?e.message:'Save failed.');}finally{setBusy(false);}};
 return <div data-admin-tools role="dialog" aria-modal="true" aria-label="Admin world editor" className="absolute inset-0 z-[100] flex flex-col bg-slate-900 text-white">
  <header className="flex flex-wrap items-center gap-3 bg-slate-800 p-3 text-sm"><strong>Admin · World editor</strong><select aria-label="World to edit" value={world} disabled={busy} onChange={e=>setWorld(e.target.value)} className="max-w-[55vw] rounded bg-slate-700 p-2"><option value="town">H2H Town</option>{farms.map(f=><optgroup key={f.owner} label={`${f.name} · ${f.owner.slice(0,8)}`}><option value={`farm:${f.owner}`}>{f.name} · Farm</option>{f.houses.map(id=><option key={id} value={`house:${f.owner}:${id}`}>{f.name} · {id==='house'?'House':id}</option>)}</optgroup>)}</select><button className="ml-auto rounded bg-white/10 px-3 py-2" onClick={onClose}>Close editor</button></header>
  <div className="relative min-h-0 flex-1">{record?.world===world&&(world==='town'?<TownEditor3D request={request} close={onClose} key={`${world}:${record.version}`} record={record} save={data=>void persist(data)}/>:world.startsWith('house:')?<HouseTools key={`${world}:${record.version}`} record={record} save={data=>void persist(data)} close={onClose}/>:<FarmTools key={`${world}:${record.version}`} record={record} save={data=>void persist(data)} close={onClose}/>)}{!record&&<p className="p-6">Loading property…</p>}{busy&&<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">Saving…</div>}</div>
  {error&&<div role="status" className="bg-slate-800 p-3 text-sm">{error}<button className="ml-4 underline" onClick={()=>{setRecord(null);void request('read',world).then(setRecord).catch(e=>setError(e.message));}}>Reload property</button></div>}
 </div>;
}
