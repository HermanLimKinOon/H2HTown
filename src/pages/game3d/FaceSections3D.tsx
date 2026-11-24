import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { FACE_SECTIONS, EYE_COLOURS, applyFaceSectionTemplate, type MirrorFaceControl, type MirrorLook3D } from './mirrorAppearance3D';

function TemplateSketch({ section, variant }: { section: string; variant: number }) {
  const width=[23,21,20,26][variant];
  const arch=variant===2?4:variant===1?0:2;
  return <svg viewBox="0 0 80 84" aria-hidden="true" className="mx-auto h-16 w-16">
    <path d={`M${40-width} 32 Q${40-width-4} 6 40 7 Q${44+width} 6 ${40+width} 32 L${38+width} 53 Q${variant===3?55:49} 76 40 77 Q${variant===3?25:31} 76 ${42-width} 53Z`} fill="#ead2bc" stroke="#a58b77" strokeWidth="1.2" />
    <g stroke={section==='brow'?'#285e56':'#6d594a'} strokeWidth={section==='brow'?2.3:1.5} fill="none"><path d={`M24 31 Q30 ${29-arch} 35 31 M45 31 Q50 ${29-arch} 56 31`} /></g>
    <g stroke={section==='eyes'?'#285e56':'#6d594a'} fill="white" strokeWidth="1.2"><ellipse cx="29.5" cy="38" rx={variant===1?7:5.5} ry={variant===2?4:2.8}/><ellipse cx="50.5" cy="38" rx={variant===1?7:5.5} ry={variant===2?4:2.8}/></g><g fill="#49392d"><circle cx="30" cy="38" r="1.8"/><circle cx="50" cy="38" r="1.8"/></g>
    <path d={`M40 40 l${variant===3?5:3} ${variant===2?12:9} q-3 3 -6 0`} fill="none" stroke={section==='nose'?'#285e56':'#ab8a72'} strokeWidth={section==='nose'?2:1.2}/>
    <path d={`M${variant===2?30:32} 59 Q40 ${variant===3?66:61} ${variant===2?50:48} 59`} fill="none" stroke={section==='mouth'?'#285e56':'#a96c65'} strokeWidth={variant===1?3:1.8}/>
    {section==='jaw'&&<path d={`M${42-width} 53 Q29 76 40 77 Q51 76 ${38+width} 53`} fill="none" stroke="#285e56" strokeWidth="2"/>}
  </svg>;
}

export default function FaceSections3D({look,setLook,slider}:{look:MirrorLook3D;setLook:Dispatch<SetStateAction<MirrorLook3D>>;slider:(key:MirrorFaceControl,label:string)=>ReactNode}) {
  const [active,setActive]=useState('full');
  const section=FACE_SECTIONS.find(section=>section.id===active)!;
  return <div className="space-y-4">
    <div role="tablist" aria-label="Facial sections" className="sticky top-0 z-10 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{FACE_SECTIONS.map(item=><button type="button" role="tab" key={item.id} aria-selected={active===item.id} onClick={()=>setActive(item.id)} className={`rounded-lg px-2 py-2 text-xs font-semibold ${active===item.id?'bg-white text-teal-800 shadow-sm':'text-slate-600'}`}>{item.name}</button>)}</div>
    <div role="tabpanel" aria-label={section.name} className="space-y-4">
      <div><h3 className="text-sm font-bold">{section.name} templates</h3><p className="mt-1 text-xs text-slate-500">Choose a starting shape, then refine its details below. Other sections stay as you set them.</p></div>
      <div role="group" aria-label={`${section.name} templates`} className="grid grid-cols-4 gap-2">{section.templates.map((template,index)=>{
        const selected=section.controls.every(({key})=>Math.abs(look[key]-(template.values[key]??1))<.0001);
        return <button type="button" key={template.name} aria-pressed={selected} onClick={()=>setLook(current=>applyFaceSectionTemplate(current,section.id,template.name))} className={`rounded-xl border px-1 py-2 text-xs font-semibold ${selected?'border-teal-700 bg-teal-50 text-teal-900':'border-slate-200 bg-white text-slate-700'}`}><TemplateSketch section={section.id} variant={index}/>{template.name}</button>;
      })}</div>
      {section.id==='eyes'&&<div><p className="mb-2 text-sm font-semibold">Eye colour</p><div className="flex flex-wrap gap-3">{EYE_COLOURS.map(colour=><button type="button" key={colour.name} aria-label={`Eye colour: ${colour.name}`} aria-pressed={look.eyeColor===colour.value} onClick={()=>setLook(current=>({...current,eyeColor:colour.value}))} className="text-center text-[10px]"><span className={`mx-auto mb-1 block h-8 w-8 rounded-full border-2 ${look.eyeColor===colour.value?'border-teal-700 ring-2 ring-teal-200':'border-white'}`} style={{background:colour.value}}/>{colour.name}</button>)}</div></div>}
      {section.controls.map(control=><div key={control.key}>{slider(control.key,control.label)}</div>)}
      <button type="button" onClick={()=>setLook(current=>applyFaceSectionTemplate(current,section.id,section.templates[0].name))} className="text-xs text-teal-800 underline">Reset {section.name.toLowerCase()}</button>
    </div>
  </div>;
}
