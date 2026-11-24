import { useEffect, useRef, useState } from 'react';
import { assetUrl, gameAssets } from './assets';
import type { GrowthSettings } from './growth';
import { assignHotbarItem, buildInventorySlots, clearHotbarSlot, gameItemIds, type GameItemId, type HotbarSlots } from './inventory';

const itemDefinitions: Record<GameItemId, { name: string; image: string }> = {
  hoe: { name: 'Hoe', image: gameAssets.hoe },
  wateringCan: { name: 'Watering can', image: gameAssets.wateringCan },
  seeds: { name: 'Carrot seeds', image: gameAssets.seeds },
  carrot: { name: 'Carrot', image: gameAssets.carrot },
  petFood: { name: 'Pet food', image: gameAssets.petFood },
  axe: { name: 'Axe', image: gameAssets.axe },
  wood: { name: 'Wood', image: gameAssets.wood },
};

type Selection = number | 'cursor';

export default function Hotbar({ onSelect, onInventoryChange, hotbar, onHotbarChange, carrotCount, petFoodCount, woodCount, coins, growth, onGrowthChange }: {
  onSelect: (item: GameItemId | null) => void;
  onInventoryChange: (open: boolean) => void;
  hotbar: HotbarSlots;
  onHotbarChange: (hotbar: HotbarSlots) => void;
  carrotCount: number;
  petFoodCount: number;
  woodCount: number;
  coins: number;
  growth: GrowthSettings;
  onGrowthChange: (settings: GrowthSettings) => void;
}) {
  const quantityFor = (id: GameItemId) => id === 'seeds' ? '∞' : id === 'carrot' ? carrotCount : id === 'petFood' ? petFoodCount : id === 'wood' ? woodCount : undefined;
  const inventorySlots = buildInventorySlots(gameItemIds, 24);
  const [selected, setSelected] = useState<Selection>(0);
  const [assignmentSlot, setAssignmentSlot] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    onInventoryChange(inventoryOpen);
    const dialog = dialogRef.current;
    if (inventoryOpen && !dialog?.open) dialog?.showModal();
    if (!inventoryOpen && dialog?.open) dialog.close();
  }, [inventoryOpen, onInventoryChange]);
  useEffect(() => { onSelect(selected === 'cursor' ? null : hotbar[selected]); }, [selected, hotbar, onSelect]);
  useEffect(() => {
    const selectSlot = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        if (!event.repeat) setInventoryOpen(open => !open);
        return;
      }
      if (dialogRef.current?.open) return;
      if (event.key === '0') {
        event.preventDefault();
        setSelected('cursor');
      } else if (/^[1-8]$/.test(event.key)) {
        event.preventDefault();
        setSelected(Number(event.key) - 1);
      }
    };
    window.addEventListener('keydown', selectSlot);
    return () => window.removeEventListener('keydown', selectSlot);
  }, []);

  const selectedItem = selected === 'cursor' ? null : hotbar[selected];
  const selectedLabel = selected === 'cursor' ? 'Empty hands' : selectedItem ? itemDefinitions[selectedItem].name : 'Empty slot';
  const focusGame = (element: HTMLElement) => element.closest('section')?.querySelector('canvas')?.focus({ preventScroll: true });

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="inventory-title"
        onClose={() => setInventoryOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setInventoryOpen(false); }}
        className="fixed inset-0 z-[100] m-auto max-h-[85dvh] w-[min(92vw,600px)] overflow-y-auto border-4 border-[#b49a6a] bg-[#554332] p-0 text-[#fff0c8] shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="inventory-title" className="font-heading text-2xl font-bold">Inventory</h2>
              <p className="mt-1 text-xs text-[#dbc9a5]">Choose a hotbar slot, then choose the item to place in it.</p>
              <p className="mt-2 text-sm text-[#fff0c8]" role="status" aria-live="polite">🪙 {coins} coins · {carrotCount} carrots · {woodCount} wood · {petFoodCount} pet food</p>
            </div>
            <button type="button" autoFocus onClick={() => setInventoryOpen(false)} aria-label="Close inventory" className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#b49a6a] bg-[#3d3026] text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-bold">Hotbar setup</legend>
            <div role="group" aria-label="Choose hotbar slot to configure" className="grid grid-cols-8 gap-1.5">
              {hotbar.map((itemId, index) => {
                const item = itemId ? itemDefinitions[itemId] : null;
                return (
                  <button key={index} type="button" aria-label={`Configure slot ${index + 1}: ${item?.name ?? 'Empty'}`} aria-pressed={assignmentSlot === index}
                    onClick={() => setAssignmentSlot(index)}
                    className={`relative flex aspect-square items-center justify-center border-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${assignmentSlot === index ? 'border-[#ffe2a1] bg-[#ae8e5c]' : 'border-[#9c805a] bg-[#3d3026] hover:bg-[#715a40]'}`}>
                    <span className="absolute left-1 top-1 text-[9px]">{index + 1}</span>
                    {item && <img src={assetUrl(item.image)} alt="" draggable={false} className="h-2/3 w-2/3 object-contain [image-rendering:pixelated]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span>Assigning to slot <strong>{assignmentSlot + 1}</strong></span>
              <button type="button" onClick={() => onHotbarChange(clearHotbarSlot(hotbar, assignmentSlot))}
                className="border-2 border-[#9c805a] bg-[#3d3026] px-3 py-1.5 hover:bg-[#715a40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Clear slot</button>
            </div>
          </fieldset>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6" role="grid" aria-label="Bag inventory">
            {inventorySlots.map((itemId, inventoryIndex) => {
              if (!itemId) return (
                <button key={inventoryIndex} type="button" disabled aria-label={`Empty inventory slot ${inventoryIndex + 1}`}
                  className="relative flex aspect-square items-center justify-center border-[3px] border-[#9c805a] bg-[#3d3026] opacity-50" />
              );
              const item = itemDefinitions[itemId];
              const quantity = quantityFor(itemId);
              const assignedSlot = hotbar.indexOf(itemId);
              return (
                <button key={itemId} type="button"
                  aria-label={`${item.name}${quantity !== undefined ? `, ${quantity === '∞' ? 'unlimited' : quantity}` : ''}, assign to slot ${assignmentSlot + 1}`}
                  title={`Place ${item.name} in slot ${assignmentSlot + 1}`}
                  onClick={() => onHotbarChange(assignHotbarItem(hotbar, assignmentSlot, itemId))}
                  className="relative flex aspect-square items-center justify-center border-[3px] border-[#9c805a] bg-[#3d3026] hover:bg-[#715a40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  <img src={assetUrl(item.image)} alt="" draggable={false} className="h-3/4 w-3/4 object-contain [image-rendering:pixelated]" />
                  {assignedSlot >= 0 && <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[9px]">{assignedSlot + 1}</span>}
                  {quantity !== undefined && <span className="absolute bottom-0.5 right-1 text-xs font-bold">{quantity}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[#dbc9a5]">An item can appear once. Assigning it again swaps its old position with the selected slot.</p>

          <fieldset className="mt-4 border-t border-[#9c805a] pt-3">
            <legend className="text-sm font-bold">Growth timing</legend>
            <p className="mb-2 text-xs text-[#dbc9a5]">Seconds per stage. Changes apply to existing plants and trees. Stage 3 stays ready until harvested or chopped.</p>
            <div className="grid grid-cols-2 gap-3">
              {(['carrotSeconds', 'treeSeconds'] as const).map(key => (
                <label key={key} className="text-xs">{key === 'carrotSeconds' ? 'Carrot' : 'Tree'} · seconds per stage
                  <input type="number" min="1" step="1" value={growth[key]}
                    onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1) onGrowthChange({ ...growth, [key]: value }); }}
                    className="mt-1 block w-full border-2 border-[#b49a6a] bg-[#3d3026] p-2 text-[#fff0c8]" />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </dialog>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/20 bg-[#382f28]/35 px-2 pb-3 pt-2 text-[#fff0c8] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-[2px]">
        <div className="mx-auto mb-1.5 flex max-w-[610px] items-center justify-between gap-2 px-1 text-[10px] font-semibold sm:text-xs">
          <span role="status" aria-live="polite">{selectedLabel}</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-white/70 sm:inline">Empty hands: 0 · Slots: 1–8</span>
            <button type="button" aria-haspopup="dialog" aria-expanded={inventoryOpen} onClick={() => setInventoryOpen(open => !open)} className="flex items-center gap-1.5 border border-white/35 bg-black/25 px-2 py-1 hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <i className="ri-shopping-bag-3-line" aria-hidden="true" /> Bag <span className="text-white/70">[I]</span>
            </button>
          </div>
        </div>
        <div role="group" aria-label="Item hotbar" className="mx-auto grid max-w-[610px] grid-cols-9 gap-1 sm:gap-2">
          <button type="button" aria-label="Cursor: empty hands" aria-pressed={selected === 'cursor'} title="0 · Empty hands"
            onClick={(event) => { setSelected('cursor'); if (event.detail > 0) focusGame(event.currentTarget); }}
            className={`relative flex aspect-square min-w-0 items-center justify-center border-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected === 'cursor' ? 'border-[#ffe2a1] bg-white/30 shadow-[inset_0_0_0_2px_rgba(104,77,52,0.55)]' : 'border-white/35 bg-black/20 hover:bg-white/20'}`}>
            <span className="absolute left-0.5 top-0 text-[8px] leading-none sm:left-1 sm:top-1 sm:text-[10px]">0</span>
            <i className="ri-cursor-line text-xl drop-shadow-[1px_2px_0_rgba(0,0,0,0.45)] sm:text-2xl" aria-hidden="true" />
          </button>
          {hotbar.map((itemId, index) => {
            const item = itemId ? itemDefinitions[itemId] : null;
            const active = selected === index;
            const quantity = itemId ? quantityFor(itemId) : undefined;
            return (
              <button key={index} type="button"
                aria-label={`Slot ${index + 1}: ${item?.name ?? 'Empty'}${quantity === '∞' ? ', unlimited' : quantity !== undefined ? `, ${quantity}` : ''}`}
                aria-pressed={active} title={`${index + 1} · ${item?.name ?? 'Empty slot'}`}
                onClick={(event) => { setSelected(index); if (event.detail > 0) focusGame(event.currentTarget); }}
                className={`relative flex aspect-square min-w-0 items-center justify-center border-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? 'border-[#ffe2a1] bg-white/30 shadow-[inset_0_0_0_2px_rgba(104,77,52,0.55)]' : 'border-white/35 bg-black/20 hover:bg-white/20'}`}>
                <span className="absolute left-0.5 top-0 text-[8px] leading-none sm:left-1 sm:top-1 sm:text-[10px]">{index + 1}</span>
                {item && <img src={assetUrl(item.image)} alt="" draggable={false} className="h-[75%] w-[75%] object-contain [image-rendering:pixelated] drop-shadow-[1px_2px_0_rgba(0,0,0,0.4)]" />}
                {quantity !== undefined && <span className="absolute bottom-0 right-0.5 text-[9px] font-bold leading-none text-white [text-shadow:1px_1px_#30281f] sm:bottom-1 sm:right-1 sm:text-xs">{quantity}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
