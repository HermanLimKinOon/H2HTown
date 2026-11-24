-- Restore base table privileges that are missing on the live database.
--
-- 20260827062700_fix_rls_table_grants.sql was never recorded as applied
-- remotely, and the live DB ended up with only REFERENCES/TRIGGER/TRUNCATE on
-- most tables for anon/authenticated/service_role. Every PostgREST read then
-- fails with 42501 "permission denied for table ...", which caused:
--   * signed-out visitors: `courses`/`lessons` reads fail, so the course pages
--     fall back to mock data (real courses such as id 13 show "Not Found");
--   * signed-in members: `member_orders` reads fail, so My Courses and
--     My Orders are empty even though `record_order` (SECURITY DEFINER) wrote
--     the order rows;
--   * Edge Functions using the service-role key can't read these tables either.
--
-- RLS policies are unchanged and still decide which rows are visible.
-- INSERT on member_orders stays revoked from anon
-- (see 20260902200000_member_orders_admin_only_insert.sql).
--
-- Safe to run more than once.

GRANT SELECT                 ON TABLE "public"."courses"                   TO "anon", "authenticated";
GRANT SELECT                 ON TABLE "public"."lessons"                   TO "anon", "authenticated";
GRANT SELECT                 ON TABLE "public"."products"                  TO "anon", "authenticated";
GRANT SELECT                 ON TABLE "public"."member_orders"             TO "anon", "authenticated";
GRANT INSERT                 ON TABLE "public"."member_orders"             TO "authenticated";
-- `members` holds email/phone/birth date/address and its SELECT policy is
-- USING (true), so anon must not get SELECT (the anon key ships in the bundle).
-- Anon can't insert either: the INSERT policy requires auth.uid().
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."members"                   TO "authenticated";
REVOKE SELECT, INSERT, UPDATE ON TABLE "public"."members"                  FROM "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."member_wallets"            TO "anon", "authenticated";
GRANT SELECT, INSERT         ON TABLE "public"."member_point_transactions" TO "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."courses"                   TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."lessons"                   TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."products"                  TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_orders"             TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."members"                   TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_wallets"            TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_point_transactions" TO "service_role";

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "anon", "authenticated", "service_role";
