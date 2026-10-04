-- Hide profiles.email from logged-out visitors.
--
-- Before this, the public anon key could read every profile row including `email`
-- (GET /rest/v1/profiles?select=email). Column privileges are the tool for this:
-- RLS filters rows, not columns.
--
-- IMPORTANT: apply this only AFTER the app version that stops using select('*') on
-- `profiles` is deployed. Once applied, `select('*')` on profiles returns a
-- "permission denied" error for anonymous requests.
--
-- Signed-in users (role `authenticated`) are unchanged, so the profile page can still
-- read the user's own email.

revoke select on public.profiles from anon;

grant select (id, fullname, username, headline, bio, link, profile_color)
  on public.profiles to anon;

-- Rollback:
--   grant select on public.profiles to anon;
