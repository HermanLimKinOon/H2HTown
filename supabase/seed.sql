-- Local-only seed data (not applied to the remote).
-- Admin allowlist for the h2hadmin panel; is_admin() checks the JWT email
-- against these rows. Add the address you sign into the local admin app with.
insert into public.admin_emails (email) values
  ('kelvincheah54@gmail.com'),
  ('testmember@example.com')
on conflict (email) do nothing;
