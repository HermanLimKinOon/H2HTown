import {useEffect,useRef,useState} from 'react';
import {useCart} from '@/hooks/useCart';
import {htmlToText} from '@/lib/sanitizeHtml';
import type {Game3DSave} from './game3d';
import {safeShopImage3D,sameWorldShopOffer3D,tradeWorldShop3D,type WorldShopCatalog3D,type WorldShopId3D,type WorldShopProduct3D,type ShopItem3D} from './worldShop3D';
import type {ShopRequest3D} from './ShopProductsEditor3D';
export default function WorldShopDialog3D({shop,title,save,request,onChange,onClose,onManage}:{shop:WorldShopId3D|null;title:string;save:Game3DSave;request:ShopRequest3D;onChange:(save:Game3DSave)=>void;onClose:()=>void;onManage?:(shop:WorldShopId3D)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),live=useRef({save,shop});live.current={save,shop};const busyRef=useRef(false);
 const [catalog,setCatalog]=useState<WorldShopCatalog3D|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[tab,setTab]=useState<'buy'|'sell'>('buy'),[busy,setBusy]=useState(false),[selected,setSelected]=useState('');
 const cart=useCart(),website=shop==='h2h'||catalog?.website===true;
 useEffect(()=>{if(!shop){dialog.current?.close();return;}dialog.current?.showModal();let stopped=false;setCatalog(null);setError('');setMessage('');setTab('buy');setSelected('');
  const load=async()=>{try{const next=await request('shop_read',shop);if(!stopped){setCatalog(next);setSelected(current=>next.products.some((p:WorldShopProduct3D)=>p.id===current)?current:'');setError('');}}catch(e){if(!stopped)setError(e instanceof Error?e.message:'Shop unavailable.');}};
  void load();const timer=setInterval(()=>void load(),10000);return()=>{stopped=true;clearInterval(timer);};
 },[request,shop]);
 const act=async(product:WorldShopProduct3D,quantity=1)=>{if(!shop||busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
  try{const next:WorldShopCatalog3D=await request('shop_read',shop);if(live.current.shop!==shop)return;setCatalog(next);const fresh=next.products.find(p=>p.id===product.id&&p.active&&p.available!==false);
   if(!fresh)throw Error('This product is no longer available.');
   if(!sameWorldShopOffer3D(fresh,product)){setMessage('The shop listing changed. Review the updated details and try again.');return;}
   if(fresh.kind==='website'){const id=Number(fresh.reference);if(!Number.isSafeInteger(id)||id<1)throw Error('Product unavailable.');cart.add(id);setMessage(`${fresh.name} added to your website cart.`);return;}
   const result=tradeWorldShop3D(live.current.save,fresh,tab,quantity);if(result.changed)onChange(result.state);setMessage(result.message);
  }catch(e){setError(e instanceof Error?e.message:'Shop unavailable.');}finally{busyRef.current=false;setBusy(false);}
 };
 const visibleProducts=catalog?.products.filter(p=>p.active&&p.available!==false)??[];
 const selectedProduct=visibleProducts.find(p=>p.id===selected);
 const price=(p:WorldShopProduct3D)=>website?`RM ${((p.buyPrice??0)/100).toFixed(2)}`:`${tab==='buy'?p.buyPrice:p.sellPrice} coins`;
 return <dialog ref={dialog} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClose={onClose} className="fixed inset-0 z-[115] m-auto max-h-[88dvh] w-[min(95vw,820px)] overflow-y-auto rounded-2xl border-4 border-amber-200 bg-[#fbf6e9] p-5 text-slate-800 shadow-2xl backdrop:bg-black/55">
  <header className="mb-4 flex justify-between"><div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm">{website?`Shop products · Cart: ${cart.count}`:`🪙 ${save.coins} coins`}</p></div>{catalog?.canManage&&shop&&onManage&&<button onClick={()=>onManage(shop)} className="ml-auto mr-3 rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white">Manage products</button>}<button aria-label="Close world shop" onClick={onClose} className="px-3 text-2xl">×</button></header>
  {!website&&<div role="tablist" aria-label="Shop sections" className="mb-4 flex gap-2">{(['buy','sell'] as const).map(value=><button role="tab" aria-selected={tab===value} key={value} onClick={()=>setTab(value)} className={`rounded-lg px-5 py-2 text-sm font-bold ${tab===value?'bg-teal-700 text-white':'bg-white'}`}>{value==='buy'?'Buy':'Sell'}</button>)}</div>}
  {!catalog&&!error&&<p>Loading shop products…</p>}
  {website?<div>
   <div role="list" aria-label="Shop products" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {visibleProducts.map(p=><article role="listitem" key={p.id} className={`flex min-w-0 flex-col rounded-xl border bg-white p-3 ${selected===p.id?'border-teal-700 ring-1 ring-teal-700':'border-amber-100'}`}>
     <button type="button" aria-label={`Preview ${p.name}`} aria-expanded={selected===p.id} onClick={()=>setSelected(selected===p.id?'':p.id)} className="flex flex-1 flex-col text-left">
      <img src={safeShopImage3D(p.image)&&p.image?p.image:'/game3d/houses/market.svg'} alt="" className="mb-3 aspect-square w-full rounded-lg bg-slate-50 object-contain p-2"/>
      <h3 className="break-words text-sm font-bold">{p.name}</h3><p className="mb-3 mt-1 text-sm font-bold text-teal-800">{price(p)}</p>
     </button>
     <button disabled={busy} onClick={()=>void act(p)} className="mt-auto rounded-lg bg-teal-700 px-2 py-2 text-sm font-bold text-white disabled:opacity-40">Buy · Add to cart</button>
    </article>)}
   </div>
   {selectedProduct&&<section aria-label="Product preview" className="relative mt-4 grid gap-4 rounded-xl border border-teal-200 bg-white p-4 sm:grid-cols-[180px_1fr]">
    <button aria-label="Close product preview" onClick={()=>setSelected('')} className="absolute right-2 top-1 px-2 text-xl">×</button>
    <img src={safeShopImage3D(selectedProduct.image)&&selectedProduct.image?selectedProduct.image:'/game3d/houses/market.svg'} alt={selectedProduct.name} className="h-44 w-full object-contain"/>
    <div className="pr-5"><h3 className="text-xl font-bold">{selectedProduct.name}</h3><p className="my-2 font-bold text-teal-800">{price(selectedProduct)}</p><p className="whitespace-pre-wrap break-words text-sm">{htmlToText(selectedProduct.description)}</p></div>
   </section>}
  </div>:<section role="tabpanel" aria-label={tab==='buy'?'Buy items':'Sell items'} className="grid grid-cols-2 gap-3 sm:grid-cols-3">{catalog?.products.filter(p=>p.active&&(tab==='buy'?p.buyPrice!==null:p.sellPrice!==null)).map(p=>{
   const count=p.kind==='cat'?save.cats.filter(cat=>cat.coat===p.reference).length:save.inventory[p.reference as ShopItem3D]??0;
   return <div key={p.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-amber-100 bg-white p-3"><img src={safeShopImage3D(p.image)&&p.image?p.image:'/game3d/houses/market.svg'} alt="" className="aspect-square w-full rounded-lg bg-slate-50 object-contain p-3"/><div className="min-w-0 flex-1 break-words"><h3 className="font-bold">{p.name}</h3><p className="text-xs text-slate-500">{htmlToText(p.description)}</p><p className="mt-1 text-xs">{price(p)} · {p.kind==='cat'?'Owned':'In bag'}: {count}</p></div><button disabled={busy||p.available===false||(tab==='buy'?save.coins<(p.buyPrice??0):count<1)} onClick={()=>void act(p)} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{tab==='buy'?`Buy ${p.name}`:'Sell 1'}</button>{tab==='sell'&&<button disabled={busy||count<1} onClick={()=>void act(p,count)} className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800 disabled:opacity-40">Sell all</button>}</div>;
  })}</section>}
  {catalog&&visibleProducts.length===0&&<p className="py-8 text-center text-sm">No products are available in this shop.</p>}
  {shop==='cats'&&<p className="mt-4 text-xs text-slate-500">Place companions using Edit house → Cats. Feed them at the pet bowl.</p>}
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<p role="status" className="mt-4 text-sm font-semibold text-teal-800">{message}</p>
 </dialog>;
}
