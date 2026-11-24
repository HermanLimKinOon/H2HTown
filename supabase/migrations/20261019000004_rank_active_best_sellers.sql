-- Rank only products currently visible in the shop.
CREATE OR REPLACE FUNCTION public.get_best_selling_product_ids()
RETURNS TABLE (product_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH completed_product_orders AS (
    SELECT oi.product_id, oi.order_id
    FROM public.member_order_items AS oi
    JOIN public.member_orders AS mo ON mo.id = oi.order_id
    JOIN public.products AS p ON p.id = oi.product_id AND p.active
    WHERE mo.order_type = 'product'
      AND mo.status = 'completed'

    UNION ALL

    SELECT mo.item_id::bigint AS product_id, mo.id AS order_id
    FROM public.member_orders AS mo
    JOIN public.products AS p ON p.id = mo.item_id AND p.active
    WHERE mo.order_type = 'product'
      AND mo.status = 'completed'
      AND NOT EXISTS (
        SELECT 1
        FROM public.member_order_items AS oi
        WHERE oi.order_id = mo.id
      )
  ),
  ranked AS (
    SELECT product_id, count(DISTINCT order_id) AS completed_order_count
    FROM completed_product_orders
    GROUP BY product_id
  )
  SELECT ranked.product_id
  FROM ranked
  ORDER BY ranked.completed_order_count DESC, ranked.product_id ASC
  LIMIT 3;
$$;
