import {useState} from 'react';
import AuthModal from '@/components/feature/AuthModal';
import type {GameIdentity3D} from './useGameIdentity3D';

export default function GameLogin3D({account}:{account:GameIdentity3D}){
 const [open,setOpen]=useState(true);
 const checking=account.status==='connecting';
 return <section className="game-login-3d flex items-center justify-center overflow-y-auto bg-[#e8efdf] p-5" aria-label="Game account access">
  <style>{`vapi-widget { display: none !important; }`}</style>
  <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
   <h1 className="text-2xl font-bold text-slate-800">H2H World</h1>
   <p className="my-4 text-sm text-slate-600">Sign in with your H2H website account to enter your farm and play with friends.</p>
   {checking?<p role="status">Checking your H2H session…</p>:<>
    {account.error&&<p role="alert" className="mb-4 text-sm text-red-700">{account.error}</p>}
    <button type="button" onClick={()=>setOpen(true)} className="w-full rounded-xl bg-emerald-800 p-3 font-bold text-white">Sign in to H2H</button>
   </>}
  </div>
  {!checking&&<AuthModal isOpen={open} onClose={()=>setOpen(false)} returnTo="/game-3d"/>}
 </section>;
}
