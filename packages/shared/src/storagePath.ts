/**
 * Storage object path for a Supabase public URL, e.g.
 * ".../object/public/images/meetImages/u/a.jpg" -> "meetImages/u/a.jpg". Null when the URL isn't in `bucket`.
 */
export function storagePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
	const prefix = `/object/public/${bucket}/`;
	const i = publicUrl.indexOf(prefix);
	if (i === -1) return null;
	const path = publicUrl.slice(i + prefix.length).split("?")[0];
	return path ? decodeURIComponent(path) : null;
}
