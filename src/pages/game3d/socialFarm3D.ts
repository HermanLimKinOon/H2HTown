import {normalizeGame3DSave,freshGame3DSave} from './game3d';
import type {Game3DSave,Position3} from './game3d';
import type {FarmSnapshot3D,SharedFarmData3D} from './socialFarmTypes3D';
import {townPeersFromPresence3D,type TownPeers3D} from './townMultiplayer3D';
export function farmSnapshotData3D(save:Game3DSave):SharedFarmData3D {
 const {farmLayout,soil,plants,choppedTrees,growth,chickens,farmPausedAt}=save;
 return {farmLayout,soil,plants,choppedTrees,growth,chickens,farmPausedAt};
}
export function ownedFarmSnapshot3D(own:Game3DSave,farm:FarmSnapshot3D,selfId:string):Game3DSave {
 if(farm.owner_id!==selfId)return own;
 const count=Math.max(0,Math.floor(farm.harvested_carrots));
 const recorded=own.sharedFarmHarvests?.[selfId]??0;
 return {...own,...farm.snapshot,inventory:{...own.inventory,carrot:own.inventory.carrot+Math.max(0,count-recorded)},sharedFarmHarvests:{...own.sharedFarmHarvests,[selfId]:Math.max(recorded,count)}};
}
export function visitFarmView3D(own:Game3DSave,farm:FarmSnapshot3D,player:Position3):Game3DSave {
 return {...own,...farm.snapshot,worldId:'farm',player,interiorHouseId:'house',cats:[],houseLayouts:{}};
}
export function keepVisitorPersonal3D(own:Game3DSave,view:Game3DSave):Game3DSave {
 return {...own,inventory:view.inventory,coins:view.coins,hotbar:view.hotbar,bag:view.bag,selectedSlot:view.selectedSlot,appearance:view.appearance};
}
export function farmPeers3D(farm:FarmSnapshot3D,selfId:string,now=Date.now()):TownPeers3D {
 const presence=Object.fromEntries((farm.occupants??[]).filter(peer=>peer.userId!==selfId).map(peer=>[peer.clientId,[peer]]));
 return townPeersFromPresence3D(presence,'',now);
}

export function loadOwnedFarm3D(storage:Pick<Storage,'getItem'|'setItem'>,baseKey:string,id:string,legacy:Game3DSave):Game3DSave {
 const saved=storage.getItem(`${baseKey}-owner-${id}`),claimed=storage.getItem(`${baseKey}-legacy-owner`);
 const result=saved?normalizeGame3DSave(JSON.parse(saved)):!claimed||claimed===id?legacy:freshGame3DSave();
 if(!claimed)storage.setItem(`${baseKey}-legacy-owner`,id);
 return result;
}
