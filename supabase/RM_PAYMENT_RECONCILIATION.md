# Revenue Monster payment reconciliation

The checkout return page checks the order for up to five minutes. If the member
closes the browser, RM's webhook and this scheduled worker can still reconcile
the order. The worker runs every 30 seconds and:

- confirms the order when RM reports `SUCCESS`;
- records RM's terminal `FAILED`, `CANCELLED`, or `EXPIRED` status;
- leaves `PENDING`, `PROCESSING`, unknown, and unreachable transactions pending
  so a delayed RM success can still be confirmed.

## Local setup and database resets

`supabase db reset` rebuilds the local database and reapplies every migration.
It also clears database-stored Vault secrets. Your
`supabase/functions/.env.local` file is outside the database, so it normally
remains in place. After each reset, recreate the three Vault values below;
otherwise the scheduled worker cannot call the reconciliation function.

### After `supabase db reset`

1. Make sure the local Supabase stack is running. If you have not reset yet:

   ```sh
   supabase start
   supabase db reset
   ```

   A successful `db reset` already reapplies the migrations, including the
   scheduled reconciliation job. Do not run `migration up` again unless you
   only started the stack and did not reset it.

2. Check that `supabase/functions/.env.local` exists and has the Revenue
   Monster settings plus a long random `RM_AUTO_CANCEL_SECRET`. Keep this
   secret the same between the function environment and Vault. Do not commit or
   share this file.

3. In local Supabase Studio's SQL Editor (`http://127.0.0.1:54332`), recreate
   the Vault values. Get the current local publishable key from `supabase
   status` (or the `supabase start` output). Substitute it and the exact
   `RM_AUTO_CANCEL_SECRET` value from `.env.local`:

   ```sql
   select vault.create_secret('http://kong:8000', 'rm_auto_cancel_project_url');
   select vault.create_secret('<local-publishable-key>', 'rm_auto_cancel_apikey');
   select vault.create_secret('<same-RM_AUTO_CANCEL_SECRET>', 'rm_auto_cancel_secret');
   ```

   Run these only when the Vault entries are absent. If `create_secret` reports
   a duplicate name, that entry already exists; do not create another one.

4. Start or restart the local Edge Functions server from the project root and
   leave its terminal running:

   ```sh
   supabase functions serve --env-file supabase/functions/.env.local --debug
   ```

5. Confirm the scheduled job exists and is active in Studio's SQL Editor:

   ```sql
   select jobname, schedule, active
   from cron.job
   where jobname = 'reconcile-rm-payment-status';
   ```

   To confirm the Vault names are present without revealing their values:

   ```sql
   select name
   from vault.decrypted_secrets
   where name in (
     'rm_auto_cancel_project_url',
     'rm_auto_cancel_apikey',
     'rm_auto_cancel_secret'
   );
   ```

6. Keep the public HTTPS tunnel running for `RM_WEBHOOK_URL`, pointing to the
   local Supabase API gateway on port `54329`. The webhook endpoint is
   `/functions/v1/rm-payment-webhook`.

The worker checks Revenue Monster before changing an order. It confirms RM
`SUCCESS`, records terminal `FAILED`, `CANCELLED`, or `EXPIRED` statuses, and
leaves `PENDING`, `PROCESSING`, unknown, and unreachable transactions pending.
So an order still processing at RM will not be auto-cancelled just because five
minutes elapsed.

### First-time setup (without a reset)

1. Put a random value in `supabase/functions/.env.local`:

   ```env
   RM_AUTO_CANCEL_SECRET=replace-with-a-long-random-value
   ```

2. In local Supabase Studio's SQL Editor (`http://127.0.0.1:54332`), create the
   Vault values. Use the local publishable key printed by `supabase start` and
   the exact same random value as above:

   ```sql
   select vault.create_secret('http://kong:8000', 'rm_auto_cancel_project_url');
   select vault.create_secret('<local-publishable-key>', 'rm_auto_cancel_apikey');
   select vault.create_secret('<same-random-value>', 'rm_auto_cancel_secret');
   ```

3. Apply migrations if needed, then serve the functions:

   ```sh
   supabase migration up --local
   supabase functions serve --env-file supabase/functions/.env.local --debug
   ```

4. Keep the public HTTPS tunnel running for `RM_WEBHOOK_URL`, pointing to the
   local Supabase API gateway on port `54329`. The webhook endpoint is
   `/functions/v1/rm-payment-webhook`.

Without the Vault values, the scheduled worker has no URL or credentials to
call the function. The webhook can still reconcile payments while the tunnel
and local function stack are available.
