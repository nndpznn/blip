/** Max size per meet image (10 MiB). */
export const MEET_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Max images per meet (each slot counts, including duplicates). */
export const MEET_IMAGE_MAX_COUNT = 10;

export function isMeetImageOverLimit(file: File): boolean {
	return file.size > MEET_IMAGE_MAX_BYTES;
}

/** Splits `files` so only `MEET_IMAGE_MAX_COUNT - currentCount` are accepted. */
export function filesWithinMeetImageLimit(
	currentCount: number,
	files: File[],
): { accepted: File[]; skippedNames: string[] } {
	const remaining = MEET_IMAGE_MAX_COUNT - currentCount;
	if (remaining <= 0) {
		return { accepted: [], skippedNames: files.map((f) => f.name) };
	}
	const accepted = files.slice(0, remaining);
	const skippedNames = files.slice(remaining).map((f) => f.name);
	return { accepted, skippedNames };
}
