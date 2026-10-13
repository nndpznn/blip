-- Per-meet attendee counts (and whether the caller is attending) in one small query.
--
-- Before this, the meet list and user pages downloaded every meet_attendees row for every
-- meet and counted them in the browser. This returns one row per meet that has attendees.
-- Meets with no attendees get no row (the client treats that as 0 / not attending).
--
-- Runs as the caller (security invoker), so existing RLS on meet_attendees still applies,
-- and `is_attending` uses auth.uid() (always false for logged-out visitors).
--
-- Deploy order: this migration only ADDS a function, so apply it BEFORE deploying the app
-- version that calls it.

create or replace function public.meet_attendee_summary(meet_ids bigint[])
returns table (meet_id bigint, attendee_count integer, is_attending boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.meet_id::bigint,
    count(*)::integer,
    coalesce(bool_or(a.profile_id = auth.uid()), false)
  from public.meet_attendees a
  where a.meet_id = any (meet_ids)
  group by a.meet_id;
$$;

revoke execute on function public.meet_attendee_summary(bigint[]) from public;
grant execute on function public.meet_attendee_summary(bigint[]) to anon, authenticated;

-- Rollback:
--   drop function public.meet_attendee_summary(bigint[]);
