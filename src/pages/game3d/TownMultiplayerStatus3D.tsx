import type { useTownMultiplayer3D } from './useTownMultiplayer3D';

export default function TownMultiplayerStatus3D({town}:{town:ReturnType<typeof useTownMultiplayer3D>}) {
  const count=Object.keys(town.peers).length+(town.status==='online'?1:0);
  return <div className="game-connection" role="status" aria-label="Town multiplayer status">
    {!town.available ? 'Multiplayer test requires local Supabase in development.' : town.status==='online'
      ? <><span className="font-bold text-teal-800">● {count} {count===1?'player':'players'} online</span><div className="mt-1">Local town · You: {town.name}</div></>
      : <><span>{town.status==='error'?'Local multiplayer unavailable':town.status==='reconnecting'?'Reconnecting to local town…':'Connecting to local town…'}</span>
        {(town.status==='error'||town.status==='offline')&&<><p className="mt-1 max-w-xs break-words">{town.error||'Connection lost.'}</p><button className="mt-1 font-bold underline" onClick={town.retry}>Reconnect</button></>}</>}
  </div>;
}
