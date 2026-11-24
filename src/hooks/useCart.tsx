import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import useAuth from '@/hooks/useAuth';

const LEGACY_STORAGE_KEY = 'h2h_cart_v1';
const STORAGE_KEY_PREFIX = 'h2h_cart_v1:';

type CartContextValue = {
  lines: CartLine[];
  productIds: number[];
  count: number;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  has: (productId: number) => boolean;
  quantity: (productId: number) => number;
};

export type CartLine = { productId: number; quantity: number };

const CartContext = createContext<CartContextValue | null>(null);

function readCart(storageKey: string): CartLine[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(stored)) return [];
    const lines = new Map<number, number>();
    for (const item of stored) {
      const productId = typeof item === 'number' ? item : Number(item?.productId);
      const quantity = typeof item === 'number' ? 1 : Number(item?.quantity ?? 1);
      if (Number.isInteger(productId) && productId > 0 && Number.isInteger(quantity) && quantity > 0) {
        lines.set(productId, Math.min(99, (lines.get(productId) ?? 0) + quantity));
      }
    }
    return Array.from(lines, ([productId, quantity]) => ({ productId, quantity }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();
  const storageKey = `${STORAGE_KEY_PREFIX}${isAuthReady ? user?.id ?? 'guest' : 'loading'}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!isAuthReady) return;
    // Older versions stored one cart for the whole browser, which could mix
    // items between accounts. Discard that shared key and load this account's cart.
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore storage errors */ }
    setLines(readCart(storageKey));
  }, [isAuthReady, storageKey]);

  useEffect(() => {
    if (!isAuthReady) return;
    const syncCart = (event: StorageEvent) => {
      if (event.key === storageKey) setLines(readCart(storageKey));
    };
    window.addEventListener('storage', syncCart);
    return () => window.removeEventListener('storage', syncCart);
  }, [isAuthReady, storageKey]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const save = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }, [storageKey]);

  const add = useCallback((productId: number, quantity = 1) => {
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) return;
    setShowAddedToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowAddedToast(false), 2400);
    setLines((current) => {
      const found = current.find((line) => line.productId === productId);
      const next = found
        ? current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line)
        : [...current, { productId, quantity: Math.min(99, quantity) }];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore storage errors */ }
      return next;
    });
  }, [storageKey]);

  const remove = useCallback((productId: number) => {
    setLines((current) => {
      const next = current.filter((line) => line.productId !== productId);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore storage errors */ }
      return next;
    });
  }, [storageKey]);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    setLines((current) => {
      const next = current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(99, quantity) } : line);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore storage errors */ }
      return next;
    });
  }, [remove, storageKey]);

  const clear = useCallback(() => save([]), [save]);

  const productIds = useMemo(() => lines.map((line) => line.productId), [lines]);
  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const value = useMemo<CartContextValue>(() => ({
    lines,
    productIds,
    count,
    add,
    setQuantity,
    remove,
    clear,
    has: (productId) => productIds.includes(productId),
    quantity: (productId) => lines.find((line) => line.productId === productId)?.quantity ?? 0,
  }), [lines, productIds, count, add, setQuantity, remove, clear]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {showAddedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-foreground-900 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          商品已加入购物车
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside CartProvider');
  return cart;
}
