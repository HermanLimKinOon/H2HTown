import { useEffect, useRef, useState } from 'react';
import { assetUrl, gameAssets } from './assets';
import { SHOP_PRICES } from './economy';

type ShopDialogProps = {
  open: boolean;
  coins: number;
  carrots: number;
  petFood: number;
  wood: number;
  message: string;
  onClose: () => void;
  onSellCarrots: (quantity: number) => void;
  onSellWood: (quantity: number) => void;
  onBuyPetFood: () => void;
};

export default function ShopDialog({ open, coins, carrots, petFood, wood, message, onClose, onSellCarrots, onSellWood, onBuyPetFood }: ShopDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'buy' | 'sell'>('sell');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="shop-title"
      onClose={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-[110] m-auto w-[min(92vw,560px)] overflow-hidden border-4 border-[#c99b4c] bg-[#554332] p-0 text-[#fff0c8] shadow-2xl backdrop:bg-black/55"
    >
      <div className="border-b-4 border-[#c99b4c] bg-[#3d3026] px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="shop-title" className="font-heading text-2xl font-bold">Meadow Shop</h2>
            <p className="mt-1 text-sm text-[#ffd77e]" aria-label={`${coins} coins`}>🪙 {coins} coins</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shop" className="flex h-9 w-9 items-center justify-center border-2 border-[#b49a6a] bg-[#554332] text-xl hover:bg-[#715a40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div role="tablist" aria-label="Shop sections" className="mb-5 grid grid-cols-2 gap-2">
          {(['buy', 'sell'] as const).map(value => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`border-2 border-[#b49a6a] px-4 py-2 font-bold capitalize ${tab === value ? 'bg-[#ae8e5c] text-white' : 'bg-[#3d3026] hover:bg-[#715a40]'}`}
            >{value}</button>
          ))}
        </div>

        {tab === 'sell' ? (
          <section role="tabpanel" aria-label="Sell items" className="space-y-4 border-2 border-[#9c805a] bg-[#49392d] p-4">
            <div>
            <div className="flex items-center gap-4">
              <img src={assetUrl(gameAssets.carrot)} alt="Carrot" draggable={false} className="h-16 w-16 object-contain [image-rendering:pixelated]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Harvested carrot</h3>
                <p className="text-xs text-[#dbc9a5]">In bag: {carrots} · 🪙 {SHOP_PRICES.carrotSell} each</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={carrots < 1} onClick={() => onSellCarrots(1)} className="border-2 border-[#9c805a] bg-[#45633c] px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Sell 1</button>
              <button type="button" disabled={carrots < 1} onClick={() => onSellCarrots(carrots)} className="border-2 border-[#9c805a] bg-[#45633c] px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Sell all</button>
            </div>
            </div>
            <div className="border-t border-[#806b4e] pt-4">
              <div className="flex items-center gap-4">
                <img src={assetUrl(gameAssets.wood)} alt="Wood" draggable={false} className="h-16 w-16 object-contain [image-rendering:pixelated]" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">Chopped wood</h3>
                  <p className="text-xs text-[#dbc9a5]">In bag: {wood} · 🪙 {SHOP_PRICES.woodSell} each</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={wood < 1} onClick={() => onSellWood(1)} className="border-2 border-[#9c805a] bg-[#45633c] px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Sell 1</button>
                <button type="button" disabled={wood < 1} onClick={() => onSellWood(wood)} className="border-2 border-[#9c805a] bg-[#45633c] px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Sell all</button>
              </div>
            </div>
          </section>
        ) : (
          <section role="tabpanel" aria-label="Buy items" className="border-2 border-[#9c805a] bg-[#49392d] p-4">
            <div className="flex items-center gap-4">
              <img src={assetUrl(gameAssets.petFood)} alt="Pet food" draggable={false} className="h-16 w-16 object-contain [image-rendering:pixelated]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Pet food</h3>
                <p className="text-xs text-[#dbc9a5]">In bag: {petFood} · 🪙 {SHOP_PRICES.petFoodBuy}</p>
              </div>
              <button type="button" disabled={coins < SHOP_PRICES.petFoodBuy} onClick={onBuyPetFood} className="border-2 border-[#9c805a] bg-[#45633c] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Buy 1</button>
            </div>
          </section>
        )}

        <p className="mt-4 min-h-5 text-center text-sm font-semibold text-[#ffd77e]" role="status" aria-live="polite">{message}</p>
      </div>
    </dialog>
  );
}
