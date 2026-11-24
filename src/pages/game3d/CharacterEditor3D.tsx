import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useProgress } from '@react-three/drei';
import { BLENDER_REFERENCE_ASSET, BLENDER_REFERENCE_LOOK_KEY, DEFAULT_BLENDER_REFERENCE_LOOK, normalizeBlenderReferenceLook, canApplyMirrorModel, type MirrorEditorModel3D } from './blenderReference3D';
import FaceSections3D from './FaceSections3D';
import MirrorHumanPreview3D from './MirrorHumanPreview3D';
import type { FarmerAppearance3D } from './game3d';
import FarmerModel3D from './FarmerModel3D';
import { selectCharacter3D, type CharacterChoice3D } from './characterChoice3D';
import { DEFAULT_MIRROR_LOOK, MIRROR_LOOK_KEY, normalizeMirrorLook, MIRROR_PHYSIQUE_CONTROLS, MIRROR_PHYSIQUE_PRESETS, applyMirrorPreset, type MirrorPhysiqueControl, type MirrorFaceControl, type MirrorLook3D } from './mirrorAppearance3D';


const PHYSIQUE_LABELS: Record<MirrorPhysiqueControl, string> = { bodyFat: 'Body fullness', muscle: 'Muscularity', shoulders: 'Shoulder width', chest: 'Chest size', waist: 'Waist size', hips: 'Hip width', arms: 'Arm size', legs: 'Leg size' };

function PreviewCamera({ closeUp, height, angle, elevation, onOrbit }: { closeUp: boolean; height: number; angle: number; elevation: number; onOrbit: (yaw: number, pitch: number) => void }) {
  const { camera, size } = useThree();
  const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const targetY = (closeUp ? 1.70 : 0.95) * height;
  useEffect(() => {
    camera.position.set(6 * Math.cos(elevation) * Math.sin(angle), targetY + 6 * Math.sin(elevation), 6 * Math.cos(elevation) * Math.cos(angle));
    camera.lookAt(0, targetY, 0);
    orbit.current?.target.set(0, targetY, 0);
    orbit.current?.update();
  }, [camera, targetY, angle, elevation]);
  useEffect(() => {
    if ('zoom' in camera) camera.zoom = closeUp ? Math.min(850, size.height / (0.48 * height)) : Math.min(200, size.height / (2.15 * height));
    camera.updateProjectionMatrix();
  }, [camera, size.height, closeUp, height]);
  return <OrbitControls ref={orbit} target={[0, targetY, 0]} enablePan={false} minZoom={70} maxZoom={850} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI * 0.65} onEnd={() => {
    const dx=camera.position.x, dy=camera.position.y-targetY, dz=camera.position.z;
    onOrbit(Math.atan2(dx,dz),Math.atan2(dy,Math.hypot(dx,dz)));
  }} />;
}

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert" className="p-6 text-sm text-red-800">The character model could not load. Close and reopen the mirror to try again.</p> : this.props.children;
  }
}

function ModelLoadingStatus() {
  const { active } = useProgress();
  return active ? <p role="status" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white/90 p-3 text-sm">Loading character…</p> : null;
}

function OriginalFarmerPreview({appearance,walking}:{appearance:FarmerAppearance3D;walking:boolean}) {
  const movement=useRef({moving:false,running:false});
  useEffect(()=>{movement.current={moving:walking,running:false};},[walking]);
  return <FarmerModel3D appearance={appearance} movement={movement} selectedTool={null} action="hoe" actionUntil={0} />;
}

