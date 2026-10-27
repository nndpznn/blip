import {
  MEET_PAGE_SIZE,
  localDateString,
  planMeetPage,
  type MeetCursor,
  type MeetRecord,
  type MeetSort,
} from '@blip/shared';

import { supabase } from './supabase';

/** Only what meet cards render. */
const LIST_COLUMNS = 'id, created_at, title, body, images, date, startTime, endTime, organizerId, location';
/** Only what map pins and callouts need. */
const MAP_COLUMNS = 'id, title, body, images, date, startTime, endTime, organizerId, location';

/** One page of meets for the list. `error` is set when the query fails. */
export async function fetchMeetPage(
  cursor: MeetCursor,
  sort: MeetSort,
  pageSize: number = MEET_PAGE_SIZE,
): Promise<{ meets: MeetRecord[]; error: string | null }> {
  const plan = planMeetPage(cursor, sort, localDateString(), pageSize);

  let query = supabase.from('meets').select(LIST_COLUMNS);
  if (plan.filter.kind === 'gte') {
    query = query.gte('date', plan.filter.today);
  } else if (plan.filter.kind === 'past') {
    query = query.or(`date.lt.${plan.filter.today},date.is.null`);
  }
  for (const order of plan.orders) {
    query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
  }

  const { data, error } = await query.range(plan.from, plan.to);
  if (error) return { meets: [], error: error.message };
  return { meets: (data ?? []) as unknown as MeetRecord[], error: null };
}

/** Upcoming meets (today or later) with only the columns the map needs. */
export async function fetchUpcomingMapMeets(): Promise<{ meets: MeetRecord[]; error: string | null }> {
  const { data, error } = await supabase.from('meets').select(MAP_COLUMNS).gte('date', localDateString());
  if (error) return { meets: [], error: error.message };
  return { meets: (data ?? []) as unknown as MeetRecord[], error: null };
}

/** One meet by id. Returns the raw Postgrest error so callers can tell "not found" from "failed". */
export async function fetchMeetById(id: string) {
  const { data, error } = await supabase.from('meets').select('*').eq('id', id).single();
  return { data: (data as MeetRecord | null) ?? null, error };
}

export type AttendeeSummary = Record<string, { count: number; attending: boolean }>;

const SUMMARY_CHUNK = 100;

/** Attendee count and "is the current user attending" per meet, via the `meet_attendee_summary` SQL function. */
export async function fetchAttendeeSummary(meetIds: Array<number | string>): Promise<AttendeeSummary> {
  const summary: AttendeeSummary = {};
  for (let i = 0; i < meetIds.length; i += SUMMARY_CHUNK) {
    const chunk = meetIds.slice(i, i + SUMMARY_CHUNK);
    const { data, error } = await supabase.rpc('meet_attendee_summary', { meet_ids: chunk });
    if (error) {
      console.warn('Error fetching attendee summary:', error.message);
      continue;
    }
    for (const row of (data ?? []) as Array<{ meet_id: number | string; attendee_count: number; is_attending: boolean }>) {
      summary[String(row.meet_id)] = { count: row.attendee_count, attending: row.is_attending };
    }
  }
  return summary;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  fullname: string | null;
  profile_color: string | null;
}

/** Public profile columns for the given user ids (email is never selected). */
export async function fetchProfiles(ids: string[]): Promise<Record<string, PublicProfile>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, fullname, profile_color')
    .in('id', ids);
  if (error) {
    console.warn('Error fetching profiles:', error.message);
    return {};
  }
  return Object.fromEntries(((data ?? []) as PublicProfile[]).map((p) => [p.id, p]));
}

export const displayName = (p: PublicProfile | undefined): string =>
  p?.username || p?.fullname || 'Unknown author';

/** All meets organized by `organizerId`, soonest first (undated last). */
export async function fetchMeetsByOrganizer(organizerId: string): Promise<{ meets: MeetRecord[]; error: string | null }> {
  const { data, error } = await supabase
    .from('meets')
    .select(LIST_COLUMNS)
    .eq('organizerId', organizerId)
    .order('date', { ascending: true, nullsFirst: false });
  if (error) return { meets: [], error: error.message };
  return { meets: (data ?? []) as unknown as MeetRecord[], error: null };
}
