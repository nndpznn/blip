-- Make usernames unique regardless of case: "Nolan" and "nolan" are the same name.
--
-- profiles_username_key (UNIQUE (username)) is case-sensitive, so both could be claimed.
-- This adds a unique index on lower(username). The stored value keeps the user's casing;
-- only uniqueness ignores it. Violations raise 23505, which the profile page already
-- reports as "username taken".
--
-- Checked against the live data on 2026-10-12: no two profiles share a lower(username),
-- so this creates cleanly. If it ever fails with a duplicate-key error, find the collisions with:
--   select lower(username), count(*) from public.profiles
--   where username is not null group by 1 having count(*) > 1;
--
-- The old case-sensitive constraint is left in place; the new index is strictly stricter.
-- NULL usernames are allowed (unique indexes ignore NULLs).

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));