export default function CharacterEditor3D({ appearance, choice, onApply, onClose }: {
  appearance: FarmerAppearance3D;
  choice: CharacterChoice3D;
  onApply: (choice: CharacterChoice3D) => void;
  onClose: () => void;
}) {
  const [existingDraft, setExistingDraft] = useState(() => {
    if (choice.customLook) return { ...choice.customLook };
    try {
      const testLook = localStorage.getItem(MIRROR_LOOK_KEY);
      return testLook ? normalizeMirrorLook(JSON.parse(testLook)) : { ...DEFAULT_MIRROR_LOOK, name: appearance.name };
    } catch { return { ...DEFAULT_MIRROR_LOOK, name: appearance.name }; }
  });
  const [referenceDraft,setReferenceDraft]=useState(()=>{
    try { return normalizeBlenderReferenceLook(JSON.parse(localStorage.getItem(BLENDER_REFERENCE_LOOK_KEY)||'null')); }
    catch { return {...DEFAULT_BLENDER_REFERENCE_LOOK}; }
  });
  const [testMessage, setTestMessage] = useState('New Blender likeness study. Mirror preview only; the world character is unchanged.');
  const [selectedModel,setSelectedModel]=useState<MirrorEditorModel3D>('reference');
  const draft=selectedModel==='reference'?referenceDraft:existingDraft;
  const setDraft=selectedModel==='reference'?setReferenceDraft:setExistingDraft;
  const defaults = selectedModel==='reference'?DEFAULT_BLENDER_REFERENCE_LOOK:DEFAULT_MIRROR_LOOK;
  const [angle, setAngle] = useState(0.25);
  const [elevation, setElevation] = useState(0);
  const [tab, setTab] = useState('Face');
  const [closeUp, setCloseUp] = useState(true);
  const [walking, setWalking] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  const slider = (key: MirrorFaceControl | MirrorPhysiqueControl | 'height' | 'build', label: string) => <label className="block text-sm font-semibold">{label} · {key === 'eyeTilt' || key === 'chinAngle' ? `${Math.round((draft[key]-1)/.15*1.4*(key==='eyeTilt'?.18:.22)*180/Math.PI)}°` : `${Math.round(draft[key] * 100)}%`}<input aria-label={label} type="range" min="0.85" max="1.15" step="0.01" value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: Number(event.target.value) }))} className="mt-2 w-full accent-teal-700" /></label>;
  const colour = (key: 'skin' | 'hair' | 'jacket' | 'trousers' | 'shoes', label: string, palette: string[]) => {
    const flag = key === 'skin' ? 'skinTint' : key === 'hair' ? 'hairTint' : 'clothesTint';
    const change = (value: string) => setDraft(current => ({ ...current, [key]: value, [flag]: true }));
    return <div className="space-y-2"><label className="flex items-center justify-between text-sm font-semibold">{label}<input type="color" aria-label={label} value={draft[key]} onChange={event => change(event.target.value)} className="h-8 w-10 cursor-pointer rounded" /></label><div className="flex flex-wrap gap-2">{palette.map(value => <button type="button" key={value} aria-label={`${label} ${value}`} aria-pressed={draft[flag] && draft[key] === value} onClick={() => change(value)} className={`h-7 w-7 rounded-full border-2 ${draft[flag] && draft[key] === value ? 'border-teal-800 ring-2 ring-teal-200' : 'border-white'}`} style={{ background: value }} />)}</div></div>;
  };
  const outfit = (name: string, jacket: string, trousers: string, shoes: string) => <button type="button" key={name} onClick={() => setDraft(current => ({ ...current, jacket, trousers, shoes, clothesTint: true }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><span className="mb-1 flex gap-1">{[jacket, trousers, shoes].map((color, i) => <span key={i} className="h-3 w-5 rounded" style={{ background: color }} />)}</span>{name}</button>;

  return createPortal(<div className="fixed inset-0 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm" style={{ zIndex: 2147483647 }}>
    <section role="dialog" aria-modal="true" aria-label="Customize your character" className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[#f8faf5] text-slate-800 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Character mirror</p><h2 className="text-xl font-bold">Choose your character</h2><p role="status" className="mt-1 text-xs text-slate-500">{testMessage}</p></div><button type="button" onClick={onClose} aria-label="Close character editor" className="rounded-full bg-white px-3 py-2">✕</button></header>
      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-2">
        <div className={`relative flex min-h-[280px] flex-col bg-gradient-to-b ${selectedModel==='reference'?'from-[#dce1e5] to-[#f0f1ed]':'from-[#d9eae3] to-[#eef4e8]'} md:sticky md:top-0 md:self-start`}>
          <div className={selectedModel==='reference'?'h-[340px] md:h-[min(480px,52vh)]':'h-[290px] md:h-[min(380px,40vh)]'}>
            <PreviewBoundary>
              <Canvas orthographic camera={{ position: [0, 1.1, 6], zoom: 100, near: 0.1, far: 30 }} onCreated={({ camera, size }) => { camera.zoom = Math.min(145, size.height / 2.5); camera.updateProjectionMatrix(); camera.lookAt(0, 0.95, 0); }} dpr={[1, 1.5]}>
                <hemisphereLight intensity={selectedModel==='reference'?.65:1.5} /><directionalLight position={[3, 5, 4]} intensity={selectedModel==='reference'?1.15:2} /><directionalLight position={[-3, 2, -2]} intensity={0.7} />
                <Suspense fallback={null}>
                  {selectedModel==='reference'&&<Environment resolution={128} frames={1} environmentIntensity={.55}>
                    <Lightformer form="rect" intensity={2.5} color="#fff1e0" position={[-3,3,4]} target={[0,0,0]} scale={[3,4,1]} />
                    <Lightformer form="rect" intensity={1.3} color="#e2ecff" position={[3,1,2]} target={[0,0,0]} scale={[2,3,1]} />
                    <Lightformer form="rect" intensity={2} color="#ffffff" position={[0,4,-3]} target={[0,0,0]} scale={[3,2,1]} />
                  </Environment>}
                  <group>{selectedModel!=='farmer'?<MirrorHumanPreview3D key={selectedModel} appearance={draft} walking={walking} assetPath={selectedModel==='reference'?BLENDER_REFERENCE_ASSET:undefined} />:<OriginalFarmerPreview appearance={appearance} walking={walking} />}</group>
                </Suspense>
                <PreviewCamera closeUp={closeUp} height={draft.height} angle={angle} elevation={elevation} onOrbit={(yaw,pitch) => { setAngle(yaw); setElevation(pitch); }} />
              </Canvas>
            </PreviewBoundary>
            <ModelLoadingStatus />
          </div>
          <div className="flex items-center justify-center gap-4 pb-4"><button type="button" aria-label="Rotate character left" onClick={() => setAngle(value => value - Math.PI / 4)} className="rounded-full bg-white px-4 py-2 shadow-sm">↶</button><span className="text-xs text-teal-900">Drag to rotate · Scroll to zoom</span><button type="button" aria-label="Rotate character right" onClick={() => setAngle(value => value + Math.PI / 4)} className="rounded-full bg-white px-4 py-2 shadow-sm">↷</button></div>
          <div className="flex flex-wrap items-center justify-center gap-2 px-2 pb-4"><div className="flex gap-2">{['Face view', 'Full body'].map((label, i) => <button type="button" key={label} aria-pressed={closeUp === (i === 0)} onClick={() => { setCloseUp(i === 0); setAngle(0); }} className="rounded-xl bg-white px-3 py-2 text-xs text-teal-900">{label}</button>)}</div><div role="group" aria-label="Preview animation" className="flex items-center gap-2"><span className="text-xs text-teal-900">Animation</span>{['Idle', 'Walk'].map((label, i) => <button key={label} type="button" aria-pressed={walking === (i === 1)} onClick={() => { setWalking(i === 1); if (i === 1) { setCloseUp(false); setAngle(0.35); } }} className={`rounded-xl px-4 py-2 text-xs font-semibold ${walking === (i === 1) ? 'bg-teal-700 text-white' : 'bg-white text-teal-900'}`}>{label}</button>)}</div></div>

        </div>
        <div className="space-y-5 p-5">
          <div><h3 className="font-bold">Character selection</h3><p className="mt-2 text-sm text-slate-600">Compare the Blender portrait study with your existing characters. Edit the preview below.</p></div>
          <div role="group" aria-label="Character model" className="grid grid-cols-2 gap-2">{([['reference','Blender portrait'],['custom','Existing character'],['farmer','Original farmer']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={selectedModel===id} onClick={()=>{setSelectedModel(id);setCloseUp(false);setAngle(.25);setTestMessage(id==='reference'?'Mirror preview only. Your world character is unchanged.':'Preview ready. Choose Use selected character to apply it.');}} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${selectedModel===id?'border-teal-700 bg-teal-50 text-teal-900':'border-slate-200 bg-white'}`}>{label}{id==='reference'&&<span className="mt-1 block text-xs font-normal">Mirror only</span>}{choice.model===id&&<span className="mt-1 block text-xs font-normal">Currently in use</span>}</button>)}</div>
          {selectedModel==='farmer'&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The original farmer keeps its saved appearance. Select Existing character to edit the face, hair and clothes.</p>}
          {selectedModel!=='farmer'&&<>
          <label className="block text-sm font-bold">Character name<input value={draft.name} maxLength={32} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" /></label>
          <div role="tablist" aria-label="Mirror appearance categories" className="flex gap-1 rounded-xl bg-slate-100 p-1">{['Face', 'Hair', 'Clothes', 'Physique'].map(name => <button type="button" role="tab" aria-selected={tab === name} key={name} onClick={() => { setTab(name); setCloseUp(name === 'Face' || name === 'Hair'); setAngle(0); }} className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${tab === name ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}>{name}</button>)}</div>
          <div role="tabpanel" aria-label={tab} className="space-y-4">
            {tab === 'Face' && <><FaceSections3D look={draft} setLook={setDraft} slider={slider}/>{colour('skin', 'Skin tone', ['#efd4ba', '#d9b398', '#b6815d', '#845438', '#51362a'])}</>}
            {tab === 'Hair' && <><label className="block text-sm font-semibold">Hairstyle<select aria-label="Hairstyle" value={draft.hairstyle} onChange={event => setDraft(current => ({ ...current, hairstyle: event.target.value as MirrorLook3D['hairstyle'] }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2"><option value="swept">Sculpted sweep</option><option value="short">Short</option><option value="bob">Bob</option><option value="curly">Curly</option><option value="bald">Bald</option></select></label>{colour('hair', 'Hair colour', ['#211b18', '#563c2c', '#a16b3a', '#d5b77c', '#bfc1c0', '#783b35'])}<button type="button" onClick={() => setDraft(current => ({ ...current, hairstyle: 'swept', hair: defaults.hair, hairTint: defaults.hairTint }))} className="text-xs text-teal-800 underline">Restore reference hair</button></>}
            {tab === 'Clothes' && <><label className="block text-sm font-semibold">Outfit<select aria-label="Outfit" value={draft.outfit} onChange={event => setDraft(current => ({ ...current, outfit: event.target.value as MirrorLook3D['outfit'] }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2"><option value="reference">Mountain tee & jeans</option><option value="casual">Casual shirt & trousers</option><option value="work">Work overalls</option></select></label><p className="text-xs text-slate-500">Switch fitted outfits and choose your colours. The shirt artwork is a separate, replaceable texture.</p><div className="flex flex-wrap gap-2">{outfit('Country', '#596846', '#557c9e', '#95643c')}{outfit('Midnight', '#273342', '#333844', '#34302e')}{outfit('Autumn', '#985239', '#87715b', '#563d2e')}</div>{colour('jacket', 'Top colour', ['#596846', '#375774', '#985239', '#f4f0e5', '#35383c'])}{colour('trousers', 'Trouser colour', ['#557c9e', '#283e58', '#87715b', '#45464b'])}{colour('shoes', 'Shoe colour', ['#95643c', '#563d2e', '#34302e', '#b4a082'])}<button type="button" onClick={() => setDraft(current => ({ ...current, outfit: 'reference', clothesTint: false }))} className="text-xs text-teal-800 underline">Restore reference outfit</button></>}
            {tab === 'Physique' && <><p className="text-xs text-slate-500">Choose a starting build, then adjust individual body proportions. Clothes follow your shape.</p><div role="group" aria-label="Physique presets" className="flex flex-wrap gap-2">{MIRROR_PHYSIQUE_PRESETS.map(preset => <button key={preset.name} type="button" onClick={() => setDraft(current => applyMirrorPreset(current, 'physique', preset.name))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">{preset.name}</button>)}</div>{slider('height', 'Height')}{slider('build', 'Overall width')}{MIRROR_PHYSIQUE_CONTROLS.map(key => <div key={key}>{slider(key, PHYSIQUE_LABELS[key])}</div>)}<button type="button" onClick={() => setDraft(current => ({ ...applyMirrorPreset(current, 'physique', 'Balanced'), height: 1, build: 1 }))} className="text-xs text-teal-800 underline">Reset physique</button></>}
          </div>
          <p className="text-xs text-slate-500">Base, face targets, hair and clothing: <a href="https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html" target="_blank" rel="noreferrer" className="underline">MakeHuman Community</a> · CC0 public domain.</p>
          </>}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setDraft({ ...defaults })} className="text-sm text-slate-500">Reset preview</button><div className="flex flex-wrap gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Close preview</button><button type="button" onClick={() => {
        try { localStorage.setItem(selectedModel==='reference'?BLENDER_REFERENCE_LOOK_KEY:MIRROR_LOOK_KEY, JSON.stringify(normalizeMirrorLook(draft))); setTestMessage(selectedModel==='reference'?'Reference preview saved separately. Your world character is unchanged.':'Preview saved. Choose Use selected character to apply it.'); }
        catch { setTestMessage('Preview could not be saved in this browser.'); }
      }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Save preview</button><button type="button" disabled={!canApplyMirrorModel(selectedModel)} onClick={()=>{if(!canApplyMirrorModel(selectedModel))return;const next=selectCharacter3D(choice,selectedModel,draft);onApply(next);setTestMessage(`${selectedModel==='custom'?'New character':'Original farmer'} is now in use. You can switch back here anytime.`);}} className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-500">{selectedModel==='reference'?'Mirror preview only':'Use selected character'}</button></div></footer>
    </section>
  </div>, document.body);
}
