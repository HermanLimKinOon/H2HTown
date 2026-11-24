import type {Game3DSave,GameAction3D} from './game3d';
import {buyCat3D} from './cats3D';
export type WorldShopId3D='meadow'|'cats'|'h2h'|`building-${number}`;
export type ShopItem3D='carrot'|'wood'|'petFood'|'chicken'|'chickenFeed'|'egg';
export type WorldShopProduct3D={id:string;kind:'item'|'cat'|'website';reference:string;name:string;image:string;description:string;active:boolean;buyPrice:number|null;sellPrice:number|null;originalPrice?:number;category?:string;available?:boolean};
export type WorldShopCatalog3D={shop:WorldShopId3D;version:number;website?:boolean;canManage?:boolean;title?:string;products:WorldShopProduct3D[]};
export const SHOP_ITEMS_3D=[{id:'carrot',name:'Carrot'},{id:'wood',name:'Wood'},{id:'petFood',name:'Pet food'},{id:'chicken',name:'Chicken'},{id:'chickenFeed',name:'Chicken feed'},{id:'egg',name:'Egg'}] as const;
export function safeShopImage3D(value:string):boolean{
 if(value==='')return true;
 if(/^\/(game3d|game|images|assets)\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.split('/').includes('..'))return true;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/^(?:[\d.:\[\]]|localhost(?:\.|$))/i.test(u.hostname)&&!/(?:\.local|\.localhost|\.internal)$/.test(u.hostname)&&u.hostname.includes('.');}catch{return false;}
}
export function tradeWorldShop3D(state:Game3DSave,product:WorldShopProduct3D,action:'buy'|'sell',quantity=1):GameAction3D{
 const reject=(message:string)=>({state,changed:false,message});
 const price=action==='buy'?product.buyPrice:product.sellPrice;
 if(!product.active||product.available===false||product.kind==='website'||price===null||!Number.isSafeInteger(price)||price<0||price>1000000)return reject('This product is unavailable.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)return reject('Choose a valid quantity.');
 if(product.kind==='cat'){if(action!=='buy'||quantity!==1)return reject('Choose one companion at a time.');return buyCat3D(state,product.reference,price);}
 if(!SHOP_ITEMS_3D.some(item=>item.id===product.reference))return reject('Unsupported inventory item.');
 const item=product.reference as ShopItem3D,total=price*quantity;
 if(!Number.isSafeInteger(total))return reject('Choose a smaller quantity.');
 if(action==='buy'){
  if(state.coins<total)return reject('Not enough coins.');
  if(state.inventory[item]+quantity>1000000)return reject('Item quantity limit reached.');
  let bag=state.bag;if(!bag.includes(item)){const index=bag.indexOf(null);if(index<0)return reject('Your bag is full.');bag=[...bag];bag[index]=item;}
  return {state:{...state,bag,coins:state.coins-total,inventory:{...state.inventory,[item]:state.inventory[item]+quantity}},changed:true,message:`Bought ${quantity} ${product.name}.`};
 }
 if(state.inventory[item]<quantity)return reject(`Not enough ${product.name}.`);
 if(!Number.isSafeInteger(state.coins+total))return reject('Coin limit reached.');
 return {state:{...state,coins:state.coins+total,inventory:{...state.inventory,[item]:state.inventory[item]-quantity}},changed:true,message:`Sold ${quantity} ${product.name}.`};
}

export function isWorldShop3D(object:{kind:string;style?:string}|null):boolean{return Boolean(object&&(object.kind==='shop'||object.kind==='building'&&(object.style==='market'||object.style==='h2h'||object.style==='shop')));}
export function sameWorldShopOffer3D(a:WorldShopProduct3D,b:WorldShopProduct3D):boolean{return a.kind===b.kind&&a.reference===b.reference&&a.buyPrice===b.buyPrice&&a.sellPrice===b.sellPrice;}

// Every physical shop keeps its own catalogue; checkout uses the shared website cart.
export function worldShopCatalogueId3D(object:{id:string;style?:string}):WorldShopId3D{return object.id as WorldShopId3D;}
