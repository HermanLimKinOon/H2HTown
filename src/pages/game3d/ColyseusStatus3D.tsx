import type {useColyseusMultiplayer3D} from './useColyseusMultiplayer3D';
export default function ColyseusStatus3D({model,world,sessionError='',retrySession,friends=false}:{model:ReturnType<typeof useColyseusMultiplayer3D>;world:string;sessionError?:string;retrySession?:()=>void;friends?:boolean}){
 const error=model.available?model.error:sessionError;
 return <div role="status" aria-label="Local Colyseus multiplayer" className="game-connection">
  <span className={`font-bold ${model.status==='online'?'text-teal-800':'text-amber-800'}`}>● {!model.available?'Preparing local session…':model.status==='online'?`${model.roomCount} ${model.roomCount===1?'player':'players'} here`:model.status==='error'||model.status==='offline'?'Server unavailable':'Connecting…'}</span>
  <details><summary>Connection details</summary><div className="mt-1">{friends?'Friends':'Local'} {world} · {model.limit||10}-player beta · You: {model.name}</div>
  {error&&<p className="mt-1 break-words">{error}</p>}
{!friends&&<div className="mt-1 flex gap-3"><a className="underline" href="/game-3d?townTest=1" target="_blank" rel="noopener noreferrer">Test player 1</a><a className="underline" href="/game-3d?townTest=2" target="_blank" rel="noopener noreferrer">Test player 2</a></div>}
  <p className="mt-1 text-[10px] text-slate-500">{friends?'Meet your friends in H2H Town':'Separate accounts · Meet in H2H Town'}</p>
 </details>
  {!model.available&&error&&retrySession&&<button type="button" className="mt-1 font-bold underline" onClick={retrySession}>Reconnect session</button>}
  {model.available&&(model.status==='offline'||model.status==='error')&&<button type="button" className="mt-1 font-bold underline" onClick={model.retry}>Reconnect</button>}
 </div>;
}
