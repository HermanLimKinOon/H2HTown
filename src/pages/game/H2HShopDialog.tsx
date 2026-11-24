import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { htmlToText } from '@/lib/sanitizeHtml';
import { resolveShopProduct } from './h2hShopModel';

type H2HShopDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function H2HShopDialog({ open, onClose }: H2HShopDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { products, loading, error } = useProducts();
  const { add: addToCart, count: cartCount, quantity } = useCart();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('Select a product to preview it.');
  const selectedProduct = resolveShopProduct(products, selectedId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.id !== selectedId) setSelectedId(selectedProduct.id);
  }, [selectedId, selectedProduct]);

  const buySelectedProduct = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct.id);
    setMessage(`${selectedProduct.name} added to your cart.`);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="h2h-shop-title"
      onClose={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-[115] m-auto max-h-[88dvh] w-[min(95vw,900px)] overflow-hidden border-4 border-[#ef6f61] bg-[#f8efd9] p-0 text-[#263d38] shadow-2xl backdrop:bg-black/60"
    >
      <header className="flex items-center justify-between gap-4 border-b-4 border-[#ef6f61] bg-[#263d38] px-4 py-3 text-[#fff4d4] sm:px-6">
        <div>
          <h2 id="h2h-shop-title" className="font-heading text-2xl font-bold">H2H Shop</h2>
          <p className="mt-0.5 text-xs text-[#bfe8df]">Discover every H2H product · Cart: {cartCount}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close H2H shop" className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#fff4d4] bg-[#354f49] text-xl hover:bg-[#466b63] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
      </header>

      <div className="grid max-h-[calc(88dvh-76px)] grid-cols-1 overflow-y-auto md:grid-cols-[minmax(230px,34%)_1fr] md:overflow-hidden">
        <aside className="border-b-2 border-[#d6c49f] bg-[#eee0c2] p-3 md:max-h-[calc(88dvh-76px)] md:overflow-y-auto md:border-b-0 md:border-r-2">
          <h3 className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#765b3d]">All products ({products.length})</h3>
          {loading && products.length === 0 && <p className="p-2 text-sm">Loading products…</p>}
          {!loading && products.length === 0 && <p className="p-2 text-sm">No products available.</p>}
          <div className="space-y-1" role="list" aria-label="H2H product names">
            {products.map(product => (
              <div key={product.id} role="listitem">
                <button
                  type="button"
                  aria-pressed={selectedProduct?.id === product.id}
                  onClick={() => { setSelectedId(product.id); setMessage('Previewing this product.'); }}
                  className={`w-full border-2 px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef6f61] ${selectedProduct?.id === product.id ? 'border-[#ef6f61] bg-white text-[#9f3f39]' : 'border-transparent bg-[#f8efd9] hover:border-[#cfb98e] hover:bg-white'}`}
                >
                  <span className="block leading-snug">{product.name}</span>
                  <span className="mt-1 block text-xs font-normal text-[#765b3d]">RM {product.memberPrice.toFixed(2)}</span>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section aria-label="Product preview" className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {selectedProduct ? (
            <div className="grid gap-5 sm:grid-cols-[minmax(180px,45%)_1fr]">
              <div className="aspect-square overflow-hidden border-4 border-white bg-white shadow-md">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="text-xs font-bold uppercase tracking-wider text-[#d25249]">{selectedProduct.category}</p>
                <h3 className="mt-1 font-heading text-2xl font-bold leading-tight">{selectedProduct.name}</h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#d25249]">RM {selectedProduct.memberPrice.toFixed(2)}</span>
                  {selectedProduct.originalPrice > selectedProduct.memberPrice && <span className="text-sm text-[#806e58] line-through">RM {selectedProduct.originalPrice.toFixed(2)}</span>}
                </div>
                <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-[#5e5142]">{selectedProduct.description ? htmlToText(selectedProduct.description) : 'Preview this H2H product and add it to your shopping cart.'}</p>
                <p className="mt-3 text-xs font-semibold text-[#765b3d]">Currently in cart: {quantity(selectedProduct.id)}</p>
                <button type="button" onClick={buySelectedProduct} className="mt-4 w-full border-2 border-[#a93f39] bg-[#ef6f61] px-5 py-3 font-bold text-white shadow-[inset_0_-3px_0_rgba(120,40,35,.25)] hover:bg-[#dc5c54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#263d38]">
                  Buy · Add to cart
                </button>
              </div>
            </div>
          ) : <p className="py-16 text-center text-sm text-[#765b3d]">No product is available to preview.</p>}
          <p className="mt-5 min-h-5 text-center text-sm font-semibold text-[#a93f39]" role="status" aria-live="polite">{message}</p>
          {error && <p className="mt-1 text-center text-xs text-[#806e58]">Using the built-in catalogue while the live product list is unavailable.</p>}
        </section>
      </div>
    </dialog>
  );
}
