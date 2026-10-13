-- Remove table privileges nothing needs from the public API roles.
--
-- Supabase grants `anon` and `authenticated` every table privilege by default and relies on RLS
-- for row access. But RLS does not apply to TRUNCATE, and TRIGGER / REFERENCES are never needed
-- by the app. The REST API cannot issue TRUNCATE, so this is defense in depth, not a live hole.
-- SELECT / INSERT / UPDATE / DELETE are untouched (they stay governed by RLS), as are the
-- column-level grants on profiles from 20260930230000_hide_profile_email_from_anon.sql.
--
-- Deploy order: independent of the app version.
--
-- Rollback:
--   grant truncate, trigger, references on all tables in schema public to anon, authenticated;

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
