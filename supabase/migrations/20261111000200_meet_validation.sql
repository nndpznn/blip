-- Security bug bash item 5: enforce basic limits on `meets` in the database.
--
-- Until now the only checks (25-character title, at most 10 images, 10 MB per image) lived in the
-- client forms, so anyone calling the REST API directly with a valid session could store anything.
--
-- All constraints are added NOT VALID: they apply to every new insert and update, but are not checked
-- against existing rows (live data on 2026-11-11: 4 meets have titles over 25 characters - ids 44, 66,
-- 39, 41 - and would fail). Editing one of those meets will require shortening its title, which the
-- edit forms already demand. Once old rows are fixed you can run:
--   alter table public.meets validate constraint meets_title_length;
--
-- Not enforced on purpose:
--   * "California only" - that is a product rule in the form (isCaliforniaAddress), decide separately.
--   * endTime >= startTime - overnight meets may legitimately end after midnight.
--   * `links` is not forced to http(s): the field is free text and nothing renders it as a link yet.
--     If it ever becomes a link, validate with isSafeHttpUrl() from @blip/shared at the render site.

-- Image URLs must point into this project's public `images` bucket (not an arbitrary tracking URL).
-- NOTE: the project ref is hard-coded; update it if the project is ever recreated.
create or replace function public.meet_images_valid(imgs text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(i ~ '^https://fztfmbnszhjohpgofzma\.supabase\.co/storage/v1/object/public/images/'),
    true
  )
  from unnest(imgs) as i
$$;

alter table public.meets
  add constraint meets_title_length   check (char_length(title) between 1 and 25) not valid,
  add constraint meets_body_length    check (char_length(body) <= 5000) not valid,
  add constraint meets_links_length   check (links is null or char_length(links) <= 500) not valid,
  add constraint meets_maps_link_length check ("mapsLink" is null or char_length("mapsLink") <= 500) not valid,
  add constraint meets_location_size  check (location is null or octet_length(location::text) <= 2000) not valid,
  add constraint meets_images_count   check (images is null or cardinality(images) <= 10) not valid,
  add constraint meets_images_urls    check (images is null or public.meet_images_valid(images)) not valid;

-- Rollback:
--   alter table public.meets
--     drop constraint meets_title_length, drop constraint meets_body_length,
--     drop constraint meets_links_length, drop constraint meets_maps_link_length,
--     drop constraint meets_location_size, drop constraint meets_images_count,
--     drop constraint meets_images_urls;
--   drop function public.meet_images_valid(text[]);
