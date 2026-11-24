-- member_orders: no anonymous access.
--
-- 20260918000000_restore_table_grants.sql left anon with SELECT (plus
-- TRUNCATE/REFERENCES/TRIGGER) on member_orders. Orders are only ever read by
-- the signed-in member, and the member_orders_own policy looks up `members`,
-- which anon can no longer read (20260918010000_lock_down_members_and_points),
-- so any anon query here failed with "permission denied for table members".

REVOKE ALL ON TABLE public.member_orders FROM "anon";
