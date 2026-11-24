import { useCallback, useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

/** Member-owned product favorites persisted in Supabase. */
export function useFavorites(memberId?: number | null) {
  const [productIds, setProductIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) {
      setProductIds([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('member_favorites')
      .select('product_id')
      .eq('member_id', memberId);
    if (queryError) setError(queryError.message);
    else setProductIds((data ?? []).map((row) => Number(row.product_id)));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = useCallback(async (productId: number) => {
    if (!memberId) return { error: 'Sign in to save favorites.' };
    setError(null);
    const isSaved = productIds.includes(productId);
    if (isSaved) {
      const { error: mutationError } = await supabase.from('member_favorites')
        .delete().eq('member_id', memberId).eq('product_id', productId);
      if (mutationError) {
        setError(mutationError.message);
        return { error: mutationError.message };
      }
      setProductIds((current) => current.filter((id) => id !== productId));
    } else {
      const { error: mutationError } = await supabase.from('member_favorites')
        .upsert(
          { member_id: memberId, product_id: productId },
          { onConflict: 'member_id,product_id', ignoreDuplicates: true },
        );
      if (mutationError) {
        setError(mutationError.message);
        return { error: mutationError.message };
      }
      setProductIds((current) => current.includes(productId) ? current : [...current, productId]);
    }
    return { error: null };
  }, [memberId, productIds]);

  return { productIds, loading, error, refresh, toggle, isFavorite: (id: number) => productIds.includes(id) };
}
