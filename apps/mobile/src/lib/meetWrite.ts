import {
  MEET_IMAGE_MAX_BYTES,
  encodeToGoogleMaps,
  storagePathFromPublicUrl,
  type LocationData,
} from '@blip/shared';

import { supabase } from './supabase';

const BUCKET = 'images';

/** A photo picked on the device that hasn't been uploaded yet. */
export interface PendingImage {
  uri: string;
  name: string;
  mimeType: string;
}

export interface MeetDraft {
  title: string;
  body: string;
  links: string;
  location: LocationData;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM:SS" */
  startTime: string;
  endTime: string;
  /** Final ordered image URLs (first = thumbnail). */
  images: string[];
}

/**
 * Uploads one device photo to `meetImages/<uid>/…` (storage RLS scopes writes to the user's own folder)
 * and returns its public URL, or an error message (including when it is over the size limit).
 */
export async function uploadMeetImage(
  userId: string,
  image: PendingImage,
): Promise<{ url: string | null; error: string | null }> {
  let bytes: ArrayBuffer;
  try {
    bytes = await (await fetch(image.uri)).arrayBuffer();
  } catch {
    return { url: null, error: `Could not read ${image.name}.` };
  }
  if (bytes.byteLength > MEET_IMAGE_MAX_BYTES) {
    return { url: null, error: `${image.name} is over the 10 MB limit.` };
  }

  const ext = image.name.split('.').pop() || 'jpg';
  const path = `meetImages/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: image.mimeType });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl, error: null };
}

/** Column payload for `meets` (camelCase, same as the web app). */
function toRow(organizerId: string, draft: MeetDraft) {
  return {
    organizerId,
    title: draft.title.trim(),
    body: draft.body.trim(),
    location: draft.location,
    mapsLink: encodeToGoogleMaps(draft.location.name, draft.location.coordinates),
    links: draft.links.trim(),
    images: draft.images,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
  };
}

/** Inserts a meet owned by the signed-in user; returns its id. */
export async function createMeet(userId: string, draft: MeetDraft): Promise<{ id: number | string | null; error: string | null }> {
  const { data, error } = await supabase.from('meets').insert([toRow(userId, draft)]).select('id');
  if (error) return { id: null, error: error.message };
  const row = data?.[0];
  if (!row) return { id: null, error: 'No row returned from insert.' };
  return { id: row.id, error: null };
}

/** Updates a meet the user organizes. RLS rejects other users' rows, which shows up as zero rows updated. */
export async function updateMeet(userId: string, meetId: number | string, draft: MeetDraft): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('meets').update(toRow(userId, draft)).eq('id', meetId).select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Nothing was updated. You can only edit meets you organize.' };
  return { error: null };
}

/** Removes uploaded images by public URL (best effort) and then the meet row. */
export async function deleteMeet(meetId: number | string, imageUrls: string[]): Promise<{ error: string | null }> {
  const paths = imageUrls.map((u) => storagePathFromPublicUrl(u, BUCKET)).filter((p): p is string => p != null);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.warn('Error deleting meet images from storage:', error.message);
  }
  const { error } = await supabase.from('meets').delete().eq('id', meetId);
  return { error: error?.message ?? null };
}

/** Best-effort cleanup of images uploaded for a save that then failed. */
export async function removeUploadedImages(urls: string[]): Promise<void> {
  const paths = urls.map((u) => storagePathFromPublicUrl(u, BUCKET)).filter((p): p is string => p != null);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
}
