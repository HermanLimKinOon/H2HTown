-- Prevent buying the same course twice.
--
-- `member_orders` had no guard against duplicate course purchases, so a member
-- could end up with several completed rows for one course. That also broke the
-- get-lesson-video Edge Function, whose entitlement check expected at most one
-- matching row.
--
-- Safe to run more than once.

-- 1. Dedupe existing completed course orders: keep the earliest row per
--    (member_id, item_id), drop the rest.
DELETE FROM public.member_orders a
USING public.member_orders b
WHERE a.id > b.id
  AND a.member_id = b.member_id
  AND a.item_id   = b.item_id
  AND a.order_type = 'course'
  AND b.order_type = 'course'
  AND a.status = 'completed'
  AND b.status = 'completed';

-- 2. Enforce it going forward. Partial unique index so only *completed course*
--    orders are constrained -- product orders and non-completed rows are free.
CREATE UNIQUE INDEX IF NOT EXISTS member_orders_unique_completed_course
  ON public.member_orders (member_id, item_id)
  WHERE order_type = 'course' AND status = 'completed';
