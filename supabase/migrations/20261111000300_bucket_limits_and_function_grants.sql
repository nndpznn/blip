-- Security bug bash items 2 and 6.
--
-- Item 2: the public `images` bucket had no server-side limits (file_size_limit and
-- allowed_mime_types were both null), so the clients' 10 MB / images-only rules could be bypassed
-- with a direct Storage API call by any signed-in user. Existing objects (checked 2026-11-11) are all
-- jpeg/png/webp/gif/avif and the largest is ~1.2 MB, so these limits do not affect current data.
update storage.buckets
set file_size_limit = 10485760,  -- 10 MiB, same as MEET_IMAGE_MAX_BYTES
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/avif', 'image/heic', 'image/heif'
    ]
where id = 'images';

-- Item 6: handle_new_user() is a SECURITY DEFINER auth trigger. The Supabase advisor flags it because
-- anon/authenticated hold EXECUTE (PostgREST does not actually expose it as an RPC today, because it
-- returns `trigger`, but the privilege should not exist). The auth trigger runs as the function owner,
-- so revoking EXECUTE from the API roles does not affect signups.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Verify:
--   select has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE');          -- false
--   select has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'); -- false
--   select file_size_limit, allowed_mime_types from storage.buckets where id = 'images';
-- Then sign in with a NEW Google account and confirm its profiles row is created.

-- Rollback:
--   grant execute on function public.handle_new_user() to anon, authenticated;
--   update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'images';