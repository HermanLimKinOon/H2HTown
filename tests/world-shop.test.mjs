import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {readFile} from 'node:fs/promises';
const cache=new Map();async function mod(url){if(cache.has(url.href))return cache.get(url.href);let js=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const match of [...js.matchAll(/from ['"](\.[^'"]+)['"]/g)])js=js.replaceAll(match[0],'from '+JSON.stringify(await mod(new URL(match[1]+'.ts',url))));const result='data:text/javascript;base64,'+Buffer.from(js).toString('base64');cache.set(url.href,result);return result;}
const shop=await import(await mod(new URL('../src/pages/game3d/worldShop3D.ts',import.meta.url)));const game=await import(await mod(new URL('../src/pages/game3d/game3d.ts',import.meta.url)));
const product={id:'feed',kind:'item',reference:'chickenFeed',name:'Premium feed',image:'/game3d/items/chicken-feed.svg',description:'',active:true,buyPrice:7,sellPrice:2,available:true};
test('saved game-shop prices drive inventory and coin changes',()=>{const start={...game.freshGame3DSave(),coins:30};const bought=shop.tradeWorldShop3D(start,product,'buy',2);assert.equal(bought.changed,true);assert.equal(bought.state.coins,16);assert.equal(bought.state.inventory.chickenFeed,2);const sold=shop.tradeWorldShop3D(bought.state,product,'sell',1);assert.equal(sold.state.coins,18);assert.equal(sold.state.inventory.chickenFeed,1);});
test('disabled products, invalid prices, unavailable actions and website products cannot mutate coins',()=>{for(const change of [{active:false},{available:false},{buyPrice:-1},{buyPrice:NaN},{buyPrice:null},{kind:'website'}])assert.equal(shop.tradeWorldShop3D({...game.freshGame3DSave(),coins:100},{...product,...change},'buy',1).changed,false);assert.equal(shop.tradeWorldShop3D(game.freshGame3DSave(),product,'sell',999).changed,false);});
test('image inputs reject script URLs and remote private networks',()=>{for(const image of ['javascript:alert(1)','data:image/svg+xml,x','http://bad.test/a','https://127.0.0.1/a','//bad.test/a','/../secret'])assert.equal(shop.safeShopImage3D(image),false,image);for(const image of ['/game/items/wood.svg','https://cdn.example.com/product.png'])assert.equal(shop.safeShopImage3D(image),true);});
test('market buildings support product management while ordinary houses do not',()=>{assert.equal(shop.isWorldShop3D({kind:'shop'}),true);assert.equal(shop.isWorldShop3D({kind:'building',style:'market'}),true);assert.equal(shop.isWorldShop3D({kind:'building',style:'cottage'}),false);});
test('cat purchases respect custom catalogue prices and ownership limits',()=>{const cat={...product,kind:'cat',reference:'ginger',buyPrice:25,sellPrice:null};const start={...game.freshGame3DSave(),coins:30};const bought=shop.tradeWorldShop3D(start,cat,'buy',1);assert.equal(bought.changed,true);assert.equal(bought.state.coins,5);assert.equal(bought.state.cats.length,1);assert.equal(shop.tradeWorldShop3D(start,cat,'sell',1).changed,false);});
test('a quote must be reviewed again if price or delivered item changes',()=>{assert.equal(shop.sameWorldShopOffer3D(product,{...product,name:'Renamed feed'}),true);for(const changed of [{buyPrice:99},{sellPrice:9},{kind:'cat'},{reference:'chicken'}])assert.equal(shop.sameWorldShopOffer3D(product,{...product,...changed}),false);});

const town=await import(await mod(new URL('../src/pages/game3d/townCustomization3D.ts',import.meta.url)));
test('legacy H2H storefronts retain independent catalogues and rotated collision',()=>{
 const placed=town.placeTownBuilding3D(town.freshTownLayout3D(),'h2h',{x:19,z:18},1);
 assert.equal(placed.changed,true);
 const layout=town.normalizeTownLayout3D(placed.layout),object=town.getTownObject3D(layout,'building-1');
 assert.equal(object.style,'h2h');assert.equal(object.name,'H2H Shop');
 assert.equal(shop.isWorldShop3D(object),true);assert.equal(shop.worldShopCatalogueId3D(object),'building-1');
 assert.equal(shop.worldShopCatalogueId3D({id:'building-2',kind:'building',style:'market'}),'building-2');
 assert.ok(town.townObstacles3D(layout).some(o=>o.x===19&&o.z===18&&o.width===4&&o.depth===5));
 assert.equal(town.deleteTownObject3D(layout,'building-1').changed,true);
});

test('new shops keep their own name and catalogue when moved and reloaded',()=>{
 const placed=town.placeTownBuilding3D(town.freshTownLayout3D(),'shop',{x:19,z:18},0);
 assert.equal(placed.changed,true);
 const named=town.renameTownShop3D(placed.layout,'building-1','  Bloom Store  ');
 assert.equal(named.changed,true);
 const moved=town.moveTownObject3D(named.layout,'building-1',{x:19,z:18},1);
 const object=town.getTownObject3D(town.normalizeTownLayout3D(moved.layout),'building-1');
 assert.equal(object.name,'Bloom Store');assert.equal(shop.worldShopCatalogueId3D(object),'building-1');assert.equal(shop.isWorldShop3D(object),true);
 assert.equal(town.renameTownShop3D(named.layout,'building-1',' ').changed,false);
 assert.equal(town.renameTownShop3D(named.layout,'portal','Oops').changed,false);
});

test('admin-created empty shop plots reserve land but remain walkable until assigned',()=>{
 const placed=town.placeTownBuilding3D(town.freshTownLayout3D(),'plot',{x:19,z:18},1);
 assert.equal(placed.changed,true);
 const layout=town.normalizeTownLayout3D(placed.layout),object=town.getTownObject3D(layout,'building-1');
 assert.equal(object.style,'plot');assert.equal(shop.isWorldShop3D(object),false);
 assert.equal(town.townObstacles3D(layout).some(o=>o.x===19&&o.z===18),false);
 assert.equal(town.placeTownBuilding3D(layout,'shop',{x:19,z:18},0).changed,false);
 assert.equal(town.renameTownShop3D(layout,'building-1','East lot').changed,true);
});
