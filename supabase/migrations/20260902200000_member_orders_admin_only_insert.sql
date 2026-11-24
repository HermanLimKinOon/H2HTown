-- Lock down "purchases" until a real payment flow exists.
--
-- `member_orders` is written directly from the browser with status='completed'
-- and a client-supplied amount -- there is no payment step. Until one is built,
-- only admins (the same `is_admin()` gate the h2hadmin panel uses) may create
-- orders. Everyone else can still read their own history.
--
-- Depends on: 20260827063000_admin_emails_and_is_admin.sql (is_admin()).
-- Safe to run more than once.

-- Drop the old "any member can insert their own row" policy.
DROP POLICY IF EXISTS "member_orders_insert_own" ON public.member_orders;

-- `anon` never needs to write orders (is_admin() is false without a JWT, and
-- there is no anon policy). Keep the grant footprint tight; `authenticated` MUST
-- retain INSERT so the admin-only policy below can still apply to admins.
REVOKE INSERT ON TABLE "public"."member_orders" FROM "anon";

-- Replace it with an admin-only insert policy. The row must still belong to the
-- admin's own member record, matching the previous ownership constraint.
DROP POLICY IF EXISTS "member_orders_insert_admin" ON public.member_orders;
CREATE POLICY "member_orders_insert_admin" ON public.member_orders
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    public.is_admin()
    AND member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  );
