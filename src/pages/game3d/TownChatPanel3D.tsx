import { useEffect,useRef,useState } from 'react';
import type { TownPeer3D } from './townMultiplayer3D';
import { TOWN_CHAT_MAX_3D,townConversation3D } from './townChat3D';
import type {TownChatMessage3D} from './townChat3D';
type LegacyTownChatModel3D={messages:TownChatMessage3D[];chatReady:boolean;sendChat:(text:string,toClientId:string)=>Promise<{ok:boolean;message?:string}>};

export default function TownChatPanel3D({town,partner,inRange,onClose,onFocusChange}:{town:LegacyTownChatModel3D;partner:TownPeer3D|null;inRange:boolean;onClose:()=>void;onFocusChange:(focused:boolean)=>void}) {
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const log=useRef<HTMLDivElement>(null);
  const mounted=useRef(true);
  const partnerId=partner?.clientId;
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[town.messages]);
  useEffect(()=>{if(partnerId&&town.chatReady)input.current?.focus();},[partnerId,town.chatReady]);
  if(!partner)return null;
  const messages=townConversation3D(town.messages,partner.clientId);
  return <section role="dialog" aria-label={`Chat with ${partner.name}`} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}} className="absolute bottom-28 left-3 z-30 w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/70 bg-white/95 text-xs text-slate-700 shadow-lg" onPointerDown={event=>event.stopPropagation()}>
    <div className="flex items-center justify-between bg-teal-900 px-3 py-2 font-bold text-white">
      <span>Chat with {partner.name}</span><button type="button" aria-label="Close player chat" onClick={onClose} className="rounded px-2 py-1 hover:bg-teal-700">×</button>
    </div>
    <>
      <p className="px-3 pt-2 text-[11px] text-slate-500">A conversation with this player while you are nearby.</p>
      <div ref={log} role="log" aria-label="Nearby messages" aria-live="polite" aria-relevant="additions" className="max-h-36 min-h-16 space-y-2 overflow-y-auto px-3 py-2">
        {messages.length===0?<p className="text-slate-400">Say hello to start the conversation.</p>:messages.map(message=><p key={`${message.clientId}:${message.id}`} className="break-words"><span className="font-bold text-teal-800">{message.own?'You':message.name}: </span>{message.text}</p>)}
      </div>
      <form className="border-t border-slate-200 p-2" onSubmit={async event=>{
        event.preventDefault();if(sending||!draft.trim())return;
        const submitted=draft;
        setSending(true);setError('');
        try {
          const result=await town.sendChat(submitted,partner.clientId);
          if(!mounted.current)return;
          if(result.ok)setDraft(current=>current===submitted?'':current);else setError(result.message||'Message could not be sent.');
        }catch{if(mounted.current)setError('Message could not be sent. Try again.');}
        finally{if(mounted.current)setSending(false);}
      }}>
        <div className="flex gap-1.5">
          <input ref={input} aria-label={`Message ${partner.name}`} value={draft} onChange={event=>{setDraft(event.target.value);setError('');}} maxLength={TOWN_CHAT_MAX_3D}
            onFocus={()=>onFocusChange(true)} onBlur={()=>onFocusChange(false)} disabled={!town.chatReady||!inRange} placeholder={town.chatReady?'Say something…':'Connecting chat…'}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 outline-none focus:border-teal-600 disabled:bg-slate-100"/>
          <button type="submit" disabled={!town.chatReady||!inRange||!draft.trim()||sending} className="rounded-lg bg-teal-800 px-3 font-bold text-white disabled:opacity-40">Send</button>
        </div>
        {error?<p role="alert" className="mt-1 text-red-700">{error}</p>:<p className="mt-1 text-[10px] text-slate-500">{!inRange?'This player moved out of range. Click them to walk closer.':`${draft.length}/${TOWN_CHAT_MAX_3D} · Enter to send`}</p>}
      </form>
    </>
  </section>;
}
