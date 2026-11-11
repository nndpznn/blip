/**
 * True only for absolute http(s) URLs. Use at every place a user-supplied URL becomes an href or is
 * opened (meet `links`, profile `link`), so a stored `javascript:` or `data:` URL is never clickable.
 */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
	if (!value) return false;
	const trimmed = value.trim();
	// Reject control characters/whitespace inside the URL (e.g. "java\nscript:" tricks).
	if (/[\u0000-\u001f\u007f\s]/.test(trimmed)) return false;
	try {
		const url = new URL(trimmed);
		return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
	} catch {
		return false;
	}
}
