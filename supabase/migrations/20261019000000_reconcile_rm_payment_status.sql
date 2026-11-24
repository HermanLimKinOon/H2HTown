-- Reconcile orders even when the customer closes the browser. Successful RM
-- payments are confirmed; RM terminal failures are recorded; pending/processing
-- transactions remain pending so a delayed success is not lost.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

DO $migration$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname IN (
      'cancel-unpaid-orders-after-5m',
      'reconcile-rm-payment-status'
    )
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'reconcile-rm-payment-status',
    '30 seconds',
    $job$
      WITH config AS (
        SELECT
          max(decrypted_secret) FILTER (WHERE name = 'rm_auto_cancel_project_url') AS project_url,
          max(decrypted_secret) FILTER (WHERE name = 'rm_auto_cancel_secret') AS cron_secret,
          max(decrypted_secret) FILTER (WHERE name = 'rm_auto_cancel_apikey') AS publishable_key
        FROM vault.decrypted_secrets
        WHERE name IN ('rm_auto_cancel_project_url', 'rm_auto_cancel_secret', 'rm_auto_cancel_apikey')
      )
      SELECT net.http_post(
        url := rtrim(config.project_url, '/') || '/functions/v1/rm-auto-cancel-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', config.cron_secret,
          'apikey', config.publishable_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      )
      FROM config
      WHERE config.project_url IS NOT NULL
        AND config.cron_secret IS NOT NULL
        AND config.publishable_key IS NOT NULL
    $job$
  );
END;
$migration$;
