-- Tighten Storage (storage.objects) policies for the `images` bucket.
--
-- Found while exporting the live policies (2026-10-05): several permissive policies made the
-- intended "uploads only under meetImages/<your uid>/" rule meaningless, because permissive
-- policies are OR'd together:
--   * "allow anyone to upload"      INSERT with check (true)   -> anyone, even logged out, could
--                                    upload any file to any bucket and path.
--   * "allow anyone to read"        SELECT using (true)         -> lets anyone list every object.
--   * "Give anon users access to JPG images in folder 1ffg0oo_0..3"
--                                    leftover dashboard templates: anon select/insert/update/delete
--                                    of .jpg files under images/public/.
--   * "Users can upload any meet images" check (auth.uid() is not null) -> any signed-in user could
--                                    write to any bucket and any path, including other users' folders.
--
-- What the app actually does (src/models/meet.ts, src/app/meet/[id]/page.tsx):
--   upload  -> images/meetImages/<own uid>/<file>   (signed in)
--   display -> getPublicUrl() (the bucket is public, so object URLs work without any SELECT policy)
--   delete  -> remove() on the user's own meetImages/<uid>/ paths
-- Nothing lists objects, uses signed URLs, or uploads outside meetImages/<uid>/.
--
-- Kept as-is: "Users can view any meet images" (authenticated SELECT within meetImages/, needed for
-- remove()) and "Users can delete own meet images" (already scoped to the caller's folder).
--
-- Deploy order: independent of the app version; safe to apply at any time.
--
-- Rollback (restores the previous, permissive behavior):
--   create policy "allow anyone to upload" on storage.objects for insert to public with check (true);
--   create policy "allow anyone to read" on storage.objects for select to public using (true);
--   create policy "Users can upload any meet images" on storage.objects for insert to authenticated
--     with check ((select auth.uid()) is not null);
--   (the four "Give anon users access to JPG images in folder 1ffg0oo_*" policies were dashboard
--    templates; see supabase/snapshots/2026-10-05-live-schema-reference.sql for their definitions)

drop policy if exists "allow anyone to upload" on storage.objects;
drop policy if exists "allow anyone to read" on storage.objects;

drop policy if exists "Give anon users access to JPG images in folder 1ffg0oo_0" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1ffg0oo_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1ffg0oo_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1ffg0oo_3" on storage.objects;

drop policy if exists "Users can upload any meet images" on storage.objects;

create policy "Users can upload own meet images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'meetImages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
