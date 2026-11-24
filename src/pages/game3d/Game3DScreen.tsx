import {useMerchantNotifications3D} from './useMerchantNotifications3D';
import GameHUD3D from './GameHUD3D';
import {facingHudTile3D,nearestHudTarget3D} from './hudActions3D';
import MerchantCenter3D from './MerchantCenter3D';
import ShopProductsEditor3D from './ShopProductsEditor3D';
import WorldShopDialog3D from './WorldShopDialog3D';
import {getTownObject3D} from './townCustomization3D';
import {isWorldShop3D,worldShopCatalogueId3D,type WorldShopId3D} from './worldShop3D';
import AdminWorldTools3D from './AdminWorldTools3D';
import {useWorldEditing3D} from './useWorldEditing3D';
import {useHouseWorld3D} from './useHouseWorld3D';
import {townObstacles3D,canEditWorld3D} from './townCustomization3D';
import MobileControls3D from './MobileControls3D';
import type {MobileInput3D} from './touchInput3D';
import {useColyseusMultiplayer3D} from './useColyseusMultiplayer3D';
import ColyseusStatus3D from './ColyseusStatus3D';
import SocialPanel3D from './SocialPanel3D';
import {useSocialFarm3D} from './useSocialFarm3D';
import {ownedFarmSnapshot3D,visitFarmView3D,keepVisitorPersonal3D,loadOwnedFarm3D} from './socialFarm3D';
import type {FarmSnapshot3D,FarmAction3D} from './socialFarmTypes3D';
import MMOChatHUD3D from './MMOChatHUD3D';
import MMOSpeechBubbles3D from './MMOSpeechBubbles3D';
import type {GameIdentity3D} from './useGameIdentity3D';
import {useMmoCommunication3D} from './useMmoCommunication3D';
import type {MmoPlayer3D,MmoPresence3D} from './mmoCommunicationTypes3D';
import { townTestPlayer3D,seedTownTestSave3D } from './townTestSession3D';
import { isLocalTownBackend3D } from './townMultiplayer3D';
import { useTownMultiplayer3D } from './useTownMultiplayer3D';
import type { TownLocalPose3D } from './townMultiplayer3D';
import TownPlayers3D from './TownPlayers3D';
import TownMultiplayerStatus3D from './TownMultiplayerStatus3D';
import { findObjectWalkPath3D, findGroundWalkPath3D, type ObjectWalk3D } from './objectWalk3D';
import ObjectActionMenu3D,{type ObjectMenuState3D} from './ObjectActionMenu3D';
import { houseObjectActions3D,callCat3D,wakeCat3D,type HouseActionTarget3D,type ObjectActionId3D } from './objectActions3D';
import { CAT_CATALOG_3D,returnCat3D } from './cats3D';
import { setCatRest3D,catEnergy3D } from './catSleep3D';
import { fillPetBowl3D,completeCatMeal3D,refundCatMeal3D,petBowlPosition3D } from './petFeeding3D';
import { useHouseEditor3D } from './useHouseEditor3D';
import HouseEditorPanel3D from './HouseEditorPanel3D';
import HouseEditScene3D from './HouseEditScene3D';
import { houseLayoutFor3D,houseObstacles3D,resolveHousePlayer3D,furnitureSize3D,HOUSE_FURNITURE_3D } from './houseCustomization3D';
import HouseCats3D from './HouseCats3D';
import { careForCat3D } from './cats3D';
import CoopDialog3D from './CoopDialog3D';
import { placeChicken3D, feedChickens3D, collectEggs3D, returnChickenToBag3D } from './poultry3D';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import Player3D from './Player3D';
import type { FarmerAction3D } from './FarmerModel3D';
import World3D from './World3D';
import FarmEditor3D from './FarmEditor3D';
import FarmCameraControls3D from './FarmCameraControls3D';
import { adjustFarmCamera3D, freshFarmCamera3D, rotateFarmCamera3D, zoomFarmCamera3D, type FarmCameraAction3D } from './farmCamera3D';
import FarmObjectMenu3D from './FarmObjectMenu3D';
import FarmPlacementPreview3D from './FarmPlacementPreview3D';
import FarmObjectHover3D from './FarmObjectHover3D';
import { isFarmPaintTool3D, startFarmPaint3D, extendFarmPaint3D, type FarmPaintStroke3D } from './farmPaint3D';
import { applyFarmEdit3D, moveFarmObject3D, deleteFarmObject3D, rotateFarmObject3D, getFarmObject3D, getFarmObjectAtTile3D, getFarmTrees3D, getFarmHouses3D, getFarmBuildings3D, canDigFarm3D, farmHouseExit3D, farmObstacles3D, type FarmLayout3D, type FarmEditTool3D, type FarmHouseStyle3D } from './farmCustomization3D';
import TownWorld3D, { TravelGate3D } from './TownWorld3D';
import { TOWN_NPCS_3D, type TownShopId3D } from './townLayout3D';
import { travelWorld3D, walkThroughHouseDoor3D } from './game3d';
import PlayerHouse3D from './PlayerHouse3D';
import CharacterEditor3D from './CharacterEditor3D';
import { CHARACTER_CHOICE_KEY, normalizeCharacterChoice3D } from './characterChoice3D';
import { MIRROR_LOOK_KEY } from './mirrorAppearance3D';
import Hotbar3D from './Hotbar3D';
import Inventory3D from './Inventory3D';
import { pauseFarmTime3D, resumeFarmTime3D, resolveFarmPlayerPosition3D, applyTool3D, chopTree3D, freshGame3DSave, GAME_3D_SAVE_KEY, getCropStage3D, getTreeStage3D, harvestCrop3D, normalizeGame3DSave, type Game3DSave, type Position3, type ToolId3D } from './game3d';
import { LAND_TILES_3D } from './worldLayout';
import { canUseWebGL3D } from './webgl3d';
import { applyCameraZoom3D, isCameraDrag3D, isHighlightedObject3D, isSurroundingTile3D, shouldSuppressWorldAction3D, type CameraControl3D } from './cameraControls3D';

