-- The remote_schema.sql dump captured RLS policies (USING/WITH CHECK) for
-- courses, lessons, members, and member_orders, but only carried over
-- maintenance-level grants (MAINTAIN, REFERENCES, TRIGGER, TRUNCATE) to
-- "anon"/"authenticated" -- not the base SELECT/INSERT/UPDATE privileges
-- those roles actually need. In Postgres, RLS policies only filter rows
-- *after* the base table privilege check passes, so without these grants
-- every anon/authenticated query against these tables fails with
-- "permission denied for table ..." regardless of policy.
--
-- Grants below mirror the existing RLS policies:
--   courses_public_read / lessons_public_read      -> SELECT (public)
--   member_orders_own / member_orders_insert_own   -> SELECT, INSERT (own rows)
--   members read/insert/update policies             -> SELECT, INSERT, UPDATE

GRANT SELECT                 ON TABLE "public"."courses"                  TO "anon", "authenticated";
GRANT SELECT                 ON TABLE "public"."lessons"                  TO "anon", "authenticated";
GRANT SELECT                 ON TABLE "public"."products"                 TO "anon", "authenticated";
GRANT SELECT, INSERT         ON TABLE "public"."member_orders"            TO "anon", "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."members"                  TO "anon", "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."member_wallets"           TO "anon", "authenticated";
GRANT SELECT, INSERT         ON TABLE "public"."member_point_transactions" TO "anon", "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."courses"                  TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."lessons"                  TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."products"                 TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_orders"            TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."members"                  TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_wallets"           TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."member_point_transactions" TO "service_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "anon", "authenticated", "service_role";