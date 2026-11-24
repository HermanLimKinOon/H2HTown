import type {TownLayout3D} from './townCustomization3D';
import type {FarmerAppearance3D} from './game3d';
import type {CharacterChoice3D} from './characterChoice3D';
import type {FarmLayout3D} from './farmCustomization3D';
import type {TownLocalPose3D,TownPeer3D} from './townMultiplayer3D';
export type ColyseusRoomSession3D={userId:string;name:string;world:string;serverId:string;x:number;z:number;seq:number;leaseId:string;allowInitialPosition:boolean;roomRevision?:number;appearance:FarmerAppearance3D;choice:CharacterChoice3D;blockedUserIds:string[];farmLayout:FarmLayout3D|null;townLayout?:TownLayout3D};
export type ColyseusSnapshot3D={world:string;serverId:string;selfId:string;players:TownPeer3D[];count:number;limit:number;positionWriter?:boolean};
export type ColyseusPose3D=TownLocalPose3D&{seq:number};
