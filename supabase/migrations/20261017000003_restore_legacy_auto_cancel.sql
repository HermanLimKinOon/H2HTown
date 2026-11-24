-- Restore the previous five-minute timeout behavior: the database cron
-- cancels every pending order after five minutes without querying Revenue Monster.

DO $migration$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname IN (
      'check-rm-status-before-cancel',
      'cancel-unpaid-orders-after-5m'
    )
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
