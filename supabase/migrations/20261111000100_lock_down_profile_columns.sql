-- Security bug bash items 1 and 4: restrict which `profiles` columns each role can read and write.
--
-- Found on 2026-11-11 (via has_column_privilege against the live database):
--   * `authenticated` could SELECT `email` -> any signed-in account could dump every user's email.
--   * `authenticated` could UPDATE every column (id, email, created_at, ...). Setting your own `email`
--     to someone else's address would make that person's later signup fail on the unique email
--     constraint in handle_new_user().
--   * `anon` held UPDATE on every column too. RLS already stops it from changing any row, but there is
--     no reason for the privilege to exist.
--
-- IMPORTANT: apply this only AFTER the web build that stops using select('*') on `profiles`
-- (src/hooks/fetchUserbyUID.ts, src/models/user.ts, src/app/profile/page.tsx) is deployed.
-- The mobile app already selects explicit columns. After this migration the signed-in user's own
-- email must come from the auth session (`user.email`), not from `profiles`.
--
-- Column privileges are the right tool: RLS filters rows, not columns.

-- Reads: public profile fields only, for signed-in users too (matches the existing anon grant).
revoke select on public.profiles from authenticated;
grant select (id, fullname, username, headline, bio, link, profile_color)
  on public.profiles to authenticated;

-- Writes: only the fields the profile editors actually save (web: fullname, username, headline, bio,
-- link, profile_color; mobile: username, fullname, headline, bio, profile_color).
revoke update on public.profiles from authenticated, anon;
grant update (fullname, username, headline, bio, link, profile_color)
  on public.profiles to authenticated;

-- Verify (expect no `email`, `id` or `created_at` for UPDATE, and no `email` for SELECT):
--   select r.rolname, a.attname, p.priv
--   from pg_roles r cross join pg_attribute a cross join (values ('SELECT'),('UPDATE')) p(priv)
--   where r.rolname in ('anon','authenticated') and a.attrelid = 'public.profiles'::regclass
--     and a.attnum > 0 and not a.attisdropped
--     and has_column_privilege(r.rolname, 'public.profiles', a.attname, p.priv);

-- Rollback:
--   grant select on public.profiles to authenticated;
--   grant update on public.profiles to authenticated;
