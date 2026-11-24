-- Automatically close unpaid orders after the five-minute checkout window.
-- Updating pending -> cancelled also releases any product point reservations
-- through the member_orders_release_point_reservations trigger.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.cancel_expired_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_count integer;
BEGIN
  UPDATE public.member_orders
  SET status = 'cancelled',
      failure_reason = 'payment_timeout_5m'
  WHERE status = 'pending'
    AND created_at <= now() - interval '5 minutes';

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  RETURN v_cancelled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expired_pending_orders() FROM PUBLIC, anon, authenticated;

-- Replace an existing job with the same name so this migration is repeatable.
DO $migration$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'cancel-unpaid-orders-after-5m'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'cancel-unpaid-orders-after-5m',
    '30 seconds',
    $job$SELECT public.cancel_expired_pending_orders();$job$
  );
END;
$migration$;
