import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '@/lib/supabase';

export interface MemberOrder {
  id: number;
  member_id: number;
  order_type: 'product' | 'course' | string;
  item_id: number;
  item_name: string;
  amount: number; // stored in cents (sen)
  status: string; // 'completed' | 'pending' | 'failed' | 'expired' | 'cancelled'
  created_at: string;
  currency?: string | null;
  paid_at?: string | null;
  provider?: string | null;
  failure_reason?: string | null;
  points_redeemed?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address_line?: string | null;
  shipping_address_unit?: string | null;
  shipping_postal_code?: string | null;
  shipping_area?: string | null;
}

/**
 * Load the current member's order history from `member_orders`.
 * Returns an empty list (not error) when the member is unknown, so callers
 * can render an empty state instead of an error page.
 */
export function useMyOrders(memberId: number | null | undefined) {
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!memberId) {
      setOrders([]);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('member_orders')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setOrders((data ?? []) as MemberOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { orders, loading, error, reload: load };
}