export default function Game3DScreen({account}:{account:GameIdentity3D}) {
  const friends=import.meta.env.MODE==='friends';
  const permissions=useWorldEditing3D(account.client,account.userId);
  const merchantNotices=useMerchantNotifications3D(permissions.request);
  const latestMerchantNotice=merchantNotices.notifications.find(n=>!n.read_at);
  const [adminOpen,setAdminOpen]=useState(false);
  const [hudFocused,setHudFocused]=useState(false);
  const focusHUD=useCallback((open:boolean)=>{setHudFocused(open);if(open){controls.current.clear();objectWalk.current=null;}},[]);
  const [merchantOpen,setMerchantOpen]=useState(false),[requestedShopPlot,setRequestedShopPlot]=useState<string|null>(null),[requestedApplication,setRequestedApplication]=useState<string|null>(null),[managedShop,setManagedShop]=useState<WorldShopId3D|null>(null);
  const townObstacles=useMemo(()=>townObstacles3D(permissions.town),[permissions.town]);
  const townNpcs=TOWN_NPCS_3D.filter(n=>permissions.town.objects[`npc-${n.id}`]).map(n=>({...n,...permissions.town.objects[`npc-${n.id}`]!}));
  const [saveStorage]=useState(()=>{
    const local=isLocalTownBackend3D(import.meta.env.VITE_PUBLIC_SUPABASE_URL,window.location.hostname,import.meta.env.DEV);
    const testPlayer=townTestPlayer3D(window.location.search,local);
    if(friends)return {storage:localStorage,key:`${GAME_3D_SAVE_KEY}-friends`,testPlayer:null};
    return {storage:testPlayer?sessionStorage:localStorage,key:testPlayer?`${GAME_3D_SAVE_KEY}-town-test-${testPlayer}`:GAME_3D_SAVE_KEY,testPlayer};
  });
  const [ownSave, setOwnSave] = useState<Game3DSave>(() => {
    try {
      const stored=saveStorage.storage.getItem(saveStorage.key);
      if(!stored&&saveStorage.testPlayer)return seedTownTestSave3D(JSON.parse(localStorage.getItem(GAME_3D_SAVE_KEY)||'null'),saveStorage.testPlayer);
      if(friends&&!stored)return {...freshGame3DSave(),worldId:'town' as const};
      return normalizeGame3DSave(JSON.parse(stored||'null'));
    }
    catch { return freshGame3DSave(); }
  });
  const [storageOwner,setStorageOwner]=useState<string|null>(null);
  const [visitSession,setVisitSession]=useState<{farm:FarmSnapshot3D;player:Position3}|null>(null);
  const ownSaveRef=useRef(ownSave);ownSaveRef.current=ownSave;
  const visitRef=useRef(visitSession);visitRef.current=visitSession;
  const save=visitSession?visitFarmView3D(ownSave,visitSession.farm,visitSession.player):ownSave;
  const setSave=useCallback((update:React.SetStateAction<Game3DSave>)=>{
    const visit=visitRef.current;
    if(!visit){setOwnSave(current=>typeof update==='function'?update(current):update);return;}
    const current=visitFarmView3D(ownSaveRef.current,visit.farm,visit.player);
    const next=typeof update==='function'?update(current):update;
    setVisitSession(active=>active?.farm.owner_id===visit.farm.owner_id?{...active,player:next.player}:active);
    setOwnSave(owned=>keepVisitorPersonal3D(owned,next));
  },[]);
  const isVisiting=visitSession!==null;
  const persistOwnSave=useCallback((next:Game3DSave)=>{
    if(visitRef.current)return;
    saveStorage.storage.setItem(storageOwner?`${saveStorage.key}-owner-${storageOwner}`:saveStorage.key,JSON.stringify(next));
  },[saveStorage,storageOwner]);
  const liveSave = useRef(save);
  useEffect(() => { liveSave.current = save; }, [save]);
  const [saveLabel, setSaveLabel] = useState('3D world loaded');
  const [sceneReady, setSceneReady] = useState(false);
  const [hint, setHint] = useState('Explore the 3D meadow · WASD or arrow keys');
  const [now, setNow] = useState(Date.now());
  const [chatFocused,setChatFocused]=useState(false);
  const [socialFocused,setSocialFocused]=useState(false);
  const [profileSelection,setProfileSelection]=useState<{owner:string|null;peer:MmoPlayer3D}|null>(null);
  const [privateChatSelection,setPrivateChatSelection]=useState<{owner:string|null;peer:MmoPlayer3D}|null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [characterEditorOpen, setCharacterEditorOpen] = useState(false);
  const [characterChoice, setCharacterChoice] = useState(() => {
    try { return normalizeCharacterChoice3D(JSON.parse(localStorage.getItem(CHARACTER_CHOICE_KEY) || 'null'), JSON.parse(localStorage.getItem(MIRROR_LOOK_KEY) || 'null')); }
    catch { return normalizeCharacterChoice3D(null); }
  });
  useEffect(() => {
    try { localStorage.setItem(CHARACTER_CHOICE_KEY, JSON.stringify(characterChoice)); }
    catch { /* The chosen character still works for this session. */ }
  }, [characterChoice]);
  const [farmDraft, setFarmDraft] = useState<FarmLayout3D | null>(null);
  const [editHistory, setEditHistory] = useState<FarmLayout3D[]>([]);
  const [editTool, setEditTool] = useState<FarmEditTool3D>('select');
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [movingObject, setMovingObject] = useState(false);
  const [houseStyle, setHouseStyle] = useState<FarmHouseStyle3D>('cottage');
  const [editRotation, setEditRotation] = useState(0);
  const [hoveredMeshObject, setHoveredMeshObject] = useState<string | null>(null);
  const [editTile, setEditTile] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('Click a tile to start. Crops and entrances are protected.');
  const editCameraControl = useRef(freshFarmCamera3D());
  const houseEdit=useHouseEditor3D(save,()=>{
    controls.current.clear();editCameraControl.current={...freshFarmCamera3D(),zoom:4};
    const pausedSave=pauseFarmTime3D(save,Date.now());setSave(pausedSave);setSwingUntil(0);setActionTarget(null);
    try{persistOwnSave(pausedSave);}catch{/* Autosave retries. */}
  },draft=>{
    const ended=Date.now(),next=resolveHousePlayer3D(resumeFarmTime3D(draft?{...save,cats:draft.cats,houseLayouts:{...save.houseLayouts,[save.interiorHouseId]:draft.layout}}:save,ended));
    setSave(next);setNow(ended);controls.current.clear();setHint(draft?'House layout saved.':'House edits cancelled.');
    try{persistOwnSave(next);}catch{/* Autosave retries. */}
  });
  const houseEditActions=useRef(houseEdit);
  useEffect(()=>{houseEditActions.current=houseEdit;});
  const editing = farmDraft !== null || houseEdit.active;
  const interiorLayout=houseEdit.active?houseEdit.layout:houseLayoutFor3D(save);
  const houseObstacles=useMemo(()=>houseObstacles3D(interiorLayout),[interiorLayout]);
  const worldSave = farmDraft ? { ...save, farmLayout: farmDraft } : save;
  const hoverObject = farmDraft && editTool === 'select' && !movingObject
    ? (hoveredMeshObject ? getFarmObject3D(worldSave.farmLayout,hoveredMeshObject) : null) ?? (editTile ? getFarmObjectAtTile3D(worldSave.farmLayout,editTile) : null) : null;
  const hoverStage = hoverObject?.kind === 'tree' && typeof save.choppedTrees[hoverObject.id] === 'number'
    ? getTreeStage3D(save.choppedTrees[hoverObject.id],save.growth.treeSeconds,save.farmPausedAt??now) : 3;
  const selectedFarmObject = farmDraft && selectedObject ? getFarmObject3D(farmDraft, selectedObject) : null;
  const placementTool = movingObject && selectedFarmObject ? selectedFarmObject.kind : editTool;
  const placementResult = editTile && farmDraft ? movingObject && selectedObject
    ? moveFarmObject3D(worldSave, selectedObject, editTile, editRotation) : applyFarmEdit3D(worldSave, editTool, editTile, editRotation, houseStyle) : null;
  const previewStage = selectedFarmObject?.kind === 'tree' && typeof save.choppedTrees[selectedFarmObject.id] === 'number'
    ? getTreeStage3D(save.choppedTrees[selectedFarmObject.id], save.growth.treeSeconds, save.farmPausedAt ?? now) : 3;
  const rotateEditSelection = useRef<() => void>(() => {});
  useEffect(() => {
    rotateEditSelection.current = () => {
      if(houseEdit.active){houseEdit.rotate();return;}
      if (farmDraft && selectedObject && !movingObject) {
        const result = rotateFarmObject3D(worldSave, selectedObject);
        if (result.changed) { setEditHistory(history => [...history.slice(-29),farmDraft]); setFarmDraft(result.state.farmLayout); }
        setEditMessage(result.message);
      } else setEditRotation(rotation => (rotation + 1) % 4);
    };
  });
  const farmObstacles = useMemo(() => farmObstacles3D(farmDraft ?? save.farmLayout), [farmDraft, save.farmLayout]);
  const farmCameraBlockers = useMemo(() => {
    return getFarmBuildings3D(farmDraft ?? save.farmLayout).map(house=>({x:house.x,z:house.z,y:2.5,width:house.rotation%2?4:5,depth:house.rotation%2?5:4,height:5}));
  }, [farmDraft, save.farmLayout]);
  const [travelOpen, setTravelOpen] = useState(false);
  const [talkingTo, setTalkingTo] = useState<string | null>(null);
  const [activeShop,setActiveShop]=useState<WorldShopId3D>('meadow');
  const [catMode,setCatMode]=useState<'shop'|null>(null);
  const [coopOpen,setCoopOpen]=useState<string|null>(null);
  const [coopMessage,setCoopMessage]=useState('Place chickens from your bag, then feed them.');
  const [shopOpen, setShopOpen] = useState(false);
  const [h2hOpen, setH2HOpen] = useState(false);
  const [objectMenu,setObjectMenu]=useState<ObjectMenuState3D|null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [swingUntil, setSwingUntil] = useState(0);
  const [farmerAction, setFarmerAction] = useState<FarmerAction3D>('hoe');
  const [actionTarget, setActionTarget] = useState<{ x: number; z: number } | null>(null);
  const controls = useRef(new Set<string>());
  const mobileInput=useRef<MobileInput3D>({right:0,forward:0,jump:false});
  const objectWalk = useRef<ObjectWalk3D | null>(null);
  const walkTarget = useRef<HouseActionTarget3D | null>(null);
  const playerPosition = useRef(save.player);
  const catPositions = useRef<Record<string,{x:number;z:number}>>({});
  const actionCenter = useRef({ x: Math.round(save.player.x), z: Math.round(save.player.z) });
  const cameraControl = useRef<CameraControl3D>({ yaw: Math.PI * 1.25, pitch: Math.atan(1 / Math.sqrt(2)), distance: 8.5, dragging: false });
  const cameraDrag = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number } | null>(null);
  const gameSurface = useRef<HTMLDivElement>(null);
  const lastCameraDragAt = useRef(0);
  const pendingRightGroundAction = useRef<(() => void) | null>(null);
  const suppressRightGroundAction = useRef(false);
  const chopTimer = useRef<number | null>(null);
  const chopBusyUntil = useRef(0);
  const paintStroke = useRef<FarmPaintStroke3D | null>(null);
  const paintPointer = useRef<{id: number;canvas: HTMLCanvasElement} | null>(null);
  const suppressPaintClickUntil = useRef(0);
  const abandonFarmPaint = useCallback(() => {
    const pointer=paintPointer.current;
    paintPointer.current=null;paintStroke.current=null;
    if(pointer?.canvas.hasPointerCapture(pointer.id))pointer.canvas.releasePointerCapture(pointer.id);
  },[]);
  const finishFarmPaint = useCallback(() => {
    const stroke=paintStroke.current;
    if(!paintPointer.current&&!stroke)return;
    abandonFarmPaint();suppressPaintClickUntil.current=Date.now()+300;
    if(stroke?.painted){setEditHistory(history=>[...history.slice(-29),stroke.before]);setFarmDraft(stroke.state.farmLayout);setEditMessage(`${stroke.painted} tiles painted. Undo reverts this drag.`);}
  },[abandonFarmPaint]);
  useEffect(()=>{
    const release=(event: PointerEvent)=>{if(paintPointer.current?.id===event.pointerId)finishFarmPaint();};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',finishFarmPaint);
    return ()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',finishFarmPaint);abandonFarmPaint();};
  },[finishFarmPaint,abandonFarmPaint]);
  const cancelFarmEditing = useCallback(() => {
    const endedAt = Date.now();
    abandonFarmPaint();
    controls.current.clear();
    const resumed = resolveFarmPlayerPosition3D(resumeFarmTime3D(liveSave.current, endedAt));
    try { persistOwnSave(resumed); } catch { /* Keep the resumed session usable; autosave will retry. */ }
    setSave(resumed);
    setNow(endedAt); setFarmDraft(null); setEditTile(null); setEditHistory([]);
    setSelectedObject(null); setHoveredMeshObject(null); setMovingObject(false); setHint('Farm edits cancelled. Time resumed.');
  }, [abandonFarmPaint,persistOwnSave,setSave]);
  const selectedTool: ToolId3D | null = save.selectedSlot === 'cursor' ? null : save.hotbar[save.selectedSlot];
  const navigationPaused = merchantOpen || managedShop!==null || adminOpen || chatFocused || socialFocused || objectMenu!==null || catMode!==null || coopOpen!==null || editing || inventoryOpen || shopOpen || h2hOpen || actionMenu !== null || travelOpen || talkingTo !== null || characterEditorOpen;
  const paused = hudFocused || navigationPaused;
  const movementOwner=useRef(false);
  const townPose=useRef<TownLocalPose3D>({...save.player,yaw:Math.PI,moving:false,running:false});
  const gameIdentity={...account,name:`${save.appearance.name||'Farmer'}${account.localTest&&account.userId?` ${account.userId.slice(0,4)}`:''}`.slice(0,32)};
  useEffect(()=>{
    const id=gameIdentity.userId;if(!id||storageOwner===id)return;
    try{setOwnSave(loadOwnedFarm3D(saveStorage.storage,saveStorage.key,id,ownSaveRef.current));}
    catch{setOwnSave(freshGame3DSave());}
    setStorageOwner(id);
  },[gameIdentity.userId,saveStorage,storageOwner]);
  const privateChatTarget=privateChatSelection?.owner===gameIdentity.userId?privateChatSelection?.peer??null:null;
  const setPrivateChatTarget=useCallback((peer:MmoPlayer3D|null)=>setPrivateChatSelection(peer?{owner:gameIdentity.userId,peer}:null),[gameIdentity.userId]);
  const localColyseus=friends||isLocalTownBackend3D(import.meta.env.VITE_PUBLIC_SUPABASE_URL,window.location.hostname,import.meta.env.DEV)&&import.meta.env.VITE_PUBLIC_COLYSEUS_ENABLED!=='false';
  const colyseusEndpoint=friends?`${window.location.origin}/multiplayer`:import.meta.env.VITE_PUBLIC_COLYSEUS_URL||'ws://127.0.0.1:2567';
  const townMultiplayer=useTownMultiplayer3D(!localColyseus&&save.worldId==='town'&&storageOwner===gameIdentity.userId,townPose,{appearance:save.appearance,choice:characterChoice},gameIdentity);
  const correctCommunicationPosition=useCallback((presence:MmoPresence3D)=>{
    if(liveSave.current.worldId!=='town'&&!visitRef.current&&presence.accepted!==false)return;
    controls.current.clear();objectWalk.current=null;walkTarget.current=null;
    townPose.current={...townPose.current,x:presence.x,z:presence.z,moving:false,running:false};
    setSave(current=>({...current,player:{...current.player,x:presence.x,z:presence.z}}));
  },[setSave]);
  const worldScope:'farm'|'town'|'house'|`farm:${string}`=visitSession?`farm:${visitSession.farm.owner_id}`:save.worldId;
  const communication=useMmoCommunication3D({movementOwned:()=>movementOwner.current,client:gameIdentity.client,userId:gameIdentity.userId,name:gameIdentity.name,world:worldScope,pose:townPose,onCorrection:correctCommunicationPosition,identityStatus:storageOwner===gameIdentity.userId?gameIdentity.status:'connecting',identityError:gameIdentity.error,retryIdentity:gameIdentity.retry});
  const registeredIdentity=useRef<string|null>(null);
  if(communication.status==='online'&&communication.state?.profile.id===gameIdentity.userId)registeredIdentity.current=gameIdentity.userId;
  const applySharedFarm=useCallback((farm:FarmSnapshot3D)=>{
    const visit=visitRef.current;
    if(visit?.farm.owner_id===farm.owner_id){setVisitSession(current=>current?.farm.owner_id===farm.owner_id?{...current,farm}:current);return;}
    if(!visit)setOwnSave(current=>ownedFarmSnapshot3D(current,farm,gameIdentity.userId??''));
  },[gameIdentity.userId]);
  const changeVisit=useCallback((farm:FarmSnapshot3D|null)=>{
    controls.current.clear();objectWalk.current=null;walkTarget.current=null;
    setOwnSave(current=>resumeFarmTime3D(current,Date.now()));
    houseEditActions.current.discard();abandonFarmPaint();setFarmDraft(null);setEditHistory([]);setSelectedObject(null);setMovingObject(false);setEditTile(null);setHoveredMeshObject(null);
    setActionMenu(null);setObjectMenu(null);setTravelOpen(false);setInventoryOpen(false);setCoopOpen(null);
    setShopOpen(false);setH2HOpen(false);setTalkingTo(null);setCatMode(null);setCharacterEditorOpen(false);
    if(chopTimer.current!==null){window.clearTimeout(chopTimer.current);chopTimer.current=null;}
    chopBusyUntil.current=0;setSwingUntil(0);setActionTarget(null);
    const next=farm?{farm,player:{x:0,y:0,z:8}}:null;
    visitRef.current=next;setVisitSession(next);
    const position=next?.player??ownSaveRef.current.player;
    townPose.current={...townPose.current,...position,moving:false,running:false};
    setHint(farm?`Visiting ${farm.owner_name}'s farm. Help with crops; harvested carrots go to the owner.`:'Returned to your own world.');
  },[abandonFarmPaint]);
  const socialFarm=useSocialFarm3D({client:gameIdentity.client,userId:gameIdentity.userId,ready:registeredIdentity.current===gameIdentity.userId&&storageOwner===gameIdentity.userId,getOwnSave:()=>ownSaveRef.current,getWorld:()=>worldScope,getOwner:()=>save.worldId==='farm'?(visitSession?.farm.owner_id??gameIdentity.userId):null,getAvatar:()=>({appearance:save.appearance,choice:characterChoice}),getPose:()=>townPose.current,onFarm:applySharedFarm,onVisit:changeVisit});
  const colyseus=useColyseusMultiplayer3D({enabled:localColyseus&&storageOwner===gameIdentity.userId&&communication.status==='online'&&(save.worldId==='town'||save.worldId==='farm'&&socialFarm.farm?.owner_id===(visitSession?.farm.owner_id??gameIdentity.userId)),endpoint:colyseusEndpoint,friendsOrigin:friends?window.location.origin:undefined,world:worldScope,pose:townPose,identity:gameIdentity,onCorrection:pose=>correctCommunicationPosition({...pose,seq:0,world_id:worldScope,server_id:'local-1',accepted:false})});
  movementOwner.current=localColyseus&&colyseus.status==='online'&&colyseus.ownsPosition;
  const multiplayerPeers=localColyseus?colyseus.peers:save.worldId==='town'?townMultiplayer.peers:save.worldId==='farm'?socialFarm.peers:{};
  const selectedProfile=profileSelection?.owner===gameIdentity.userId?profileSelection?.peer??null:null;
  const selectProfile=useCallback((peer:MmoPlayer3D|null)=>setProfileSelection(peer?{owner:gameIdentity.userId,peer}:null),[gameIdentity.userId]);
  const socialFocus=useCallback((focused:boolean)=>{setSocialFocused(focused);if(focused){controls.current.clear();objectWalk.current=null;walkTarget.current=null;}},[]);
  const nearbyCommunicationPlayers=Object.values(multiplayerPeers).filter(peer=>Math.hypot(peer.x-townPose.current.x,peer.z-townPose.current.z)<=(communication.state?.config.local_radius??30)).map(peer=>({id:peer.userId,name:peer.name,online:true}));
  const communicationFocus=useCallback((focused:boolean)=>{setChatFocused(focused);if(focused){controls.current.clear();objectWalk.current=null;walkTarget.current=null;}},[]);
  const inTown = save.worldId === 'town';
  const inHouse = save.worldId === 'house';
  const houseWorld=useHouseWorld3D({request:permissions.request,userId:gameIdentity.userId,houseId:save.interiorHouseId,active:inHouse&&!isVisiting,editing:houseEdit.active,onLayout:layout=>setOwnSave(current=>JSON.stringify(current.houseLayouts[current.interiorHouseId])===JSON.stringify(layout)?current:{...current,houseLayouts:{...current.houseLayouts,[current.interiorHouseId]:layout}})});
  const houseEditorUi={...houseEdit,save:()=>{void houseWorld.save(houseEdit.layout).then(ok=>{if(ok)houseEdit.save();else setHint('House not saved. Check the connection or reload after another editor changed it.');});}};
  const mayEditFarm=canEditWorld3D(permissions.role,gameIdentity.userId,visitSession?.farm.owner_id??gameIdentity.userId,'farm');
  const mayEditHouse=canEditWorld3D(permissions.role,gameIdentity.userId,visitSession?.farm.owner_id??gameIdentity.userId,'house');
  useEffect(()=>{if(permissions.role!=='admin')setAdminOpen(false);},[permissions.role]);
  const townNpc = townNpcs.find(npc => npc.id === talkingTo);

  useEffect(() => {
    controls.current.clear();
    setSwingUntil(0);
    setActionTarget(null);
    setChatFocused(false);
    setPrivateChatTarget(null);
  }, [worldScope,gameIdentity.userId,setPrivateChatTarget]);
  useEffect(()=>{setProfileSelection(null);changeVisit(null);houseEditActions.current.discard();abandonFarmPaint();setFarmDraft(null);setEditHistory([]);setSelectedObject(null);setMovingObject(false);setEditTile(null);setHoveredMeshObject(null);setSocialFocused(false);},[gameIdentity.userId,changeVisit,abandonFarmPaint]);

  const exitHouse = () => {
    controls.current.clear();
    setSave(current => ({ ...travelWorld3D(current, 'farm'), player: farmHouseExit3D(current.farmLayout,current.interiorHouseId) }));
    setHint('Welcome back to your private farm.');
  };

  const travel = () => {
    if(isVisiting){void socialFarm.leave();setTravelOpen(false);return;}
    if (Date.now() < chopBusyUntil.current) { setHint('Finish chopping before travelling.'); return; }
    controls.current.clear();
    cameraDrag.current = null;
    pendingRightGroundAction.current = null;
    cameraControl.current.dragging = false;
    suppressRightGroundAction.current = false;
    lastCameraDragAt.current = 0;
    setSwingUntil(0);
    setActionTarget(null);
    setSave(current => travelWorld3D(current, current.worldId === 'town' ? 'farm' : 'town'));
    setTravelOpen(false);
    setHint(inTown ? 'Welcome home to your private farm.' : 'Welcome to H2H Town! Talk to Maya or visit the shops.');
  };

  useEffect(() => () => { if (chopTimer.current !== null) window.clearTimeout(chopTimer.current); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSceneReady(true), 500);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    setSaveLabel('Saving 3D world…');
    const timer = window.setTimeout(() => {
      try {
        saveStorage.storage.setItem(storageOwner?`${saveStorage.key}-owner-${storageOwner}`:saveStorage.key, JSON.stringify(ownSave));
        setSaveLabel('Saved in this browser · 3D world');
      } catch { setSaveLabel('3D save unavailable'); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ownSave,saveStorage,storageOwner]);
  useEffect(() => {
    controls.current.clear();
    const key = (event: KeyboardEvent) => event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const down = (event: KeyboardEvent) => {
      const value = key(event);
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]') || (!editing && target?.closest('button'))) return;
      if (editing) {
        if (value === 'Escape') { if(houseEditActions.current.active)houseEditActions.current.cancel();else cancelFarmEditing(); return; }
        if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(value)) { event.preventDefault(); controls.current.add(value); return; }
        const cameraAction = ({q:'left',e:'right','+':'zoomIn','=':'zoomIn','-':'zoomOut'} as Record<string, FarmCameraAction3D>)[value];
        if (cameraAction) { event.preventDefault(); editCameraControl.current = adjustFarmCamera3D(editCameraControl.current, cameraAction); }
        if (value === 'r' && !event.repeat) rotateEditSelection.current();
        return;
      }
      if (value === 'i') {
        event.preventDefault();
        if (!event.repeat && !shopOpen && !h2hOpen && !actionMenu) setInventoryOpen(open => !open);
        return;
      }
      if (!paused && value === '0') { event.preventDefault(); setSave(current => ({ ...current, selectedSlot: 'cursor' })); return; }
      if (!paused && /^[1-8]$/.test(value)) { event.preventDefault(); setSave(current => ({ ...current, selectedSlot: Number(value) - 1 })); return; }
      if (!paused && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', ' '].includes(value)) {
        event.preventDefault(); controls.current.add(value);
      }
    };
    const up = (event: KeyboardEvent) => controls.current.delete(key(event));
    const clear = () => controls.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, [paused, shopOpen, h2hOpen, actionMenu, editing, cancelFarmEditing,setSave]);
  useEffect(() => {
    const surface = gameSurface.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (editing) {
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1);
        editCameraControl.current = zoomFarmCamera3D(editCameraControl.current, delta);
        return;
      }
      if (paused) return;
      cameraControl.current.distance = applyCameraZoom3D(cameraControl.current.distance, event.deltaY);
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [paused, editing]);

  const updatePosition = useCallback((player: Position3) => setSave(current => visitRef.current?{...current,player}:walkThroughHouseDoor3D(current, player)), [setSave]);
  const within = (x: number, z: number, distance: number) => Math.hypot(save.player.x - x, save.player.z - z) <= distance;
  const animateTool = (action: FarmerAction3D, target?: { x: number; z: number }) => {
    setFarmerAction(action);
    setActionTarget(target ?? null);
    setSwingUntil(Date.now() + 900);
  };

  const paintGround = (key: string,buttons: number) => {
    if(!paintPointer.current||!(buttons&1)||!farmDraft||movingObject||!isFarmPaintTool3D(editTool))return;
    const previous=paintStroke.current;
    const stroke=previous?extendFarmPaint3D(previous,key):startFarmPaint3D(worldSave,editTool,key,editRotation);
    paintStroke.current=stroke;
    if(stroke.state.farmLayout!==(previous?.state.farmLayout??farmDraft))setFarmDraft(stroke.state.farmLayout);
    if(stroke.message!==previous?.message)setEditMessage(stroke.message);
  };

  const walkToGround = (point:{x:number;z:number}) => {
    if(paused||Date.now()<swingUntil||shouldSuppressWorldAction3D(lastCameraDragAt.current,Date.now()))return;
    objectWalk.current=null;walkTarget.current=null;
    const path=findGroundWalkPath3D(playerPosition.current,point,inHouse?houseObstacles:inTown?townObstacles:farmObstacles,inHouse?5.5:23.5);
    if(!path.length){setHint('No clear route to this spot.');return;}
    controls.current.clear();objectWalk.current={path,index:0};setHint('Walking to the selected spot…');
  };
  const openPlayerChat=(id:string)=>{
    const peer=multiplayerPeers[id];if(!peer)return;
    controls.current.clear();objectWalk.current=null;walkTarget.current=null;
    selectProfile({id:peer.userId,name:peer.name,online:true});
  };
  const performFarmAction=async(action:FarmAction3D,key:string)=>{
    if(socialFarm.status!=='online'){setHint('Connecting to the shared farm. Try again in a moment.');return;}
    const success=await socialFarm.act(action,key);
    if(success){const animation=action==='dig'?'hoe':action==='plant'?'seeds':action==='water'?'wateringCan':action==='harvest'?'harvest':null;if(animation)animateTool(animation,LAND_TILES_3D.find(tile=>tile.key===key));setHint(action==='harvest'?(isVisiting?'Carrot harvested for the farm owner.':'+1 carrot'):action==='restore'?'Plot restored to grass':action==='dig'?'Soil tilled':action==='plant'?'Carrot seeds planted':'Crop watered');}
    else setHint('Farm action was not completed. Check the Friends panel for details.');
  };
  const handleGround = (key: string, button: number, point?:{x:number;z:number}) => {
    if (farmDraft) {
      if (button !== 0 || Date.now() < suppressPaintClickUntil.current || shouldSuppressWorldAction3D(lastCameraDragAt.current, Date.now())) return;
      if (editTool === 'select' && !movingObject) { const object=getFarmObjectAtTile3D(farmDraft,key);if(object){selectFarmObject(object.id);return;}setSelectedObject(null);setEditMessage('Click an object to select it.');return; }
      const result = movingObject && selectedObject
        ? moveFarmObject3D(worldSave, selectedObject, key, editRotation) : applyFarmEdit3D(worldSave, editTool, key, editRotation, houseStyle);
      setEditMessage(result.message);
      if (result.changed) {
        setEditHistory(history => [...history.slice(-29), farmDraft]); setFarmDraft(result.state.farmLayout);
        if (movingObject) { setSelectedObject(selectedFarmObject && ['pond','house','building','portal','tree'].includes(selectedFarmObject.kind) ? selectedObject : key); setMovingObject(false); setEditTool('select'); }
      }
      return;
    }
    if(button===0 && (selectedTool===null||!isSurroundingTile3D(actionCenter.current,key))){const [x,z]=key.split(',').map(Number);walkToGround(point??{x,z});return;}
    if (save.worldId !== 'farm') return;
    if (Date.now() < chopBusyUntil.current) return;
    if (suppressRightGroundAction.current) return;
    if (paused || shouldSuppressWorldAction3D(lastCameraDragAt.current, Date.now())) return;
    objectWalk.current=null;walkTarget.current=null;
    if (button === 2 && cameraDrag.current) {
      pendingRightGroundAction.current = () => handleGround(key, button);
      return;
    }
    if (!isSurroundingTile3D(actionCenter.current, key)) { setHint('Use one of the eight surrounding tiles. The tile under you is blocked.'); return; }
    const cell = LAND_TILES_3D.find(item => item.key === key);
    if (!cell) return;
    if (!within(cell.x, cell.z, 2.6)) { setHint('Walk closer to use this farm plot'); return; }
    if (button === 2) {
      if (!save.soil[key]) { setHint('This plot is still grass'); return; }
      setActionMenu(key); controls.current.clear(); return;
    }
    if (selectedTool === 'hoe' && !canDigFarm3D(save.farmLayout, key)) {
      setHint('Only clear light-green grass can be dug. Paths, water, trees and buildings are protected.'); return;
    }
    if(gameIdentity.client){
      const action=selectedTool==='hoe'?'dig':selectedTool==='seeds'?'plant':selectedTool==='wateringCan'?'water':null;
      if(action)void performFarmAction(action,key);else setHint('Select a farming tool.');
      return;
    }
    const result = applyTool3D(save, selectedTool, key, Date.now());
    if (result.changed) {
      setSave(result.state);
      if (selectedTool === 'hoe' || selectedTool === 'seeds' || selectedTool === 'wateringCan') animateTool(selectedTool, cell);
    }
    setHint(result.message);
  };

  const selectFarmObject = (id: string) => {
    if (!farmDraft || Date.now() < suppressPaintClickUntil.current || shouldSuppressWorldAction3D(lastCameraDragAt.current, Date.now())) return;
    const object = getFarmObject3D(farmDraft,id); if (!object) return;
    if (movingObject) { handleGround(`${object.x},${object.z}`,0); return; }
    if (editTool !== 'select') { setEditMessage('Choose Select to move or delete an existing object.'); return; }
    setSelectedObject(id); setEditTool('select'); setEditRotation(object.rotation); setEditTile(null);
    setEditMessage(object.canDelete ? 'Choose Move or Delete. Press R to rotate the object.' : 'Choose Move or press R to rotate. This object cannot be erased.');
  };

  const executeHouseAction=(target:HouseActionTarget3D,action:ObjectActionId3D)=>{
    const current=liveSave.current,time=Date.now();
    controls.current.clear();
    if(!isHighlightedObject3D(actionCenter.current,target)){setHint('Walk closer until the object is within your highlighted tiles.');return;}
    if(action==='exit'){exitHouse();return;}
    if(action==='customize'){if(!within(-5.8,1.5,3.5)){setHint('Walk closer to the mirror.');return;}setCharacterEditorOpen(true);return;}
    if(action==='feed'){const result=fillPetBowl3D(current,time);if(result.changed){setSave(result.state);animateTool('feedPet',petBowlPosition3D(interiorLayout));}setHint(result.message);return;}
    if(action==='callAll'){let next=current;for(const cat of current.cats.filter(cat=>cat.houseId===current.interiorHouseId))next=callCat3D(next,cat.id,time).state;setSave(next);setHint('You called your awake cats over.');return;}
    const catId=target.kind==='furniture'?current.cats.find(cat=>cat.houseId===current.interiorHouseId&&cat.rest?.bedId===target.id)?.id:target.id;
    if(!catId)return;
    if(action==='pet'&&!within(target.x,target.z,2)){setHint('Walk closer to pet the cat.');return;}
    const result=action==='pet'?careForCat3D(current,catId,'pet',time):action==='call'?callCat3D(current,catId,time):action==='wake'?wakeCat3D(current,catId,time):returnCat3D(current,catId);
    if(result.changed){setSave(result.state);if(action==='pet')animateTool('pet',target);}
    setHint(result.message);
  };
  const openHouseActions=(target:HouseActionTarget3D)=>{
    if(paused||Date.now()<swingUntil||shouldSuppressWorldAction3D(lastCameraDragAt.current,Date.now()))return;
    objectWalk.current=null;walkTarget.current=null;
    if(!isHighlightedObject3D(actionCenter.current,target)){
      const path=findObjectWalkPath3D(playerPosition.current,target,houseObstacles);
      if(!path.length){setHint('No clear route to this object.');return;}
      controls.current.clear();walkTarget.current=target;objectWalk.current={path,index:0};setHint('Walking to the object…');return;
    }
    const cat=target.kind==='cat'?save.cats.find(cat=>cat.id===target.id):null;
    const furniture=target.kind==='furniture'?interiorLayout.furniture[target.id]:null;
    const spec=furniture?HOUSE_FURNITURE_3D.find(item=>item.id===furniture.kind):null;
    const title=cat?(CAT_CATALOG_3D.find(coat=>coat.id===cat.coat)?.name??'Cat'):spec?.name??({bowl:'Pet bowl',mirror:'Mirror',exit:'Front door'}[target.kind as 'bowl'|'mirror'|'exit']??'Object');
    const detail=cat?`${cat.rest?.sleeping?'Sleeping':cat.mealServedAt!==undefined?'Eating':'At home'} · Energy ${Math.round(catEnergy3D(cat,Date.now()))}%`:target.kind==='bowl'?`${save.inventory.petFood} pet food in your bag`:furniture?.kind==='catBed'?'Tired cats use this bed automatically.':target.kind==='furniture'?'No gameplay interactions available yet.':undefined;
    setHint('Choose an action.');
    controls.current.clear();setObjectMenu({title,icon:cat?'♡':target.kind==='bowl'?'◡':target.kind==='mirror'?'♧':'▦',detail,position:[target.x,1.3,target.z],actions:houseObjectActions3D(save,target,Date.now()).map(choice=>({...choice,onSelect:()=>executeHouseAction(target,choice.id)}))});
  };
  useEffect(()=>{objectWalk.current=null;walkTarget.current=null;setObjectMenu(null);setActionMenu(null);},[save.worldId,editing]);
  useEffect(()=>{if(inventoryOpen||shopOpen||h2hOpen||catMode||characterEditorOpen||travelOpen)setObjectMenu(null);},[inventoryOpen,shopOpen,h2hOpen,catMode,characterEditorOpen,travelOpen]);

  const chopFarmTree = (id: string) => {
    if(isVisiting){setHint('Only the owner can chop trees on this farm.');return;}
    if (save.worldId !== 'farm') return;
    if (Date.now() < chopBusyUntil.current) return;
    if (paused || shouldSuppressWorldAction3D(lastCameraDragAt.current, Date.now())) return;
    const tree = getFarmTrees3D(save.farmLayout).find(item => item.id === id);
    if (tree && !isSurroundingTile3D(actionCenter.current, `${Math.round(tree.x)},${Math.round(tree.z)}`)) {
      setHint('Walk closer: the tree must be on one of the eight surrounding tiles.'); return;
    }
    if (!tree || !within(tree.x, tree.z, 2.8)) { setHint('Walk closer to the tree'); return; }
    if (selectedTool !== 'axe') { setHint('Select the axe to chop this tree'); return; }
    const result = chopTree3D(save, id, Date.now());
    if (!result.changed) { setHint(result.message); return; }
    animateTool('axe', tree);
    chopBusyUntil.current = Date.now() + 900;
    setHint('Chopping tree…');
    chopTimer.current = window.setTimeout(() => {
      setSave(current => chopTree3D(current, id, Date.now()).state);
      setHint('+1 wood');
      chopTimer.current = null;
    }, 500);
  };

  const openFarmHouse = (id: string) => {
    if(isVisiting){setHint('House interiors are private. You can help with crops outside.');return;}
    if(paused||save.worldId!=='farm'||Date.now()<chopBusyUntil.current)return;
    const house=getFarmObject3D(save.farmLayout,id);
    if(!house||house.style==='coop'||!['house','building'].includes(house.kind))return;
    const exit=farmHouseExit3D(save.farmLayout,id);
    if(!within(exit.x,exit.z,3)){setHint('Walk closer to the front door to enter this house.');return;}
    controls.current.clear();
    setSave(current=>{const entered=travelWorld3D(current,'house');return {...entered,interiorHouseId:id,player:{x:0,y:0,z:3.5},worldPositions:{...entered.worldPositions,farm:exit}};});
    setHint('Walk to the door to return outside.');
  };

  const openShop = (id: TownShopId3D) => {
    if (paused || shouldSuppressWorldAction3D(lastCameraDragAt.current, Date.now())) return;
    if (!inTown && id === 'h2h') { openFarmHouse('house'); return; }
    if (!inTown) return;
    const shop = getTownObject3D(permissions.town,id);
    if (!shop||!isWorldShop3D(shop)) return;
    if (!within(shop.x, shop.z, 5.2)) { setHint('Walk closer to enter this shop'); return; }
    controls.current.clear();setActiveShop(worldShopCatalogueId3D(shop));
    if(id==='cats'){setCatMode('shop');}
    else if (id === 'h2h'||shop.style==='h2h') setH2HOpen(true);
    else { setShopOpen(true); }
  };

  const menuPlant = actionMenu && save.plants[actionMenu] ? getCropStage3D(save.plants[actionMenu], save.growth.carrotSeconds, now) : undefined;
  const closeDialog = (setter: (open: boolean) => void) => { setter(false); controls.current.clear(); };
  const beginCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if(farmDraft&&!movingObject&&isFarmPaintTool3D(editTool)&&event.button===0&&event.target instanceof HTMLCanvasElement){
      event.preventDefault();paintPointer.current={id:event.pointerId,canvas:event.target};event.target.setPointerCapture(event.pointerId);return;
    }
    if ((paused && !editing) || event.pointerType !== 'mouse' || (editing ? event.button !== 2 : ![0, 2].includes(event.button))) return;
    pendingRightGroundAction.current = null;
    suppressRightGroundAction.current = false;
    cameraDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY };
    cameraControl.current.dragging = false;
  };
  const moveCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cameraDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!(event.buttons & 3)) {
      cameraControl.current.dragging = false;
      cameraDrag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!cameraControl.current.dragging && isCameraDrag3D(distance)) {
      cameraControl.current.dragging = true;
      pendingRightGroundAction.current = null;
      suppressRightGroundAction.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (cameraControl.current.dragging) {
      if (editing) editCameraControl.current = rotateFarmCamera3D(editCameraControl.current, -(event.clientX - drag.lastX) * .006);
      lastCameraDragAt.current = Date.now();
      event.preventDefault();
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  };
  const endCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if(paintPointer.current?.id===event.pointerId){finishFarmPaint();return;}
    const drag = cameraDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = cameraControl.current.dragging;
    const pendingAction = pendingRightGroundAction.current;
    pendingRightGroundAction.current = null;
    if (wasDragging) lastCameraDragAt.current = Date.now();
    cameraControl.current.dragging = false;
    cameraDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!wasDragging && pendingAction) window.setTimeout(pendingAction, 0);
    if (wasDragging) window.setTimeout(() => { suppressRightGroundAction.current = false; }, 1_000);
  };


  const touchAction=()=>{
    if(paused)return;
    if(save.worldId!=='farm'||selectedTool===null){touchInteract();return;}
    const tile=facingHudTile3D(actionCenter.current,townPose.current.yaw);
    if(selectedTool==='axe'){
      const tree=nearestHudTarget3D(tile,getFarmTrees3D(save.farmLayout).filter(t=>isSurroundingTile3D(actionCenter.current,`${Math.round(t.x)},${Math.round(t.z)}`)),1.5);
      if(tree){chopFarmTree(tree.id);return;}
    }
    handleGround(`${tile.x},${tile.z}`,0);
  };
  const touchInteract=()=>{
    if(paused)return;
    if(inTown){
      const objects=[...Object.keys(permissions.town.objects),...Object.keys(permissions.town.buildings)].map(id=>getTownObject3D(permissions.town,id)).filter((o):o is NonNullable<typeof o>=>Boolean(o&&(isWorldShop3D(o)||o.kind==='npc'||o.kind==='portal'||o.style==='plot')));
      const target=nearestHudTarget3D(playerPosition.current,objects,5.2);
      if(target){if(isWorldShop3D(target))openShop(target.id as TownShopId3D);else if(target.kind==='npc'){if(within(target.x,target.z,3.5))setTalkingTo(target.id.slice(4));else setHint('Walk closer to talk.');}else if(target.style==='plot'){setRequestedShopPlot(target.id);setMerchantOpen(true);}else setTravelOpen(true);return;}
    }else if(inHouse){
      const targets:HouseActionTarget3D[]=[{kind:'bowl',id:'bowl',...petBowlPosition3D(interiorLayout)},{kind:'mirror',id:'mirror',x:-5.8,z:1.5},{kind:'exit',id:'exit',x:0,z:5.6},...Object.entries(interiorLayout.furniture).map(([id,item])=>({kind:'furniture' as const,id,x:item.x,z:item.z,...furnitureSize3D(item)})),...Object.entries(catPositions.current).map(([id,p])=>({kind:'cat' as const,id,...p}))];
      const target=nearestHudTarget3D(playerPosition.current,targets,3);if(target){openHouseActions(target);return;}
    }else{
      if(within(save.farmLayout.portal.x,save.farmLayout.portal.z,2.6)){if(isVisiting)void socialFarm.leave();else setTravelOpen(true);return;}
      const main=getFarmObject3D(save.farmLayout,'house');
      const houses=[...(main?[{id:'house',x:main.x,z:main.z,style:main.style}]:[]),...Object.entries(save.farmLayout.buildings).map(([id,b])=>({id,...b}))];
      const house=nearestHudTarget3D(playerPosition.current,houses,5);
      if(house){if(isVisiting){setHint('House interiors and chickens are managed by the owner.');return;}if(house.style==='coop')setCoopOpen(house.id);else openFarmHouse(house.id);return;}
      const tile=facingHudTile3D(actionCenter.current,townPose.current.yaw);handleGround(`${tile.x},${tile.z}`,2);return;
    }
    setHint('Move closer to an object, or tap it in the world.');
  };

  const webglAvailable = canUseWebGL3D();
  if (!webglAvailable) return <section className="fixed inset-x-0 bottom-0 top-16 flex items-center justify-center bg-[#b9def0] p-6 md:top-[72px]"><div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl"><h1 className="text-xl font-bold">3D graphics are unavailable</h1><p className="mt-2 text-sm text-foreground-600">Enable WebGL in your browser or continue playing the 2D world.</p><Link to="/game" className="mt-4 inline-block rounded-lg bg-accent-500 px-4 py-2 font-bold text-white">Open the 2D game</Link></div></section>;

  return (
    <section
      onClickCapture={event => {
        if(event.target instanceof HTMLCanvasElement&&Date.now()<suppressPaintClickUntil.current){event.preventDefault();event.stopPropagation();return;}
        if (!suppressRightGroundAction.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenuCapture={event => {
        if (!cameraControl.current.dragging && !suppressRightGroundAction.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={event => event.preventDefault()}
      data-admin-editing={adminOpen?'true':undefined}
      className="game-screen-3d bg-[#b9def0]"
    >
      {adminOpen&&<style>{`[data-admin-editing] > :not([data-admin-tools]) { visibility: hidden; } [data-admin-tools] { visibility: visible; } vapi-widget { display: none !important; }`}</style>}
      <style>{`@media (any-pointer: coarse), (max-width: 767px) { vapi-widget { display: none !important; } }`}</style>

      <div ref={gameSurface} className="game-scene" onPointerDownCapture={beginCameraDrag} onPointerMove={moveCameraDrag} onPointerUpCapture={endCameraDrag} onPointerCancel={endCameraDrag} onLostPointerCapture={endCameraDrag}>
        <Canvas frameloop={adminOpen?'never':'always'} orthographic shadows dpr={[1, 1.75]} camera={{ position: [18, 18, 18], zoom: 40, near: 0.1, far: 150 }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            {inHouse ? <><HouseCats3D positions={catPositions} hideLabels={objectMenu!==null} layout={interiorLayout} editor={houseEdit} save={houseEdit.active?{...save,cats:houseEdit.cats}:save} paused={paused} onCatSelect={(id,position)=>openHouseActions({kind:'cat',id,...position})}
              onBowlSelect={()=>{const bowl=petBowlPosition3D(interiorLayout);openHouseActions({kind:'bowl',id:'bowl',...bowl});}}
              onRestChange={(id,rest)=>setSave(current=>setCatRest3D(current,id,rest,Date.now()))}
              onMealComplete={(id,servedAt)=>setSave(current=>completeCatMeal3D(current,id,servedAt,Date.now()).state)}
              onMealBlocked={(id,servedAt)=>{setSave(current=>refundCatMeal3D(current,id,servedAt).state);setHint('Clear a path to the pet bowl. Unused food returned to your bag.');}}/><HouseEditScene3D editor={houseEdit}/><PlayerHouse3D onGround={walkToGround} layout={interiorLayout} editor={houseEdit} onFurnitureSelect={id=>{const furniture=interiorLayout.furniture[id];if(furniture)openHouseActions({kind:'furniture',id,x:furniture.x,z:furniture.z,...furnitureSize3D(furniture)});}} onExit={()=>openHouseActions({kind:'exit',id:'exit',x:0,z:5.6})} onMirror={()=>openHouseActions({kind:'mirror',id:'mirror',x:-5.8,z:1.5})} /></> : inTown ? <TownWorld3D playerPosition={playerPosition} plotActionLabel={permissions.role==='admin'?'View applications':'Apply for shop'} onPlot={id=>{if(paused)return;controls.current.clear();objectWalk.current=null;walkTarget.current=null;setRequestedShopPlot(id);setMerchantOpen(true);}} layout={permissions.town} onGround={walkToGround} onShop={openShop} onTravel={() => setTravelOpen(true)} onTalk={id => {
              if (paused) return;
              const npc = townNpcs.find(item => item.id === id);
              if (!npc || !within(npc.x, npc.z, 3.5)) { setHint('Walk closer to talk.'); return; }
              controls.current.clear(); setTalkingTo(id);
            }} /> : <>
              <World3D onCoopSelect={id=>{if(isVisiting){setHint('The owner manages their chickens.');return;}if(paused)return;const coop=save.farmLayout.buildings[id];if(!coop||coop.style!=='coop')return;if(!within(coop.x,coop.z,6)){setHint('Walk closer to the chicken coop.');return;}controls.current.clear();setCoopMessage('Place chickens from your bag, feed them and collect ready eggs.');setCoopOpen(id);}} save={worldSave} now={save.farmPausedAt ?? now} editing={editing} movingSelection={movingObject ? selectedObject : null} onObjectSelect={selectFarmObject} onObjectHover={editing && editTool==='select' && !movingObject ? setHoveredMeshObject : undefined} onPaint={editing ? paintGround : undefined} onHover={editing ? setEditTile : undefined} onGroundSelect={handleGround} onTreeSelect={chopFarmTree} onShopSelect={openShop} onHouseEnter={openFarmHouse} />
              {editing && <FarmPlacementPreview3D layout={worldSave.farmLayout} sourceKey={movingObject ? selectedObject : null} tile={hoverObject ? null : editTile} tool={placementTool} rotation={editRotation} stage={previewStage} style={movingObject ? selectedFarmObject?.style : houseStyle} valid={placementResult?.changed ?? false} />}
              {hoverObject && <FarmObjectHover3D object={hoverObject} stage={hoverStage}/>}
              {farmDraft && selectedObject && !movingObject && <FarmObjectMenu3D selection={selectedObject} layout={farmDraft}
                onClose={() => setSelectedObject(null)}
                onMove={() => { setEditRotation(selectedFarmObject?.rotation ?? 0); setMovingObject(true); setEditTile(null); setEditMessage('Click a clear destination tile to move the selected object.'); }}
                onDelete={() => {
                  const result = deleteFarmObject3D(worldSave, selectedObject);
                  if (result.changed) { setEditHistory(history => [...history.slice(-29), farmDraft]); setFarmDraft(result.state.farmLayout); setSelectedObject(null); }
                  setEditMessage(result.message);
                }} />}
              {!(movingObject && selectedObject === 'portal') && <TravelGate3D onHover={editing && editTool==='select' && !movingObject ? setHoveredMeshObject : undefined} editing={editing} transform={worldSave.farmLayout.portal} onSelect={() => selectFarmObject('portal')} onTravel={() => { if (!editing){if(isVisiting)void socialFarm.leave();else setTravelOpen(true);} }} />}
            </>}
            <MMOSpeechBubbles3D messages={communication.messages} selfId={gameIdentity.userId} localPose={townPose} peers={multiplayerPeers}/>
            {(inTown||save.worldId==='farm')&&<TownPlayers3D peers={multiplayerPeers} onSelect={openPlayerChat}/>}
            {objectMenu&&<ObjectActionMenu3D {...objectMenu} onClose={()=>{setObjectMenu(null);controls.current.clear();}}/>}
            <Player3D townPose={townPose} key={worldScope} position={save.player} livePosition={playerPosition} objectWalk={objectWalk} onWalkComplete={()=>{const target=walkTarget.current;walkTarget.current=null;if(target){const position=target.kind==='cat'?catPositions.current[target.id]:null;openHouseActions(position?{...target,...position}:target);}else setHint('Arrived.');}} obstacles={inHouse ? houseObstacles : inTown ? townObstacles : farmObstacles} cameraBlockers={inTown || inHouse ? [] : farmCameraBlockers} mobileInput={mobileInput} controls={controls} cameraControl={cameraControl} actionCenter={actionCenter} paused={paused} editing={editing} editCameraControl={editCameraControl} selectedTool={Date.now()<swingUntil&&(farmerAction==='pet'||farmerAction==='feedPet')?null:selectedTool} swingUntil={swingUntil} action={farmerAction} actionTarget={actionTarget} appearance={save.appearance} characterChoice={characterChoice} onPositionChange={updatePosition} />
          </Suspense>
        </Canvas>
      </div>
      <GameHUD3D shopAlert={latestMerchantNotice?{id:latestMerchantNotice.id,text:`${latestMerchantNotice.shop_name}: ${latestMerchantNotice.body.split('\n')[0]}`}:undefined} unreadNotices={merchantNotices.unread} notifications={<section className="game-shop-notices" aria-label="Shop notifications"><h3>Seller application updates</h3>{merchantNotices.notifications.length?merchantNotices.notifications.map(n=><article key={n.id} data-unread={!n.read_at}><strong>{n.shop_name}</strong><p>{n.body}</p><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString()}</time><div><button onClick={()=>{setRequestedShopPlot(null);setRequestedApplication(n.application_id);setMerchantOpen(true);}}>{n.audience==='admin'?'Review application':'View application'}</button>{!n.read_at&&<button onClick={()=>void merchantNotices.acknowledge(n.id)}>Mark read</button>}</div></article>):<p>No application updates yet.</p>}{merchantNotices.error&&<p role="alert">{merchantNotices.error}</p>}</section>} world={inHouse?'My House':inTown?'H2H Town':visitSession?`${visitSession.farm.owner_name}'s Farm`:'Private Farm'} name={colyseus.name||gameIdentity.name} role={permissions.role==='admin'?'Admin':'Player'} coins={save.coins} saveLabel={saveLabel} hint={hint} showBack={!friends} editing={editing||adminOpen} onFocusChange={focusHUD} onSignOut={()=>{try{persistOwnSave(ownSaveRef.current);}catch{/* Retain last autosave. */}void account.signOut();}} announcements={communication.messages.filter(m=>m.channel==='system').slice(-3).map(m=>m.body)}
       navigation={<>        {permissions.role==='admin'&&<button type="button" disabled={editing} onClick={()=>{controls.current.clear();objectWalk.current=null;setAdminOpen(true);}} className="rounded bg-violet-700 px-3 py-1 font-bold text-white">World editor</button>}
        <button type="button" disabled={editing} onClick={()=>{controls.current.clear();objectWalk.current=null;walkTarget.current=null;setRequestedShopPlot(null);setMerchantOpen(true);}} className="rounded bg-teal-700 px-3 py-1 font-bold text-white">{permissions.role==='admin'?'Seller applications':'My shops / Apply'}</button>
        {!inTown && !inHouse && !isVisiting && mayEditFarm && <button type="button" disabled={navigationPaused} onClick={() => {
          if (Date.now() < chopBusyUntil.current) { setHint('Finish chopping before editing.'); return; }
          controls.current.clear(); suppressRightGroundAction.current = false; cameraDrag.current = null;
          const pausedSave = pauseFarmTime3D(save, Date.now());
          setSave(pausedSave); setSwingUntil(0); setActionTarget(null);
          try { persistOwnSave(pausedSave); } catch { /* The session still pauses if browser storage is unavailable. */ }
          editCameraControl.current = freshFarmCamera3D(); setFarmDraft(save.farmLayout); setEditHistory([]); setEditTool('select'); setSelectedObject(null); setMovingObject(false); setEditTile(null); setEditMessage('Choose a tool, then click a tile. Crops and entrances are protected.');
        }} className="rounded-lg bg-amber-100 px-3 py-1 font-bold disabled:opacity-40">Customize farm</button>}
        {inHouse&&mayEditHouse&&<button type="button" disabled={navigationPaused||!houseWorld.ready} onClick={()=>houseEdit.start()} className="rounded-lg bg-amber-100 px-3 py-1 font-bold disabled:opacity-40">Edit house</button>}
        {inHouse && <button type="button" disabled={navigationPaused} onClick={exitHouse} className="rounded-lg bg-amber-100 px-3 py-1 font-bold">Exit house</button>}
        <button type="button" disabled={navigationPaused} onClick={() => { controls.current.clear(); if(isVisiting)void socialFarm.leave();else setTravelOpen(true); }} className="rounded-lg bg-teal-700 px-3 py-1 font-bold text-white disabled:opacity-40">{isVisiting?'Return home':'Travel'}</button>
</>} connection={localColyseus&&(inTown||save.worldId==='farm')?<ColyseusStatus3D model={colyseus} world={inTown?'Town':'Farm'} sessionError={communication.error} retrySession={communication.retry} friends={friends}/>:inTown&&<TownMultiplayerStatus3D town={townMultiplayer}/>} friends={<SocialPanel3D key={gameIdentity.userId??'signed-out'} model={socialFarm} selectedPlayer={selectedProfile} onSelectPlayer={selectProfile} onPrivateChat={peer=>{setPrivateChatTarget(peer);selectProfile(null);}} onFocusChange={socialFocus}/>} chat={<MMOChatHUD3D key={`${gameIdentity.userId??'signed-out'}:${worldScope}`} model={communication} onFocusChange={communicationFocus} privateTarget={privateChatTarget} onPrivateTargetChange={setPrivateChatTarget} nearbyPlayers={nearbyCommunicationPlayers}/>} hotbar={<Hotbar3D save={save} inventoryOpen={inventoryOpen} onSelect={selectedSlot => setSave(current => ({ ...current, selectedSlot }))} onToggleInventory={() => { if (!shopOpen && !h2hOpen && !actionMenu) setInventoryOpen(open => !open); }} />} touch={<MobileControls3D input={mobileInput} disabled={paused} onAction={touchAction} onInteract={touchInteract}/>}/>
      {!sceneReady && <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#b9def0]"><div className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-foreground-800 shadow-lg">Loading 3D meadow…</div></div>}
      {characterEditorOpen && <CharacterEditor3D appearance={save.appearance} choice={characterChoice} onApply={setCharacterChoice} onClose={() => { controls.current.clear(); setCharacterEditorOpen(false); }} />}
      {travelOpen && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div role="dialog" aria-modal="true" aria-label="World travel" className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-800 shadow-xl">
          <h2 className="text-lg font-bold">{inTown ? 'Return to your private farm' : 'Visit H2H Town'}</h2>
          <p className="my-3 text-sm">{inTown ? 'Return home to tend your crops. Your bag and coins come with you.' : 'Explore the town plaza, meet the townspeople, and visit Meadow Shop and H2H Shop. Your farm progress is preserved.'}</p>
          <p className="mb-4 text-xs text-slate-500">Your existing farm and H2H Town stay available.</p><Link to="/game-3d?world=osm-kl" className="mb-4 block rounded-xl border border-teal-200 bg-teal-50 p-3 font-semibold text-teal-900">Explore Kuala Lumpur · OpenStreetMap<span className="mt-1 block text-xs font-normal">New city-centre map · Solo exploration preview</span></Link>
          <div className="flex gap-2"><button type="button" onClick={travel} className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white">{inTown ? 'Go home' : 'Go to town'}</button><button type="button" onClick={() => setTravelOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2">Cancel</button></div>
        </div>
      </div>}
      {townNpc && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
        <div role="dialog" aria-modal="true" aria-label="Town conversation" className="w-full max-w-sm rounded-2xl bg-amber-50 p-6 text-slate-800 shadow-xl"><h2 className="font-bold">{townNpc.name}</h2><p className="my-4 text-sm leading-relaxed">{townNpc.text}</p><button type="button" onClick={() => setTalkingTo(null)} className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white">See you!</button></div>
      </div>}
      {objectMenu&&<div aria-hidden="true" className="absolute inset-0 bg-black/10" style={{zIndex:18000000}} onPointerDown={event=>{event.stopPropagation();setObjectMenu(null);setActionMenu(null);controls.current.clear();}}/>}
      {actionMenu&&<div role="dialog" aria-label="3D plant actions" className="game-plant-actions absolute bottom-32 left-1/2 z-30 w-[min(92vw,300px)] -translate-x-1/2 border-4 border-[#b99a68] bg-[#514130] p-4 text-[#fff0c8] shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="font-bold">{menuPlant?'Carrot plant':'Tilled soil'}</h2><button type="button" onClick={()=>setActionMenu(null)} aria-label="Close 3D plant actions">×</button></div>
        <p className="my-3 text-xs text-[#dbc9a5]">{menuPlant?`Stage ${menuPlant.stage} of 3 · ${menuPlant.stage===3?'Ready to harvest':menuPlant.watered?'Growing':'Needs watering'}`:'No crop planted'}</p>
        <div className="grid grid-cols-2 gap-2"><button disabled={!menuPlant||menuPlant.stage!==3} onClick={()=>{if(gameIdentity.client){void performFarmAction('harvest',actionMenu);setActionMenu(null);return;}const result=harvestCrop3D(save,actionMenu,Date.now());if(result.changed){setSave(result.state);animateTool('harvest',LAND_TILES_3D.find(tile=>tile.key===actionMenu));}setHint(result.message);setActionMenu(null);}} className="border-2 border-[#927653] bg-[#45633c] px-2 py-2 text-xs font-bold disabled:opacity-40">Harvest</button>
          <button disabled={isVisiting} onClick={()=>{if(gameIdentity.client){void performFarmAction('restore',actionMenu);setActionMenu(null);return;}const plants={...save.plants},soil={...save.soil};delete plants[actionMenu];delete soil[actionMenu];setSave({...save,plants,soil});setHint('Plot restored to grass');setActionMenu(null);}} className="border-2 border-[#927653] bg-[#813f33] px-2 py-2 text-xs font-bold">Restore grass</button></div>
      </div>}
      <Inventory3D open={inventoryOpen} save={save} onChange={setSave} onClose={() => closeDialog(setInventoryOpen)} />
      <CoopDialog3D coopId={coopOpen} save={save} now={now} message={coopMessage} onClose={()=>{setCoopOpen(null);controls.current.clear();}} onAction={action=>{
        if(!coopOpen)return;
        const result=action==='place'?placeChicken3D(save,coopOpen):action==='feed'?feedChickens3D(save,coopOpen,Date.now()):action==='return'?returnChickenToBag3D(save,coopOpen):collectEggs3D(save,coopOpen,Date.now());
        if(result.changed)setSave(result.state);setCoopMessage(result.message);
      }}/>
      <WorldShopDialog3D onManage={setManagedShop} shop={shopOpen||h2hOpen||catMode?activeShop:null} title={getTownObject3D(permissions.town,activeShop)?.name??'Shop'} save={save} request={permissions.request} onChange={setSave} onClose={()=>{setShopOpen(false);setH2HOpen(false);setCatMode(null);controls.current.clear();}}/>
      {editing && <FarmCameraControls3D indoor={houseEdit.active} onAction={action => { editCameraControl.current = houseEdit.active&&action==='reset'?{...freshFarmCamera3D(),zoom:4}:adjustFarmCamera3D(editCameraControl.current, action); }} />}
      {inHouse&&houseWorld.error&&<p role="alert" className="absolute bottom-24 left-4 z-50 rounded bg-red-50 p-3 text-sm text-red-800">{houseWorld.error}</p>}
      {houseEdit.active&&<HouseEditorPanel3D editor={houseEditorUi} houseId={save.interiorHouseId}/>}
      {farmDraft && <FarmEditor3D tool={editTool} houseStyle={houseStyle} onHouseStyle={setHouseStyle} dirty={farmDraft !== save.farmLayout} canUndo={editHistory.length > 0} message={editMessage}
        onTool={tool => { finishFarmPaint(); setHoveredMeshObject(null); setSelectedObject(null); setMovingObject(false); setEditTool(tool); setEditMessage(tool === 'house' ? 'Click a clear area to build a new house. Press R to rotate the preview.' : tool === 'fence' ? 'Place fences on neighbouring tiles. Rows and corners connect automatically to form an enclosure.' : 'Click a tile to place your selection. Green means valid; red means protected.'); }}
        onUndo={() => { const previous = editHistory.at(-1); if (previous) { setFarmDraft(previous); setSelectedObject(null); setMovingObject(false); setEditHistory(history => history.slice(0,-1)); setEditMessage('Last edit undone.'); } }}
        onCancel={cancelFarmEditing}
        onSave={() => {
          if (!farmDraft) return;
          const endedAt = Date.now();
          const layout=paintStroke.current?.state.farmLayout??farmDraft;
          finishFarmPaint();
          const next = resolveFarmPlayerPosition3D(resumeFarmTime3D({ ...save, farmLayout: layout }, endedAt));
          try { persistOwnSave(next); }
          catch { setEditMessage('Could not save in this browser. Free storage and try again; your draft is still open.'); return; }
          controls.current.clear(); setNow(endedAt); setSave(next); setFarmDraft(null); setEditHistory([]); setEditTile(null);
          setHint('Farm layout saved. Time resumed. Visit H2H Town to buy and sell at Meadow Shop.');
        }} />}
      {merchantOpen&&<MerchantCenter3D initialApplication={requestedApplication} initialPlot={requestedShopPlot} key={`merchant:${gameIdentity.userId}`} request={permissions.request} admin={permissions.role==='admin'} onClose={()=>{setMerchantOpen(false);setRequestedApplication(null);controls.current.clear();}}/>}
      {managedShop&&<ShopProductsEditor3D shop={managedShop} request={permissions.request} onClose={()=>setManagedShop(null)}/>}
      {adminOpen&&permissions.role==='admin'&&<AdminWorldTools3D request={permissions.request} onClose={()=>setAdminOpen(false)}/>}

    </section>
  );
}
