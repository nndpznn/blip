-- REFERENCE ONLY — DO NOT APPLY, and not part of the migration history.
--
-- A readable record of the live database as of 2026-10-05, reconstructed from catalog queries
-- (pg_policies, pg_constraint, pg_indexes, information_schema) run in the Supabase SQL editor.
-- It is the state BEFORE the 2026-10-05 hardening migrations (both since applied)
-- (20261005001000_scope_storage_policies.sql, 20261005001100_revoke_unneeded_table_privileges.sql).
--
-- Not captured (re-export with `supabase db pull` on a machine with Docker, or query directly):
--   * column defaults / identity settings, sequences
--   * the private trigger on auth.users that creates profile rows (the app never inserts them,
--     and profiles has no INSERT policy)
--   * functions other than public.meet_attendee_summary
--   * storage.buckets settings beyond `public`
--
-- Verified at export time: no duplicate usernames (case-insensitive) and no duplicate attendee rows.

-- ───────── Tables ─────────
-- meet_attendees(profile_id uuid not null, meet_id bigint not null, rsvp_date timestamptz)
-- meets(id bigint not null, created_at timestamptz not null, title text, body text, links text,
--       images text[], "startTime" text, "endTime" text, date text, "organizerId" uuid,
--       location jsonb, "mapsLink" text)
-- profiles(id uuid not null, username text, fullname text, email text not null, headline text,
--          bio text, link text, created_at timestamptz not null, profile_color text not null)

-- ───────── Constraints and indexes ─────────
-- meet_attendees_pkey          PRIMARY KEY (profile_id, meet_id)      -- one RSVP per person per meet
-- meet_attendees_meet_id_fkey  FOREIGN KEY (meet_id)    REFERENCES meets(id)    ON DELETE CASCADE
-- meet_attendees_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
-- meets_pkey                   PRIMARY KEY (id)
-- meets_organizerId_fkey       FOREIGN KEY ("organizerId") REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE
-- profiles_pkey                PRIMARY KEY (id)
-- profiles_id_fkey             FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE
-- profiles_email_key           UNIQUE (email)
-- profiles_username_key        UNIQUE (username)                       -- case-sensitive

-- ───────── Row level security (enabled on meets, profiles, meet_attendees) ─────────
alter table public.meets enable row level security;
alter table public.profiles enable row level security;
alter table public.meet_attendees enable row level security;

create policy "Enable read access for all users" on public.meets
  for select to public using (true);
create policy "Enable insert for authenticated users only" on public.meets
  for insert to authenticated with check ("organizerId" = auth.uid());
create policy "allow update for matching users" on public.meets
  for update to public using ("organizerId" = auth.uid()) with check ("organizerId" = auth.uid());
create policy "Enable delete for users based on user_id" on public.meets
  for delete to public using ("organizerId" = auth.uid());

create policy "Allow all read access to profiles" on public.profiles
  for select to public using (true);
create policy "Enable users to edit their OWN profiles" on public.profiles
  for update to public
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- (no INSERT or DELETE policy on profiles)

create policy "Enable read access for all users" on public.meet_attendees
  for select to public using (true);
create policy "create_own_rsvp" on public.meet_attendees
  for insert to public with check (auth.uid() = profile_id);
create policy "delete_own_rsvp" on public.meet_attendees
  for delete to public using (auth.uid() = profile_id);

-- ───────── Storage (bucket `images`, public = true) ─────────
create policy "allow anyone to read" on storage.objects
  for select to public using (true);
create policy "allow anyone to upload" on storage.objects
  for insert to public with check (true);
create policy "Users can upload any meet images" on storage.objects
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "Users can view any meet images" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = 'meetImages');
create policy "Users can delete own meet images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images'
         and (storage.foldername(name))[1] = 'meetImages'
         and (storage.foldername(name))[2] = (auth.uid())::text);

-- Dashboard "anon access to JPG images in folder" templates (select / insert / update / delete),
-- each with the same condition:
--   bucket_id = 'images' and storage.extension(name) = 'jpg'
--   and lower((storage.foldername(name))[1]) = 'public' and auth.role() = 'anon'
--   policy names: "Give anon users access to JPG images in folder 1ffg0oo_0" (select),
--                 _1 (insert, with check), _2 (update), _3 (delete)

-- ───────── Table privileges ─────────
-- anon and authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on
-- meets and meet_attendees; on profiles, anon has no table-level SELECT (column grants only,
-- see 20260930230000_hide_profile_email_from_anon.sql).
